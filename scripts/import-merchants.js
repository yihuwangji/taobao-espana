const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2] || 'merchant-import-template.csv';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted && ch === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (!quoted && ch === ',') {
      row.push(value);
      value = '';
    } else if (!quoted && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(value);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      value = '';
    } else {
      value += ch;
    }
  }
  row.push(value);
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

function normalizeCategory(value) {
  const raw = String(value || '').trim();
  const allowed = new Set(['生意', '服务', '教育', '租房', '二手物品', '二手车']);
  return allowed.has(raw) ? raw : '服务';
}

async function main() {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const [header, ...rows] = parseCsv(text);
  const keys = header.map(key => key.trim());
  const records = rows.map(row => Object.fromEntries(keys.map((key, index) => [key, row[index] || ''])))
    .filter(item => item.title && item.contact)
    .map(item => ({
      title: item.title.trim(),
      category: normalizeCategory(item.category),
      city: item.city.trim() || 'Madrid',
      address: item.address.trim() || null,
      contact: item.contact.trim(),
      description: item.description.trim() || item.title.trim(),
      price: item.price.trim() || '面议',
      status: 'approved',
      user_id: null,
      images: []
    }));

  if (!records.length) {
    console.log('No valid merchant rows found.');
    return;
  }

  const existingResponse = await fetch(`${SUPABASE_URL}/rest/v1/listings?select=title&category=in.(%E7%94%9F%E6%84%8F,%E6%9C%8D%E5%8A%A1,%E6%95%99%E8%82%B2)&limit=1000`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`
    }
  });
  const existingRows = existingResponse.ok ? await existingResponse.json() : [];
  const existingTitles = new Set(existingRows.map(row => String(row.title || '').trim().toLowerCase()));
  const newRecords = records.filter(record => !existingTitles.has(record.title.trim().toLowerCase()));

  if (!newRecords.length) {
    console.log('No new merchant listings to import.');
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/listings`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(newRecords)
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(body);
    process.exit(1);
  }
  console.log(`Imported ${newRecords.length} merchant listings. Skipped ${records.length - newRecords.length} duplicates.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
