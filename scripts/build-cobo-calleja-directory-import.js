const fs = require('fs');

const BASE = 'https://poligonocobocalleja.es';
const OUTPUT_JSON = 'merchant-import-cobo-calleja-directory-2026-05-24.json';
const OUTPUT_CSV = 'merchant-import-cobo-calleja-directory-2026-05-24.csv';

const seedCategories = [
  '/cat/almacen-mayoristas-multiprecio/',
  '/cat/articulos-de-regalo-al-por-mayor/',
  '/cat/juguetes-al-por-mayor/',
  '/cat/mayorista-accesorios-iphone-moviles/',
  '/cat/mayoristas-informatica/',
  '/cat/bolsos-al-por-mayor/',
  '/cat/bisuteria-al-por-mayor/',
  '/cat/complementos-al-por-mayor/',
  '/cat/ropa-al-por-mayor/',
  '/cat/zapatos-y-calzados-al-por-mayor/',
  '/cat/ropa-deportiva-al-por-mayor/',
  '/cat/ropa-bebe-infantil-al-por-mayor/',
  '/cat/tienda-online-al-por-mayor/',
  '/cat/tiendas-minoristas/'
];

function decodeEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function textFromHtml(html) {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|tr|td)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href) {
  if (!href) return '';
  if (href.startsWith('http')) return href.split('#')[0];
  return `${BASE}${href.startsWith('/') ? '' : '/'}${href}`.split('#')[0];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EspanaLife merchant directory import)'
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function itemLinksFromHtml(html) {
  const links = new Set();
  for (const match of html.matchAll(/href=["']([^"']*\/item\/[^"']+)["']/gi)) {
    links.add(absoluteUrl(match[1]));
  }
  return [...links];
}

function matchAfter(text, label) {
  const lines = text.split('\n');
  const index = lines.findIndex(line => line.toLowerCase() === label.toLowerCase());
  if (index < 0) return '';
  for (const line of lines.slice(index + 1, index + 5)) {
    const value = clean(line);
    if (value && !/^(nuestra dirección:|teléfono:|e-mail:|web:)$/i.test(value)) return value;
  }
  return '';
}

function extractTitle(html, text, url) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleFromH1 = h1 ? clean(textFromHtml(h1[1])) : '';
  if (titleFromH1 && !/toggle search|menú/i.test(titleFromH1)) return titleFromH1;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = title ? clean(textFromHtml(title[1]).replace(/\s*-\s*Polígono Cobo Calleja.*$/i, '')) : '';
  if (pageTitle) return pageTitle;
  return decodeURIComponent(url.split('/').filter(Boolean).pop() || '').replace(/-/g, ' ');
}

function extractSummary(text, title) {
  const lines = text.split('\n').map(clean).filter(Boolean);
  const start = lines.findIndex(line => line.includes(title));
  const candidates = lines
    .slice(start >= 0 ? start + 1 : 0, start >= 0 ? start + 10 : 10)
    .filter(line => !/^(share this page|inicio|cargando|registrar nueva|ver \+|modificar|horas de apertura|lunes|martes|miércoles|jueves|viernes|sábado|domingo|dirección)$/i.test(line));
  return candidates.slice(0, 4).join(' · ').slice(0, 180);
}

function extractRecord(url, html) {
  const text = textFromHtml(html);
  const title = extractTitle(html, text, url);
  if (!title || /polígono cobo calleja/i.test(title)) return null;

  const address = matchAfter(text, 'Nuestra dirección:') || matchAfter(text, 'Dirección');
  const phone = matchAfter(text, 'Teléfono:');
  const email = matchAfter(text, 'E-mail:');
  const web = matchAfter(text, 'Web:');
  const contactParts = [];
  if (phone && phone !== '-') contactParts.push(`电话: ${phone}`);
  if (email && email !== '-') contactParts.push(`邮箱: ${email}`);
  if (web && web !== '-') contactParts.push(`网站: ${web}`);
  const summary = extractSummary(text, title);
  const descriptionParts = [
    '平台代登记商家信息，商家待认领。',
    '公开目录显示为 Madrid Fuenlabrada Cobo Calleja 批发市场/商家服务相关商户。',
    summary ? `主营线索：${summary}` : '',
    `资料来源：poligonocobocalleja.es 公开商家目录（${url}）。`
  ].filter(Boolean);

  return {
    title,
    category: '服务',
    city: 'Fuenlabrada',
    address: address && address !== '-' ? address : 'Polígono Cobo Calleja, Fuenlabrada, Madrid',
    contact: contactParts.join('；') || '请商家认领后补充联系方式',
    description: descriptionParts.join(' '),
    price: '面议',
    source: 'poligonocobocalleja.es public directory',
    source_url: url
  };
}

function csvCell(value) {
  const text = String(value || '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const itemUrls = new Set();
  for (const path of seedCategories) {
    const url = absoluteUrl(path);
    const html = await fetchText(url);
    itemLinksFromHtml(html).forEach(link => itemUrls.add(link));
  }

  const rows = [];
  for (const url of [...itemUrls].slice(0, 140)) {
    try {
      const html = await fetchText(url);
      const row = extractRecord(url, html);
      if (row && row.title) rows.push(row);
    } catch (error) {
      console.warn(`skip ${url}: ${error.message}`);
    }
  }

  const seen = new Set();
  const unique = rows.filter(row => {
    const key = row.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(unique, null, 2), 'utf8');
  const header = ['title', 'category', 'city', 'address', 'contact', 'description', 'price', 'source', 'source_url'];
  fs.writeFileSync(
    OUTPUT_CSV,
    [header.join(','), ...unique.map(row => header.map(key => csvCell(row[key])).join(','))].join('\n') + '\n',
    'utf8'
  );
  console.log(`Wrote ${unique.length} rows to ${OUTPUT_JSON} and ${OUTPUT_CSV}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
