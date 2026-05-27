const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const { requireAdminByMetadata } = require('./_admin-auth');

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

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/[^\d+]/g, '');
}

function phoneDigits(value) {
  return normalizePhone(value).replace(/\D/g, '');
}

function authEmailFromPhone(phone) {
  return `taobaoespana.${phoneDigits(phone)}@gmail.com`;
}

function authPasswordFromPin(pin) {
  return String(pin || '') + '#EspanaLife2026';
}

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function publicUser(authUser, profile) {
  const vipUntil = profile?.vip_until || null;
  const vipDate = vipUntil ? new Date(vipUntil) : null;
  const isVip = vipDate && !Number.isNaN(vipDate.getTime()) && vipDate > new Date();
  return {
    id: profile?.id || authUser?.id,
    email: authUser?.email || '',
    nickname: profile?.nickname || authUser?.user_metadata?.nickname || '未知用户',
    phone: profile?.phone || authUser?.user_metadata?.phone || '',
    city: profile?.city || authUser?.user_metadata?.city || '',
    created_at: profile?.created_at || authUser?.created_at || null,
    post_count: profile?.post_count || 0,
    vip_until: vipUntil,
    vip_source: profile?.vip_source || '',
    vip_granted_at: profile?.vip_granted_at || null,
    is_vip: Boolean(isVip)
  };
}

async function listUsers() {
  const [profileResponse, authResponse] = await Promise.all([
    serviceFetch('/rest/v1/profiles?select=id,nickname,phone,city,post_count,vip_until,vip_source,vip_granted_at,created_at&order=created_at.desc&limit=1000'),
    serviceFetch('/auth/v1/admin/users?page=1&per_page=1000')
  ]);
  if (!profileResponse.ok) throw new Error(await profileResponse.text());
  if (!authResponse.ok) throw new Error(await authResponse.text());

  const profiles = await profileResponse.json();
  const authPayload = await authResponse.json();
  const authUsers = Array.isArray(authPayload?.users) ? authPayload.users : [];
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
  const authById = new Map(authUsers.map(user => [user.id, user]));
  const ids = new Set([...profilesById.keys(), ...authById.keys()]);
  return [...ids]
    .map(id => publicUser(authById.get(id), profilesById.get(id)))
    .sort((a, b) => Number(b.is_vip) - Number(a.is_vip) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

async function updateVip(body) {
  const userId = String(body.userId || '').trim();
  const mode = String(body.mode || 'grant').trim();
  const days = Math.max(1, Math.min(3650, Number(body.days || 365)));
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('用户ID无效');

  if (mode === 'cancel') {
    const response = await serviceFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        vip_until: null,
        vip_source: null,
        vip_granted_at: null,
        updated_at: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error(await response.text());
    return { userId, vipUntil: null };
  }

  const currentResponse = await serviceFetch(`/rest/v1/profiles?select=id,vip_until&id=eq.${encodeURIComponent(userId)}&limit=1`);
  if (!currentResponse.ok) throw new Error(await currentResponse.text());
  const rows = await currentResponse.json();
  const profile = rows[0];
  if (!profile) throw new Error('未找到用户资料');

  const now = new Date();
  const currentUntil = profile.vip_until ? new Date(profile.vip_until) : null;
  const base = currentUntil && currentUntil > now ? currentUntil : now;
  const vipUntil = addDays(base, days);
  const response = await serviceFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      vip_until: vipUntil.toISOString(),
      vip_source: 'admin_manual',
      vip_granted_at: now.toISOString(),
      updated_at: now.toISOString()
    })
  });
  if (!response.ok) throw new Error(await response.text());
  return { userId, vipUntil: vipUntil.toISOString(), days };
}

async function createVipAccount(body) {
  const nickname = String(body.nickname || '').trim();
  const city = String(body.city || 'Barcelona').trim() || 'Barcelona';
  const phone = normalizePhone(body.phone);
  const digits = phoneDigits(phone);
  const days = Math.max(1, Math.min(3650, Number(body.days || 365)));
  const pin = /^\d{4}$/.test(String(body.pin || '').trim()) ? String(body.pin).trim() : randomPin();

  if (!nickname) throw new Error('请填写游客名称');
  if (digits.length < 6) throw new Error('请填写正确的手机号');

  const email = authEmailFromPhone(phone);
  const password = authPasswordFromPin(pin);
  const now = new Date();
  const vipUntil = addDays(now, days);
  const metadata = {
    nickname,
    city,
    phone,
    account_type: 'phone',
    created_by_admin: true
  };

  const createResponse = await serviceFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    })
  });

  const createText = await createResponse.text();
  let created;
  try {
    created = createText ? JSON.parse(createText) : null;
  } catch {
    created = { message: createText };
  }

  if (!createResponse.ok) {
    const message = created?.msg || created?.message || '创建账号失败';
    if (/already|registered|exists/i.test(message)) {
      throw new Error('这个手机号已经有账号，请在列表里搜索后直接开通或重置密码。');
    }
    throw new Error(message);
  }

  const userId = created?.id;
  if (!userId) throw new Error('账号已创建，但没有返回用户ID');

  const profileResponse = await serviceFetch('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: userId,
      nickname,
      city,
      phone,
      vip_until: vipUntil.toISOString(),
      vip_source: 'admin_created',
      vip_granted_at: now.toISOString(),
      updated_at: now.toISOString()
    })
  });
  if (!profileResponse.ok) throw new Error(await profileResponse.text());

  return {
    userId,
    phone,
    pin,
    email,
    nickname,
    city,
    vipUntil: vipUntil.toISOString(),
    days
  };
}

async function writeLog(adminId, action, targetId, note = '') {
  await serviceFetch('/rest/v1/admin_logs', {
    method: 'POST',
    body: JSON.stringify([{
      admin_id: adminId,
      action,
      target_type: 'user',
      target_id: String(targetId),
      note
    }])
  }).catch(() => null);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed', message: '只支持 POST 请求' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role', message: '后台服务未配置安全密钥' });
  }

  const admin = await requireAdminByMetadata(req, { section: 'users' });
  if (admin.error) return json(res, admin.status, { error: admin.error, message: '没有用户管理权限' });

  const body = parseBody(req);
  try {
    if (body.action === 'list') {
      return json(res, 200, { ok: true, users: await listUsers() });
    }
    if (body.action === 'set_vip') {
      const result = await updateVip(body);
      await writeLog(admin.user.id, 'user_set_vip', result.userId, JSON.stringify({
        mode: body.mode || 'grant',
        days: result.days || null,
        vipUntil: result.vipUntil
      }));
      return json(res, 200, { ok: true, ...result });
    }
    if (body.action === 'create_vip_account') {
      const result = await createVipAccount(body);
      await writeLog(admin.user.id, 'user_create_vip_account', result.userId, JSON.stringify({
        phone: result.phone,
        nickname: result.nickname,
        days: result.days,
        vipUntil: result.vipUntil
      }));
      return json(res, 200, { ok: true, ...result });
    }
    return json(res, 400, { error: 'invalid_action', message: '操作类型无效' });
  } catch (error) {
    return json(res, 400, { error: 'vip_action_failed', message: error.message || '操作失败' });
  }
};
