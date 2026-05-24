const fs = require('fs');

const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2] || 'merchant-import-cobo-calleja-directory-2026-05-24.json';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function clean(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
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

async function main() {
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const existingResponse = await serviceFetch('/rest/v1/listings?select=title&limit=10000');
  if (!existingResponse.ok) throw new Error(await existingResponse.text());
  const existing = new Set((await existingResponse.json()).map(row => clean(row.title).toLowerCase()).filter(Boolean));
  const seen = new Set();
  const records = rows.map(row => ({
    title: clean(row.title),
    category: clean(row.category, '\u670d\u52a1'),
    city: clean(row.city, 'Fuenlabrada'),
    address: clean(row.address) || null,
    contact: clean(row.contact, '\u8bf7\u5546\u5bb6\u8ba4\u9886\u540e\u8865\u5145\u8054\u7cfb\u65b9\u5f0f'),
    description: clean(row.description, `\u5e73\u53f0\u4ee3\u767b\u8bb0\u5546\u5bb6\u4fe1\u606f\uff0c\u5546\u5bb6\u5f85\u8ba4\u9886\u3002${row.title}`),
    price: clean(row.price, '\u9762\u8bae'),
    status: 'approved',
    user_id: null,
    images: []
  })).filter(record => {
    const key = record.title.toLowerCase();
    if (!record.title || existing.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!records.length) {
    console.log(JSON.stringify({ imported: 0, skipped: rows.length }, null, 2));
    return;
  }

  const insertResponse = await serviceFetch('/rest/v1/listings', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(records)
  });
  const insertText = await insertResponse.text();
  if (!insertResponse.ok) throw new Error(insertText || String(insertResponse.status));
  const inserted = insertText ? JSON.parse(insertText) : [];
  console.log(JSON.stringify({
    imported: inserted.length,
    skipped: rows.length - inserted.length,
    sample: inserted.slice(0, 5).map(item => ({ id: item.id, title: item.title, category: item.category, city: item.city }))
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
