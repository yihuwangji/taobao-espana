const fs = require('fs');

const OUTPUT = 'merchant-import-public-2026-05-21.csv';
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
  '招聘', '招工', '求职', '找工作', '求租', '出租', '转租', '房间', '合租',
  '大使馆', '领事馆', '警察局', '政府机构', '市政府', '移民局',
  '黄页发布', '测试', '广告位',
  '景点', '动物园', '水族馆', '灯塔', '国家公园', '自然公园',
  'Zoo', 'Aquarium', 'Park', 'Parque'
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
  return String(title || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function pickCategory(text) {
  if (includesAny(text, ['学校', '中文学校', '驾校', '课程', '培训', '补习', '教育', '学院'])) return '教育';
  if (includesAny(text, ['批发', '百货', '货行', '食品行', '超市', '设备', '货源', '工厂', '广告屏', '广告机', '灯具'])) return '生意';
  return '服务';
}

function inferCityFromAddress(address, fallback = 'Madrid') {
  const text = String(address || '');
  if (/barcelona|badalona|hospitalet|sabadell|terrassa/i.test(text)) return 'Barcelona';
  if (/madrid|fuenlabrada|legan[eé]s|getafe|alcobendas|m[oó]stoles/i.test(text)) return 'Madrid';
  if (/valencia|val[eè]ncia/i.test(text)) return 'Valencia';
  if (/alicante|alacant/i.test(text)) return 'Alicante';
  if (/m[aá]laga|marbella|fuengirola/i.test(text)) return 'Málaga';
  if (/sevilla|seville/i.test(text)) return 'Sevilla';
  if (/zaragoza/i.test(text)) return 'Zaragoza';
  return fallback;
}

function buildDescription(row, sourceName) {
  const service = row.service ? `服务范围：${row.service}。` : `服务范围：${row.title}。`;
  return `平台代登记商家信息，商家待认领。${service}资料线索来自公开黄页 ${sourceName}，具体营业时间、联系方式和详细介绍请商家认领后补充。`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml'
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function collectXinhua(maxRows = 35) {
  const rows = [];
  for (let page = 1; page <= 4 && rows.length < maxRows; page += 1) {
    const url = page === 1 ? 'https://xinhua.es/item/' : `https://xinhua.es/item/page/${page}/`;
    const html = await fetchText(url);
    const blocks = html.match(/<div\s+data-id="[^"]+"\s+class="item[\s\S]*?(?=<div\s+data-id="[^"]+"\s+class="item|<nav class="nav-single|<\/div>\s*<\/div>\s*<\/div>\s*<nav)/g) || [];
    for (const block of blocks) {
      const link = htmlDecode(block.match(/<div class="item-title">[\s\S]*?<a href="([^"]+)"/)?.[1] || '');
      const title = clean(block.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] || '');
      const address = clean(block.match(/<div class="item-location"><p>([\s\S]*?)<\/p><\/div>/)?.[1] || '');
      const taxonomies = [...block.matchAll(/<div class="taxonomy-name">([\s\S]*?)<\/div>/g)].map(match => clean(match[1]));
      const text = `${title} ${address} ${taxonomies.join(' ')}`;
      if (!title || includesAny(text, badKeywords)) continue;
      rows.push({
        title,
        category: pickCategory(text),
        city: inferCityFromAddress(address, 'Madrid'),
        address,
        contact: CONTACT_PLACEHOLDER,
        service: taxonomies[0] || title,
        source: 'xinhua.es',
        source_url: link
      });
      if (rows.length >= maxRows) break;
    }
  }
  return rows;
}

function soufunUrl(cityId, page) {
  if (page === 1) return `https://www.soufun.es/114_list_0_0_${cityId}_0_xin.html`;
  return `https://www.soufun.es/plugin.php?id=xlwsq_114&paixu=xin&bc=${cityId}&page=${page}`;
}

async function collectSoufun(maxRows = 70) {
  const rows = [];
  const cityPlan = [
    [2, 4],
    [1, 4],
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 1],
    [7, 1],
    [8, 1]
  ];

  for (const [cityId, pages] of cityPlan) {
    for (let page = 1; page <= pages && rows.length < maxRows; page += 1) {
      const html = await fetchText(soufunUrl(cityId, page));
      const blocks = html.match(/<li>\s*[\s\S]*?<a href="114_[^"]+\.html">[\s\S]*?<\/a>\s*<\/li>/g) || [];
      for (const block of blocks) {
        const phone = clean(block.match(/href="tel:([^"]+)"/)?.[1] || '');
        const title = clean(block.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '');
        const service = clean(block.match(/<p[^>]*>\s*主营：([\s\S]*?)<\/p>/)?.[1] || '');
        const address = clean(block.match(/<p[^>]*>\s*地址：([\s\S]*?)<\/p>/)?.[1] || '');
        const text = `${title} ${service} ${address}`;
        if (!title || includesAny(text, badKeywords)) continue;
        rows.push({
          title,
          category: pickCategory(text),
          city: inferCityFromAddress(address, cityNames[cityId] || 'Madrid'),
          address,
          contact: phone || CONTACT_PLACEHOLDER,
          service: service || title,
          source: 'soufun.es',
          source_url: `https://www.soufun.es/${clean(block.match(/<a href="(114_[^"]+\.html)"/)?.[1] || '')}`
        });
        if (rows.length >= maxRows) break;
      }
    }
  }
  return rows;
}

async function main() {
  const [xinhuaRows, soufunRows] = await Promise.all([
    collectXinhua(),
    collectSoufun()
  ]);
  const seen = new Set();
  const rows = [];
  for (const row of [...soufunRows, ...xinhuaRows]) {
    const key = normalizeTitle(row.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      title: row.title,
      category: row.category,
      city: row.city,
      address: row.address,
      contact: row.contact,
      description: buildDescription(row, row.source),
      price: '面议',
      source: row.source,
      source_url: row.source_url
    });
  }

  const header = ['title', 'category', 'city', 'address', 'contact', 'description', 'price', 'source', 'source_url'];
  const csv = [
    header.join(','),
    ...rows.map(row => header.map(key => csvCell(row[key])).join(','))
  ].join('\n') + '\n';
  fs.writeFileSync(OUTPUT, csv, 'utf8');
  console.log(`wrote ${rows.length} rows to ${OUTPUT}`);
  console.log(rows.slice(0, 30).map(row => `${row.category} | ${row.city} | ${row.title}`).join('\n'));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
