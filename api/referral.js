const crypto = require('crypto');

const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const DEFAULT_SITE_URL = 'https://espanalife.app';
const TARGET_COUNT = 10;
const VIP_DAYS = 365;
const SHARE_REWARD_COINS = 2;
const REFERRAL_VISIT_REWARD_COINS = 5;
const DAILY_SHARE_LIMIT = 10;

function getRequestSiteUrl(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) return DEFAULT_SITE_URL;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function json(res, status, body, extraHeaders = {}) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  Object.entries(extraHeaders).forEach(([key, value]) => res.setHeader(key, value));
  res.status(status).send(JSON.stringify(body));
}

function cleanCode(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function cleanKey(value, max = 80) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, max);
}

function cleanText(value, max = 240) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function startOfTodayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
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

async function loadRewards() {
  const response = await serviceFetch('/rest/v1/platform_rewards?select=id,title,description,coin_cost,stock,image_url,is_active,sort_order&is_active=eq.true&order=sort_order.asc');
  if (!response.ok) return [];
  return response.json();
}

async function loadCoinTransactions(userId, limit = 50) {
  const params = new URLSearchParams({
    select: 'id,amount,type,source_type,source_id,note,created_at',
    user_id: `eq.${userId}`,
    order: 'created_at.desc',
    limit: String(limit)
  });
  const response = await serviceFetch(`/rest/v1/platform_coin_transactions?${params.toString()}`);
  if (!response.ok) return [];
  return response.json();
}

function sumCoinAmounts(rows) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

async function loadCoinBalance(userId) {
  const rows = await loadCoinTransactions(userId, 10000);
  const balance = sumCoinAmounts(rows);
  const earned = sumCoinAmounts(rows.filter(row => Number(row.amount || 0) > 0));
  const spent = Math.abs(sumCoinAmounts(rows.filter(row => Number(row.amount || 0) < 0)));
  return { balance, earned, spent, transactions: rows.slice(0, 12) };
}

async function loadTodayShareCount(userId) {
  const params = new URLSearchParams({
    select: 'id',
    user_id: `eq.${userId}`,
    type: 'eq.share_reward',
    created_at: `gte.${startOfTodayIso()}`
  });
  const response = await serviceFetch(`/rest/v1/platform_coin_transactions?${params.toString()}`);
  if (!response.ok) return 0;
  const rows = await response.json();
  return rows.length;
}

async function loadRewardRedemptions(userId) {
  const params = new URLSearchParams({
    select: 'id,reward_id,coin_cost,status,created_at,note',
    user_id: `eq.${userId}`,
    order: 'created_at.desc',
    limit: '10'
  });
  const response = await serviceFetch(`/rest/v1/platform_reward_redemptions?${params.toString()}`);
  if (!response.ok) return [];
  return response.json();
}

async function rewardsStatusPayload(userId) {
  const [wallet, rewards, todayShares, redemptions] = await Promise.all([
    loadCoinBalance(userId),
    loadRewards(),
    loadTodayShareCount(userId),
    loadRewardRedemptions(userId)
  ]);
  return {
    ok: true,
    balance: wallet.balance,
    earned: wallet.earned,
    spent: wallet.spent,
    shareRewardCoins: SHARE_REWARD_COINS,
    referralRewardCoins: REFERRAL_VISIT_REWARD_COINS,
    dailyShareLimit: DAILY_SHARE_LIMIT,
    todayShareCount: todayShares,
    todayRemaining: Math.max(0, DAILY_SHARE_LIMIT - todayShares),
    rewards,
    transactions: wallet.transactions,
    redemptions
  };
}

async function handleRewardsStatus(req, res) {
  const user = await getUserFromBearer(req);
  if (!user?.id) return json(res, 401, { ok: false, error: 'not_logged_in', message: '请先登录' });
  return json(res, 200, await rewardsStatusPayload(user.id));
}

