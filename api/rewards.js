const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SHARE_REWARD_COINS = 2;
const DAILY_SHARE_LIMIT = 10;

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

function cleanText(value, max = 240) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function cleanKey(value, max = 80) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, max);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function startOfTodayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
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

async function loadRewards() {
  const response = await serviceFetch('/rest/v1/platform_rewards?select=id,title,description,coin_cost,stock,image_url,is_active,sort_order&is_active=eq.true&order=sort_order.asc');
  if (!response.ok) return [];
  return response.json();
}

async function loadTransactions(userId, limit = 50) {
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

function sumAmounts(rows) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

async function loadBalance(userId) {
  const rows = await loadTransactions(userId, 10000);
  const balance = sumAmounts(rows);
  const earned = sumAmounts(rows.filter(row => Number(row.amount || 0) > 0));
  const spent = Math.abs(sumAmounts(rows.filter(row => Number(row.amount || 0) < 0)));
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

async function loadRedemptions(userId) {
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

async function statusPayload(userId) {
  const [wallet, rewards, todayShares, redemptions] = await Promise.all([
    loadBalance(userId),
    loadRewards(),
    loadTodayShareCount(userId),
    loadRedemptions(userId)
  ]);
  return {
    ok: true,
    balance: wallet.balance,
    earned: wallet.earned,
    spent: wallet.spent,
    shareRewardCoins: SHARE_REWARD_COINS,
    dailyShareLimit: DAILY_SHARE_LIMIT,
    todayShareCount: todayShares,
    todayRemaining: Math.max(0, DAILY_SHARE_LIMIT - todayShares),
    rewards,
    transactions: wallet.transactions,
    redemptions
  };
}

async function handleShareReward(req, res, user, body) {
  const sourceType = cleanKey(body.sourceType || body.source_type || 'share', 30) || 'share';
  const sourceId = cleanKey(body.sourceId || body.source_id || 'general', 80) || 'general';
  const title = cleanText(body.title || '', 120);
  const uniqueKey = `share:${user.id}:${todayKey()}:${sourceType}:${sourceId}`;
  const todayShares = await loadTodayShareCount(user.id);

  if (todayShares >= DAILY_SHARE_LIMIT) {
    return json(res, 200, {
      ...(await statusPayload(user.id)),
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
    ...(await statusPayload(user.id)),
    awarded,
    coinsAwarded: awarded ? SHARE_REWARD_COINS : 0,
    reason: awarded ? 'awarded' : 'duplicate',
    message: awarded
      ? `转发成功，获得 ${SHARE_REWARD_COINS} 平台币。`
      : '这条内容今天已经奖励过平台币。'
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

async function handleRedeem(req, res, user, body) {
  const rewardId = cleanKey(body.rewardId || body.reward_id, 80);
  if (!rewardId) return json(res, 400, { ok: false, error: 'missing_reward', message: '请选择兑换礼物' });

  const reward = await getReward(rewardId);
  if (!reward) return json(res, 404, { ok: false, error: 'reward_not_found', message: '礼物不存在或已下架' });

  const wallet = await loadBalance(user.id);
  if (wallet.balance < Number(reward.coin_cost)) {
    return json(res, 400, {
      ...(await statusPayload(user.id)),
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
    ...(await statusPayload(user.id)),
    redeemed: true,
    redemptionId,
    message: `已提交兑换申请：${reward.title}。客服会联系你确认领取方式。`
  });
}

module.exports = async function handler(req, res) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { ok: false, error: 'missing_service_role', message: '平台币服务未配置' });
  }

  const user = await getUserFromBearer(req);
  if (!user?.id) return json(res, 401, { ok: false, error: 'not_logged_in', message: '请先登录' });

  if (req.method === 'GET') {
    return json(res, 200, await statusPayload(user.id));
  }

  if (req.method === 'POST') {
    const body = parseBody(req);
    const action = cleanKey(body.action, 40);
    if (action === 'share_reward') return handleShareReward(req, res, user, body);
    if (action === 'redeem') return handleRedeem(req, res, user, body);
    return json(res, 400, { ok: false, error: 'invalid_action', message: '不支持的操作' });
  }

  res.setHeader('Allow', 'GET, POST');
  return json(res, 405, { ok: false, error: 'method_not_allowed', message: '只支持 GET/POST 请求' });
};
