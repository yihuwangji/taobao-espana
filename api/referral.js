const crypto = require('crypto');

const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SITE_URL = 'https://taobao-espana.vercel.app';
const TARGET_COUNT = 10;
const VIP_DAYS = 365;

function json(res, status, body, extraHeaders = {}) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  Object.entries(extraHeaders).forEach(([key, value]) => res.setHeader(key, value));
  res.status(status).send(JSON.stringify(body));
}

function cleanCode(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function parseCookie(header, name) {
  const cookies = String(header || '').split(';').map(part => part.trim());
  const item = cookies.find(part => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getIp(req) {
  return String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();
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

async function getUserFromBearer(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: serviceKey,
      Authorization: authorization
    }
  });
  if (!response.ok) return null;
  return response.json();
}

async function getProfileByUserId(userId) {
  const params = new URLSearchParams({
    select: 'id,nickname,referral_code,vip_until,referral_vip_granted_at',
    id: `eq.${userId}`,
    limit: '1'
  });
  const response = await serviceFetch(`/rest/v1/profiles?${params.toString()}`);
  if (!response.ok) return null;
  const rows = await response.json();
  return rows[0] || null;
}

async function getProfileByReferralCode(code) {
  const params = new URLSearchParams({
    select: 'id,nickname,referral_code,vip_until,referral_vip_granted_at',
    referral_code: `eq.${code}`,
    limit: '1'
  });
  const response = await serviceFetch(`/rest/v1/profiles?${params.toString()}`);
  if (!response.ok) return null;
  const rows = await response.json();
  return rows[0] || null;
}

async function ensureReferralCode(profile) {
  if (profile?.referral_code) return profile.referral_code;
  const code = `u${String(profile.id).replace(/-/g, '').slice(0, 10)}`;
  await serviceFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ referral_code: code, updated_at: new Date().toISOString() })
  });
  return code;
}

async function countVisits(referrerId) {
  const params = new URLSearchParams({
    select: 'id',
    referrer_id: `eq.${referrerId}`,
    credited: 'eq.true'
  });
  const response = await serviceFetch(`/rest/v1/referral_visits?${params.toString()}`);
  if (!response.ok) return 0;
  const rows = await response.json();
  return rows.length;
}

async function grantVipIfQualified(profile, count) {
  if (count < TARGET_COUNT || profile.referral_vip_granted_at) {
    return { granted: false, vipUntil: profile.vip_until || null };
  }

  const now = new Date();
  const currentUntil = profile.vip_until ? new Date(profile.vip_until) : null;
  const base = currentUntil && currentUntil > now ? currentUntil : now;
  const vipUntil = addDays(base, VIP_DAYS);

  const response = await serviceFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      vip_until: vipUntil.toISOString(),
      vip_source: 'referral_10_visits',
      vip_granted_at: now.toISOString(),
      referral_vip_granted_at: now.toISOString(),
      updated_at: now.toISOString()
    })
  });

  if (!response.ok) {
    return { granted: false, vipUntil: profile.vip_until || null };
  }

  return { granted: true, vipUntil: vipUntil.toISOString() };
}

async function handleStatus(req, res) {
  const user = await getUserFromBearer(req);
  if (!user?.id) {
    return json(res, 401, { error: 'not_logged_in', message: '请先登录' });
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return json(res, 404, { error: 'profile_not_found', message: '未找到用户资料' });
  }

  const referralCode = await ensureReferralCode(profile);
  const count = await countVisits(profile.id);
  const reward = await grantVipIfQualified(profile, count);

  return json(res, 200, {
    referralCode,
    inviteUrl: `${SITE_URL}/?ref=${encodeURIComponent(referralCode)}`,
    count,
    target: TARGET_COUNT,
    remaining: Math.max(0, TARGET_COUNT - count),
    vipUntil: reward.vipUntil || profile.vip_until || null,
    vipGranted: reward.granted,
    qualified: count >= TARGET_COUNT
  });
}

async function handleVisit(req, res) {
  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const ref = cleanCode(body.ref || req.query.ref);
  if (!ref) return json(res, 400, { error: 'missing_ref', message: '缺少邀请码' });

  const profile = await getProfileByReferralCode(ref);
  if (!profile) return json(res, 404, { error: 'ref_not_found', message: '邀请链接无效' });

  const user = await getUserFromBearer(req);
  if (user?.id && user.id === profile.id) {
    const count = await countVisits(profile.id);
    return json(res, 200, { counted: false, reason: 'self_visit', count, target: TARGET_COUNT });
  }

  let visitorId = cleanCode(body.visitorId) || cleanCode(parseCookie(req.headers.cookie, 'xby_ref_visitor'));
  if (!visitorId) visitorId = crypto.randomUUID().replace(/-/g, '');

  const salt = process.env.REFERRAL_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'referral';
  const ip = getIp(req);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 240);
  const language = String(req.headers['accept-language'] || '').slice(0, 80);
  const visitorHash = sha256(`${salt}|visitor|${visitorId}|${ip}|${userAgent}|${language}`);
  const ipHash = ip ? sha256(`${salt}|ip|${ip}`) : null;
  const userAgentHash = userAgent ? sha256(`${salt}|ua|${userAgent}`) : null;

  const insertResponse = await serviceFetch('/rest/v1/referral_visits?on_conflict=referrer_id,visitor_hash', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({
      referrer_id: profile.id,
      visitor_hash: visitorHash,
      visitor_id_hint: visitorId.slice(0, 12),
      user_agent_hash: userAgentHash,
      ip_hash: ipHash,
      credited: true
    })
  });

  if (!insertResponse.ok && insertResponse.status !== 409) {
    const message = await insertResponse.text().catch(() => '');
    return json(res, 500, { error: 'record_failed', message: message || '邀请访问记录失败' });
  }

  const count = await countVisits(profile.id);
  const freshProfile = await getProfileByUserId(profile.id);
  const reward = await grantVipIfQualified(freshProfile || profile, count);

  return json(res, 200, {
    counted: insertResponse.status !== 409,
    count,
    target: TARGET_COUNT,
    remaining: Math.max(0, TARGET_COUNT - count),
    vipGranted: reward.granted,
    vipUntil: reward.vipUntil || freshProfile?.vip_until || profile.vip_until || null
  }, {
    'Set-Cookie': `xby_ref_visitor=${encodeURIComponent(visitorId)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
  });
}

module.exports = async function handler(req, res) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role', message: '邀请活动服务未配置' });
  }

  if (req.method === 'GET') return handleStatus(req, res);
  if (req.method === 'POST') return handleVisit(req, res);

  res.setHeader('Allow', 'GET, POST');
  return json(res, 405, { error: 'method_not_allowed', message: '只支持 GET/POST 请求' });
};