async function handleShareReward(req, res, user, body) {
  const sourceType = cleanKey(body.sourceType || body.source_type || 'share', 30) || 'share';
  const sourceId = cleanKey(body.sourceId || body.source_id || 'general', 80) || 'general';
  const title = cleanText(body.title || '', 120);
  const uniqueKey = `share:${user.id}:${todayKey()}:${sourceType}:${sourceId}`;
  const todayShares = await loadTodayShareCount(user.id);

  if (todayShares >= DAILY_SHARE_LIMIT) {
    return json(res, 200, {
      ...(await rewardsStatusPayload(user.id)),
      awarded: false,
      reason: 'daily_limit',
      message: `今天转发奖励已达上限 ${DAILY_SHARE_LIMIT} 次，明天继续赚平台币。`
    });
  }

  const response = await serviceFetch('/rest/v1/platform_coin_transactions?on_conflict=unique_key&select=id,amount', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: user.id,
      amount: SHARE_REWARD_COINS,
      type: 'share_reward',
      source_type: sourceType,
      source_id: sourceId,
      unique_key: uniqueKey,
      note: title ? `转发：${title}` : '转发获得平台币',
      metadata: { sourceType, sourceId, title }
    })
  });

  if (!response.ok && response.status !== 409) {
    return json(res, 500, { ok: false, error: 'reward_failed', message: await response.text() });
  }

  const inserted = response.ok ? await response.json().catch(() => []) : [];
  const awarded = Array.isArray(inserted) && inserted.length > 0;
  return json(res, 200, {
    ...(await rewardsStatusPayload(user.id)),
    awarded,
    coinsAwarded: awarded ? SHARE_REWARD_COINS : 0,
    reason: awarded ? 'awarded' : 'duplicate',
    message: awarded ? `转发成功，获得 ${SHARE_REWARD_COINS} 平台币。` : '这条内容今天已经奖励过平台币。'
  });
}

async function getReward(rewardId) {
  const params = new URLSearchParams({
    select: 'id,title,description,coin_cost,stock,is_active',
    id: `eq.${rewardId}`,
    is_active: 'eq.true',
    limit: '1'
  });
  const response = await serviceFetch(`/rest/v1/platform_rewards?${params.toString()}`);
  if (!response.ok) return null;
  const rows = await response.json();
  return rows[0] || null;
}

async function handleRedeemReward(req, res, user, body) {
  const rewardId = cleanKey(body.rewardId || body.reward_id, 80);
  if (!rewardId) return json(res, 400, { ok: false, error: 'missing_reward', message: '请选择兑换礼物' });

  const reward = await getReward(rewardId);
  if (!reward) return json(res, 404, { ok: false, error: 'reward_not_found', message: '礼物不存在或已下架' });

  const wallet = await loadCoinBalance(user.id);
  if (wallet.balance < Number(reward.coin_cost)) {
    return json(res, 400, {
      ...(await rewardsStatusPayload(user.id)),
      ok: false,
      error: 'not_enough_coins',
      message: `平台币不足，还差 ${Number(reward.coin_cost) - wallet.balance} 个。`
    });
  }

  const redemptionResponse = await serviceFetch('/rest/v1/platform_reward_redemptions?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: user.id,
      reward_id: reward.id,
      coin_cost: reward.coin_cost,
      contact_name: cleanText(body.contactName || body.contact_name, 60),
      contact_phone: cleanText(body.contactPhone || body.contact_phone, 80),
      note: cleanText(body.note, 300)
    })
  });

  if (!redemptionResponse.ok) {
    return json(res, 500, { ok: false, error: 'redeem_failed', message: await redemptionResponse.text() });
  }
  const redemptions = await redemptionResponse.json();
  const redemptionId = redemptions?.[0]?.id;

  const transactionResponse = await serviceFetch('/rest/v1/platform_coin_transactions', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: user.id,
      amount: -Number(reward.coin_cost),
      type: 'gift_redeem',
      source_type: 'reward',
      source_id: reward.id,
      unique_key: redemptionId ? `redeem:${redemptionId}` : null,
      note: `兑换：${reward.title}`,
      metadata: { rewardId: reward.id, redemptionId }
    })
  });

  if (!transactionResponse.ok) {
    return json(res, 500, { ok: false, error: 'coin_deduct_failed', message: await transactionResponse.text() });
  }

  return json(res, 200, {
    ...(await rewardsStatusPayload(user.id)),
    redeemed: true,
    redemptionId,
    message: `已提交兑换申请：${reward.title}。客服会联系你确认领取方式。`
  });
}

