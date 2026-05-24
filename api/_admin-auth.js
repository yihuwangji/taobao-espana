const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';

const ALL_ADMIN_SECTIONS = ['dashboard', 'listings', 'review', 'reports', 'pinned', 'users', 'payment'];

function normalizeAdminSections(value) {
  const input = Array.isArray(value) ? value : [];
  return [...new Set(input.filter(section => ALL_ADMIN_SECTIONS.includes(section)))];
}

function getAdminPermissions(user) {
  const app = user?.app_metadata || {};
  const role = app.admin_role === 'super_admin'
    ? 'super_admin'
    : app.admin_role === 'section_admin'
      ? 'section_admin'
      : 'none';
  const sections = role === 'super_admin'
    ? ALL_ADMIN_SECTIONS
    : normalizeAdminSections(app.admin_sections);
  return {
    role,
    sections,
    isSuper: role === 'super_admin'
  };
}

async function getAuthUser(token) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) return null;
  return response.json();
}

async function requireAdminByMetadata(req, options = {}) {
  const opts = typeof options === 'string' ? { section: options } : options;
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 'missing_token', status: 401 };

  const user = await getAuthUser(token);
  if (!user) return { error: 'invalid_token', status: 401 };

  const permissions = getAdminPermissions(user);
  if (opts.super && !permissions.isSuper) {
    return { error: 'not_super_admin', status: 403 };
  }
  if (!permissions.isSuper && opts.section && !permissions.sections.includes(opts.section)) {
    return { error: 'not_admin', status: 403 };
  }
  if (!permissions.isSuper && !opts.section && !permissions.sections.length) {
    return { error: 'not_admin', status: 403 };
  }

  return { user, ...permissions };
}

module.exports = {
  ALL_ADMIN_SECTIONS,
  getAdminPermissions,
  normalizeAdminSections,
  requireAdminByMetadata
};
