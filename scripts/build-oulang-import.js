const fs = require('fs');

const badKeywords = ['求租', '黄页发布', '带一个', '带行李', '回国', '找房', '求购', '招聘', '找工作'];
const keepKeywords = [
  '设备', '空调', '集运', '转运', '按摩', '理疗', '针灸', '收银', '税控',
  '监控', '印刷', '维修', '袋子', '翻译', '新能源', '驾照', '补分',
  '太阳能', '光伏', '充电桩', '厨具', '广告'
];

function csvCell(value) {
  return `"${String(value || '').replace(/"/g, '""').replace(/\r?\n/g, ' ').trim()}"`;
}

function includesAny(text, keywords) {
  return keywords.some(keyword => text.includes(keyword));
}

function pickCategory(title, description) {
  const text = `${title} ${description}`;
  if (includesAny(text, ['厨具', '设备', '收银', '税控', '餐饮', '酒吧', '百货', '货源', '袋子', '工厂'])) return '生意';
  if (includesAny(text, ['驾照', '培训', '课程'])) return '教育';
  return '服务';
}

function pickCity(regionId, regions) {
  const region = regions.find(item => item.id === regionId);
  if (!region) return 'Madrid';
  const cityMap = { Malaga: 'Málaga', Bilbao: 'Vizcaya' };
  return cityMap[region.name] || region.name || 'Madrid';
}

function pickAddress(description) {
  const text = String(description || '');
  const match = text.match(/地址[：:]\s*([^。\n]+)/) || text.match(/([A-Z]?\.?\s?[^。\n，,]*\d+[^。\n，,]*(?:Madrid|Barcelona|Valencia|Las Rozas)[^。\n，,]*)/i);
  return match ? (match[1] || '').trim() : '';
}

function shortDescription(item) {
  const title = String(item.title || '').replace(/\s+/g, ' ').trim();
  return `平台代登记商家信息，商家待认领。服务范围：${title}。具体联系方式、营业时间和详细介绍请商家认领后补充。`;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function main() {
  const listingsInput = encodeURIComponent(JSON.stringify({
    0: { json: { categoryId: 11, page: 1, limit: 100, includeTotal: true, sortBy: 'newest' } }
  }));
  const regionsInput = encodeURIComponent(JSON.stringify({ 0: { json: null } }));
  const [listingJson, regionJson] = await Promise.all([
    fetchJson(`https://oulang.ai/api/trpc/listings.list?batch=1&input=${listingsInput}`),
    fetchJson(`https://oulang.ai/api/trpc/regions.list?batch=1&input=${regionsInput}`)
  ]);
  const listings = listingJson[0].result.data.json.listings;
  const regions = regionJson[0].result.data.json;

  const seen = new Set();
  const rows = [];
  for (const item of listings) {
    const title = String(item.title || '').trim();
    const description = String(item.description || '').trim();
    const text = `${title} ${description}`;
    if (!title || seen.has(title)) continue;
    if (includesAny(text, badKeywords)) continue;
    if (!includesAny(text, keepKeywords)) continue;

    seen.add(title);
    rows.push({
      title,
      category: pickCategory(title, description),
      city: pickCity(item.regionId, regions),
      address: pickAddress(description),
      contact: '请商家认领后补充联系方式',
      description: shortDescription(item),
      price: '面议'
    });
    if (rows.length >= 18) break;
  }

  const header = ['title', 'category', 'city', 'address', 'contact', 'description', 'price'];
  const csv = [
    header.join(','),
    ...rows.map(row => header.map(key => csvCell(row[key])).join(','))
  ].join('\n') + '\n';
  fs.writeFileSync('merchant-import-oulang-2026-05-21.csv', csv, 'utf8');
  console.log(`wrote ${rows.length} rows`);
  console.log(rows.map(row => `${row.category} | ${row.city} | ${row.title}`).join('\n'));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
