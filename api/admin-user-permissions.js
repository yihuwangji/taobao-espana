const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';

const ALL_SECTIONS = ['dashboard', 'listings', 'review', 'reports', 'pinned', 'users', 'payment'];
const MANAGEABLE_SECTIONS = ['listings', 'review', 'reports', 'pinned', 'users'];

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

async function requireAdmin(req, options = {}) {
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
  if (options.super && !isSuper) return { error: 'not_super_admin', status: 403 };
  if (!isSuper && options.section && !sections.includes(options.section)) {
    return { error: 'not_admin', status: 403 };
  }
  return { user, isSuper, sections };
}

function normalizeSections(value) {
  const input = Array.isArray(value) ? value : [];
  return [...new Set(input.filter(section => MANAGEABLE_SECTIONS.includes(section)))];
}

function publicUser(authUser, profile) {
  const app = authUser?.app_metadata || {};
  const role = profile?.is_admin ? 'super_admin' : (app.admin_role || 'none');
  const sections = role === 'super_admin'
    ? ALL_SECTIONS
    : normalizeSections(app.admin_sections);
  return {
    id: profile?.id || authUser?.id,
    email: authUser?.email || '',
    nickname: profile?.nickname || authUser?.user_metadata?.nickname || '未知',
    city: profile?.city || authUser?.user_metadata?.city || '—',
    phone: profile?.phone || authUser?.user_metadata?.phone || '—',
    is_banned: Boolean(profile?.is_banned),
    post_count: profile?.post_count || 0,
    created_at: profile?.created_at || authUser?.created_at || null,
    role,
    sections,
    is_super_admin: role === 'super_admin'
  };
}

async function listUsers() {
  const [profileResponse, authResponse] = await Promise.all([
    serviceFetch('/rest/v1/profiles?select=id,nickname,city,phone,is_banned,post_count,created_at,is_admin&order=created_at.desc&limit=1000'),
    serviceFetch('/auth/v1/admin/users?page=1&per_page=1000')
  ]);
  if (!profileResponse.ok) throw new Error(await profileResponse.text());
  if (!authResponse.ok) throw new Error(await authResponse.text());
  const profiles = await profileResponse.json();
  const authPayload = await authResponse.json();
  const authUsers = Array.isArray(authPayload?.users) ? authPayload.users : [];
  const authById = new Map(authUsers.map(user => [user.id, user]));
  return profiles.map(profile => publicUser(authById.get(profile.id), profile));
}

function passwordFromInput(value) {
  const password = String(value || '').trim();
  if (/^\d{4}$/.test(password)) return `${password}#EspanaLife2026`;
  return password;
}

async function setPermissions(body, adminId) {
  const userId = String(body.userId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('用户ID无效');
  const role = ['none', 'section_admin', 'super_admin'].includes(body.role) ? body.role : 'none';
  const sections = role === 'super_admin' ? ALL_SECTIONS : normalizeSections(body.sections);

  if (userId === adminId && role !== 'super_admin') {
    throw new Error('不能取消当前登录超级管理员自己的权限');
  }

  const currentResponse = await serviceFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`);
  if (!currentResponse.ok) throw new Error(await currentResponse.text());
  const currentUser = await currentResponse.json();
  const currentMetadata = currentUser?.app_metadata || {};

  const metaResponse = await serviceFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      app_metadata: {
        ...currentMetadata,
        admin_role: role === 'none' ? null : role,
        admin_sections: role === 'none' ? [] : sections
      }
    })
  });
  if (!metaResponse.ok) throw new Error(await metaResponse.text());

  const profileResponse = await serviceFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      is_admin: role === 'super_admin',
      updated_at: new Date().toISOString()
    })
  });
  if (!profileResponse.ok) throw new Error(await profileResponse.text());

  return { userId, role, sections };
}

async function resetPassword(body, adminId) {
  const userId = String(body.userId || '').trim();
  const password = String(body.password || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('用户ID无效');
  if (userId === adminId) throw new Error('不能在这里重置当前登录管理员自己的密码');
  if (password.length < 4) throw new Error('新密码至少4位');
  if (!/^\d{4}$/.test(password) && password.length < 8) {
    throw new Error('管理员邮箱密码至少8位；手机号账号可填4位数字');
  }
  const response = await serviceFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({ password: passwordFromInput(password) })
  });
  if (!response.ok) throw new Error(await response.text());
  return { userId };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed', message: '只支持 POST 请求' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role', message: '后台服务未配置安全密钥' });
  }

  const body = parseBody(req);
  const needsSuper = body.action === 'set_permissions' || body.action === 'reset_password';
  const admin = await requireAdmin(req, { super: needsSuper, section: body.action === 'list' ? 'users' : '' });
  if (admin.error) return json(res, admin.status, { error: admin.error, message: needsSuper ? '需要超级管理员权限' : '没有用户管理权限' });

  try {
    let result;
    if (body.action === 'list') result = { users: await listUsers() };
    else if (body.action === 'set_permissions') result = await setPermissions(body, admin.user.id);
    else if (body.action === 'reset_password') result = await resetPassword(body, admin.user.id);
    else return json(res, 400, { error: 'invalid_action', message: '操作类型无效' });

    await serviceFetch('/rest/v1/admin_logs', {
      method: 'POST',
      body: JSON.stringify([{
        admin_id: admin.user.id,
        action: `user_${body.action}`,
        target_type: 'user',
        target_id: String(body.userId || admin.user.id),
        note: body.action === 'set_permissions' ? JSON.stringify({ role: result.role, sections: result.sections }) : ''
      }])
    }).catch(() => null);

    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    return json(res, 400, { error: 'admin_user_action_failed', message: error.message || '操作失败' });
  }
};
