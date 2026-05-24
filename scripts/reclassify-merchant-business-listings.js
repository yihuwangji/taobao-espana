const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function serviceFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

function isTransferListing(row) {
  const text = `${row?.title || ''} ${row?.description || ''}`.toLowerCase();
  return /转让|出兑|顶手|盘让|让店|店铺出售|店面出售|生意出售|traspaso|se traspasa/.test(text);
}

async function main() {
  const response = await serviceFetch('/rest/v1/listings?select=id,title,description,category,user_id&category=eq.%E7%94%9F%E6%84%8F&user_id=is.null&limit=10000');
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  const ids = rows.filter(row => !isTransferListing(row)).map(row => row.id);
  if (!ids.length) {
    console.log(JSON.stringify({ updated: 0, checked: rows.length }, null, 2));
    return;
  }
  const updateResponse = await serviceFetch(`/rest/v1/listings?id=in.(${ids.join(',')})`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ category: '\u670d\u52a1', updated_at: new Date().toISOString() })
  });
  const text = await updateResponse.text();
  if (!updateResponse.ok) throw new Error(text || String(updateResponse.status));
  const updated = text ? JSON.parse(text) : [];
  console.log(JSON.stringify({
    updated: updated.length,
    checked: rows.length,
    keptAsBusiness: rows.length - ids.length,
    sample: updated.slice(0, 5).map(row => ({ id: row.id, title: row.title, category: row.category }))
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
