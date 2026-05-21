const fs = require('fs');

const cityId = Number(process.argv[2] || 3);
const pages = Number(process.argv[3] || 5);
const sort = String(process.argv[4] || 'default');
const output = process.argv[5] || `merchant-import-soufun-city-${cityId}-${sort}-2026-05-21.csv`;

const CONTACT_PLACEHOLDER = '请商家认领后补充联系方式';
const cityNames = {
  1: 'Madrid',
  2: 'Barcelona',
  3: 'Valencia',
  4: 'Alicante',
  5: 'Málaga',
  6: 'Sevilla',
  7: 'Islas Baleares',
  8: 'Zaragoza'
};

const badKeywords = [
  '招聘', '招工', '求职', '找工作', '求租', '出租房', '房间出租', '合租',
  '大使馆', '领事馆', '警察局', '政府机构', '市政府', '移民局',
  '黄页发布', '测试', '广告位'
];

function csvCell(value) {
  return `"${String(value || '').replace(/"/g, '""').replace(/\r?\n/g, ' ').trim()}"`;
}

function htmlDecode(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function clean(value) {
  return htmlDecode(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text, keywords) {
  return keywords.some(keyword => text.includes(keyword));
}

function normalizeTitle(title) {
  return String(title || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

function pickCategory(text) {
  if (includesAny(text, ['学校', '中文学校', '驾校', '课程', '培训', '补习', '教育', '学院', '留学'])) return '教育';
  if (includesAny(text, ['批发', '百货', '货行', '食品行', '超市', '设备', '货源', '工厂', '广告公司', '广告', '印刷', '房屋中介', '置业'])) return '生意';
  return '服务';
}

function inferCityFromAddress(address, fallback) {
  const text = String(address || '');
  if (/valencia|val[eè]ncia|alaqu[aà]s|torrent|mislata|paterna|burjassot/i.test(text)) return 'Valencia';
  if (/barcelona|badalona|hospitalet|sabadell|terrassa/i.test(text)) return 'Barcelona';
  if (/madrid|fuenlabrada|legan[eé]s|getafe|alcobendas|m[oó]stoles/i.test(text)) return 'Madrid';
  return fallback;
}

function soufunUrl(page) {
  if (page === 1) {
    if (sort === 'xin') return `https://www.soufun.es/114_list_0_0_${cityId}_0_xin.html`;
    if (sort === 'tj') return `https://www.soufun.es/114_list_0_0_${cityId}_0_tj.html`;
    if (sort === 'rq') return `https://www.soufun.es/114_list_0_0_${cityId}_0_rq.html`;
    return `https://www.soufun.es/114_list_0_0_${cityId}_0.html`;
  }
  const sortParam = sort === 'default' ? '' : `paixu=${encodeURIComponent(sort)}&`;
  return `https://www.soufun.es/plugin.php?id=xlwsq_114&${sortParam}bc=${cityId}&page=${page}`;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { Accept: 'text/html,application/xhtml+xml' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function extractRows(html, fallbackCity) {
  const blocks = html.match(/<li>\s*[\s\S]*?<a href="114_[^"]+\.html">[\s\S]*?<\/a>\s*<\/li>/g) || [];
  return blocks.map(block => {
    const phone = clean(block.match(/href="tel:([^"]+)"/)?.[1] || '');
    const title = clean(block.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '');
    const service = clean(block.match(/<p[^>]*>\s*主营：([\s\S]*?)<\/p>/)?.[1] || '');
    const address = clean(block.match(/<p[^>]*>\s*地址：([\s\S]*?)<\/p>/)?.[1] || '');
    const href = clean(block.match(/<a href="(114_[^"]+\.html)"/)?.[1] || '');
    return { phone, title, service, address, href, text: `${title} ${service} ${address}` };
  }).filter(row => row.title && !includesAny(row.text, badKeywords))
    .map(row => ({
      title: row.title,
      category: pickCategory(row.text),
      city: inferCityFromAddress(row.address, fallbackCity),
      address: row.address,
      contact: row.phone || CONTACT_PLACEHOLDER,
      description: `平台代登记商家信息，商家待认领。服务范围：${row.service || row.title}。资料线索来自公开黄页 soufun.es，具体营业时间、联系方式和详细介绍请商家认领后补充。`,
      price: '面议',
      source: 'soufun.es',
      source_url: row.href ? `https://www.soufun.es/${row.href}` : ''
    }));
}

async function main() {
  const fallbackCity = cityNames[cityId] || 'Madrid';
  const seen = new Set();
  const rows = [];
  for (let page = 1; page <= pages; page += 1) {
    const pageRows = extractRows(await fetchText(soufunUrl(page)), fallbackCity);
    for (const row of pageRows) {
      const key = normalizeTitle(row.title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }
  const header = ['title', 'category', 'city', 'address', 'contact', 'description', 'price', 'source', 'source_url'];
  const csv = [header.join(','), ...rows.map(row => header.map(key => csvCell(row[key])).join(','))].join('\n') + '\n';
  fs.writeFileSync(output, csv, 'utf8');
  console.log(`wrote ${rows.length} rows to ${output}`);
  console.log(rows.map(row => `${row.category} | ${row.city} | ${row.title}`).join('\n'));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
