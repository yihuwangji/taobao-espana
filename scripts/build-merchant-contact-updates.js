const fs = require('fs');

const PLACEHOLDER = '请商家认领后补充联系方式';
const OUTPUT = 'merchant-contact-updates-2026-05-21.json';
const INPUTS = [
  'merchant-import-public-2026-05-21.csv',
  'merchant-import-soufun-valencia-default-2026-05-21.csv',
  'merchant-import-oulang-2026-05-21.csv'
];

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

function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const [header, ...rows] = parseCsv(text);
  const keys = header.map(key => key.trim());
  return rows.map(row => Object.fromEntries(keys.map((key, index) => [key, row[index] || ''])));
}

function clean(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeCfEmail(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 4) return '';
  const key = parseInt(hex.slice(0, 2), 16);
  let email = '';
  for (let i = 2; i < hex.length; i += 2) {
    email += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return email;
}

function unique(values) {
  return [...new Set(values.map(value => clean(value)).filter(Boolean))];
}

function phoneLike(value) {
  const text = clean(value);
  if (!text || text === '-') return '';
  const normalized = text.replace(/[^\d+]/g, '');
  return normalized.length >= 6 ? normalized : '';
}

function extractContact(html, source) {
  const telContacts = unique([...html.matchAll(/href=["']tel:([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => phoneLike(match[2]) || phoneLike(match[1])));
  const labeledPhones = unique([...html.matchAll(/(?:电话|联系电话|手机|Tel[eé]fono|Phone)\s*[：:]\s*([+()\d\s.-]{6,})/gi)]
    .map(match => phoneLike(match[1])));
  const wechat = unique([...html.matchAll(/(?:微信|Wechat|WeChat)\s*[：:]\s*([A-Za-z0-9_.-]{4,})/gi)]
    .map(match => `微信:${match[1]}`));
  const cfEmails = unique([...html.matchAll(/data-cfemail=["']([0-9a-f]+)["']/gi)]
    .map(match => decodeCfEmail(match[1]))
    .filter(email => !email.includes('xinhua.es')));
  const mailtoEmails = unique([...html.matchAll(/mailto:([^"'>\s]+)/gi)]
    .map(match => decodeURIComponent(match[1]))
    .filter(email => !email.includes('xinhua.es')));
  const websiteLinks = unique([
    ...[...html.matchAll(/网址：\s*<a\s+href=["']([^"']+)["']/gi)].map(match => match[1]),
    ...[...html.matchAll(/Website:\s*<a\s+href=["']([^"']+)["']/gi)].map(match => match[1]),
    ...[...html.matchAll(/<div class="address-row row-web">[\s\S]*?<a\s+href=["']([^"']+)["']/gi)].map(match => match[1])
  ].filter(link => /^https?:\/\//i.test(link) && !/soufun\.es|xinhua\.es/i.test(link)));

  const parts = unique([...telContacts, ...labeledPhones, ...wechat, ...mailtoEmails, ...cfEmails, ...websiteLinks]);
  if (!parts.length) return '';
  return parts.slice(0, source === 'xinhua.es' ? 2 : 4).join(' / ');
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { Accept: 'text/html,application/xhtml+xml' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function main() {
  const rows = [];
  for (const file of INPUTS) {
    if (!fs.existsSync(file)) continue;
    rows.push(...readCsv(file).map(row => ({ ...row, file })));
  }

  const updates = [];
  const seen = new Set();
  for (const row of rows) {
    if (!row.title || !row.source_url || seen.has(row.title)) continue;
    seen.add(row.title);
    let contact = clean(row.contact);
    if (!contact || contact === PLACEHOLDER) {
      try {
        contact = extractContact(await fetchText(row.source_url), row.source);
      } catch {
        contact = '';
      }
    }
    if (contact && contact !== PLACEHOLDER) {
      updates.push({ title: row.title, contact, source: row.source || '', source_url: row.source_url || '' });
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify({ updates }, null, 2), 'utf8');
  const soufunCount = updates.filter(row => row.source === 'soufun.es').length;
  const xinhuaCount = updates.filter(row => row.source === 'xinhua.es').length;
  console.log(`wrote ${updates.length} updates to ${OUTPUT}`);
  console.log(`soufun ${soufunCount}, xinhua ${xinhuaCount}`);
  console.log(updates.slice(0, 30).map(row => `${row.title} | ${row.contact}`).join('\n'));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
