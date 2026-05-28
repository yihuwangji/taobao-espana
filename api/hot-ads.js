const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
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

function normalize(value = {}) {
  const ids = Array.isArray(value.listingIds)
    ? value.listingIds.map(Number).filter(Number.isInteger).filter(id => id > 0).slice(0, 20)
    : [];
  return {
    enabled: value.enabled !== false,
    rotateSeconds: Math.max(30, Math.min(1800, Number(value.rotateSeconds || 180))),
    listingIds: [...new Set(ids)]
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'method_not_allowed' });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 200, { ok: true, value: normalize(), listings: [] });
  }

  const settingsResponse = await serviceFetch('/rest/v1/site_settings?key=eq.hot_ads&select=value&limit=1');
  const settingsRows = settingsResponse.ok ? await settingsResponse.json() : [];
  const value = normalize(settingsRows[0]?.value || {});
  let listings = [];

  if (value.enabled && value.listingIds.length) {
    const response = await serviceFetch(`/rest/v1/listings?id=in.(${value.listingIds.join(',')})&status=eq.approved&select=id,title,description,category,city,price,address,images,created_at,is_pinned,user_id`);
    if (response.ok) {
      const rows = await response.json();
      const order = new Map(value.listingIds.map((id, index) => [String(id), index]));
      listings = rows.sort((a, b) => (order.get(String(a.id)) ?? 999) - (order.get(String(b.id)) ?? 999));
    }
  }

  return json(res, 200, { ok: true, value, listings });
};