async function handleRewardsAction(req, res, body) {
  const user = await getUserFromBearer(req);
  if (!user?.id) return json(res, 401, { ok: false, error: 'not_logged_in', message: '请先登录' });
  const action = cleanKey(body.action, 40);
  if (action === 'share_reward') return handleShareReward(req, res, user, body);
  if (action === 'redeem') return handleRedeemReward(req, res, user, body);
  return json(res, 400, { ok: false, error: 'invalid_action', message: '不支持的操作' });
}

async function awardReferralVisitCoins(referrerId, visitorHash, visitorIdHint) {
  const uniqueKey = `referral:${referrerId}:${visitorHash}`;
  const response = await serviceFetch('/rest/v1/platform_coin_transactions?on_conflict=unique_key&select=id,amount', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: referrerId,
      amount: REFERRAL_VISIT_REWARD_COINS,
      type: 'referral_reward',
      source_type: 'referral_visit',
      source_id: String(visitorIdHint || '').slice(0, 40),
      unique_key: uniqueKey,
      note: '推荐好友访问获得平台币',
      metadata: { visitorIdHint }
    })
  });
  if (!response.ok && response.status !== 409) {
    return { awarded: false, coinsAwarded: 0 };
  }
  const rows = response.ok ? await response.json().catch(() => []) : [];
  const awarded = Array.isArray(rows) && rows.length > 0;
  return { awarded, coinsAwarded: awarded ? REFERRAL_VISIT_REWARD_COINS : 0 };
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
    inviteUrl: `${getRequestSiteUrl(req)}/?ref=${encodeURIComponent(referralCode)}`,
    count,
    target: TARGET_COUNT,
    remaining: Math.max(0, TARGET_COUNT - count),
    vipUntil: reward.vipUntil || profile.vip_until || null,
    vipGranted: reward.granted,
    qualified: count >= TARGET_COUNT,
    referralRewardCoins: REFERRAL_VISIT_REWARD_COINS
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

  const insertResponse = await serviceFetch('/rest/v1/referral_visits?on_conflict=referrer_id,visitor_hash&select=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
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

  const insertedRows = insertResponse.ok ? await insertResponse.json().catch(() => []) : [];
  const counted = Array.isArray(insertedRows) && insertedRows.length > 0;
  const coinReward = counted
    ? await awardReferralVisitCoins(profile.id, visitorHash, visitorId.slice(0, 12))
    : { awarded: false, coinsAwarded: 0 };
  const count = await countVisits(profile.id);
  const freshProfile = await getProfileByUserId(profile.id);
  const reward = await grantVipIfQualified(freshProfile || profile, count);

  return json(res, 200, {
    counted,
    count,
    target: TARGET_COUNT,
    remaining: Math.max(0, TARGET_COUNT - count),
    vipGranted: reward.granted,
    vipUntil: reward.vipUntil || freshProfile?.vip_until || profile.vip_until || null,
    referralRewardCoins: REFERRAL_VISIT_REWARD_COINS,
    coinAwarded: coinReward.awarded,
    coinsAwarded: coinReward.coinsAwarded
  }, {
    'Set-Cookie': `xby_ref_visitor=${encodeURIComponent(visitorId)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
  });
}

module.exports = async function handler(req, res) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role', message: '邀请活动服务未配置' });
  }

  if (req.method === 'GET') {
    if (cleanKey(req.query.feature, 40) === 'rewards') return handleRewardsStatus(req, res);
    return handleStatus(req, res);
  }
  if (req.method === 'POST') {
    const body = parseBody(req);
    if (['share_reward', 'redeem'].includes(cleanKey(body.action, 40))) {
      return handleRewardsAction(req, res, body);
    }
    return handleVisit(req, res);
  }

  res.setHeader('Allow', 'GET, POST');
  return json(res, 405, { error: 'method_not_allowed', message: '只支持 GET/POST 请求' });
};
