const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';

const DEFAULT_CONTACT_INFO = {
  officialAccount: '西班牙生活通',
  wechatId: 'espana_life',
  email: 'aladaya@gmail.com',
  supportHours: '9:00-22:00',
  groupZh: '加入西班牙华人生活交流群，与更多华人朋友互动',
  groupEs: 'Únete a la comunidad china en España para compartir información útil',
  introZh: '感谢您使用西班牙生活通！如有任何问题或建议，请通过以下方式联系我们：',
  introEs: 'Gracias por usar España Life. Si tienes alguna pregunta o sugerencia, puedes contactar con nosotros por estos medios:',
  responseZh: '我们通常在24小时内回复您的咨询',
  responseEs: 'Normalmente respondemos en un plazo de 24 horas'
};

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function cleanText(value, max = 300) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanEmail(value) {
  const email = cleanText(value, 180);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : DEFAULT_CONTACT_INFO.email;
}

function normalizeContactInfo(value = {}) {
  return {
    officialAccount: cleanText(value.officialAccount, 80) || DEFAULT_CONTACT_INFO.officialAccount,
    wechatId: cleanText(value.wechatId, 80) || DEFAULT_CONTACT_INFO.wechatId,
    email: cleanEmail(value.email),
    supportHours: cleanText(value.supportHours, 80) || DEFAULT_CONTACT_INFO.supportHours,
    groupZh: cleanText(value.groupZh, 220) || DEFAULT_CONTACT_INFO.groupZh,
    groupEs: cleanText(value.groupEs, 260) || DEFAULT_CONTACT_INFO.groupEs,
    introZh: cleanText(value.introZh, 260) || DEFAULT_CONTACT_INFO.introZh,
    introEs: cleanText(value.introEs, 300) || DEFAULT_CONTACT_INFO.introEs,
    responseZh: cleanText(value.responseZh, 160) || DEFAULT_CONTACT_INFO.responseZh,
    responseEs: cleanText(value.responseEs, 180) || DEFAULT_CONTACT_INFO.responseEs
  };
}

async function serviceFetch(path, options = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function requireAdmin(req, requiredSection = 'payment') {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 'missing_token', status: 401 };

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });
  if (!userResponse.ok) return { error: 'invalid_token', status: 401 };
  const user = await userResponse.json();

  const profileResponse = await serviceFetch(`/rest/v1/profiles?select=is_admin&id=eq.${encodeURIComponent(user.id)}&limit=1`);
  if (!profileResponse.ok) return { error: 'admin_check_failed', status: 403 };
  const profiles = await profileResponse.json();
  const isSuper = Boolean(profiles[0]?.is_admin || user.app_metadata?.admin_role === 'super_admin');
  const sections = Array.isArray(user.app_metadata?.admin_sections) ? user.app_metadata.admin_sections : [];
  if (!isSuper && (!requiredSection || !sections.includes(requiredSection))) return { error: 'not_admin', status: 403 };
  return { user };
}

async function getContactInfo() {
  const response = await serviceFetch('/rest/v1/site_settings?key=eq.contact_info&select=value&limit=1');
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return normalizeContactInfo(rows[0]?.value || DEFAULT_CONTACT_INFO);
}

async function updateContactInfo(value, adminId) {
  const normalized = normalizeContactInfo(value);
  const response = await serviceFetch('/rest/v1/site_settings?on_conflict=key&select=key,value,updated_at', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{
      key: 'contact_info',
      value: normalized,
      updated_by: adminId,
      updated_at: new Date().toISOString()
    }])
  });
  if (!response.ok) throw new Error(await response.text());
  return normalized;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed', message: '只支持 POST 请求' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role', message: '后台服务缺少 SUPABASE_SERVICE_ROLE_KEY' });
  }

  const body = parseBody(req);
  const action = body.action || 'get';
  const admin = await requireAdmin(req, 'payment');
  if (admin.error) return json(res, admin.status, { error: admin.error, message: '没有系统设置管理权限' });

  try {
    if (action === 'get') {
      return json(res, 200, { ok: true, value: await getContactInfo() });
    }
    if (action === 'update') {
      const value = await updateContactInfo(body.value || {}, admin.user.id);
      await serviceFetch('/rest/v1/admin_logs', {
        method: 'POST',
        body: JSON.stringify([{
          admin_id: admin.user.id,
          action: 'update_site_contact',
          target_type: 'site_settings',
          target_id: 'contact_info'
        }])
      }).catch(() => null);
      return json(res, 200, { ok: true, value });
    }
    return json(res, 400, { error: 'unknown_action', message: '未知操作' });
  } catch (error) {
    return json(res, 400, { error: 'site_settings_failed', message: error.message || '保存失败' });
  }
};
