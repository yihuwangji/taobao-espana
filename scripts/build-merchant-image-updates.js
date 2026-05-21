const fs = require('fs');

const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
const OUTPUT = 'merchant-image-updates-2026-05-21.json';

const coverImages = {
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=82',
  cafe: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=82',
  travel: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82',
  legal: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=82',
  education: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=82',
  logistics: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=82',
  retail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=82',
  printing: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=82',
  health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=82',
  beauty: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=82',
  tech: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=82',
  home: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=82',
  car: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=82',
  energy: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=82',
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=82',
  default: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=82'
};

const rules = [
  ['restaurant', ['餐馆', '饭店', '面馆', '火锅', '麻辣烫', '烧肉', '料理', '日料', '饺子', '小吃', '鸡排', '奶茶', '甜品', '咖啡', '外卖', '美食', '茶庄', '酒家', 'brunch', 'hotpot', 'bbq', 'cake', 'foodie']],
  ['cafe', ['咖啡', '奶茶', '柠檬茶', '华夫饼', '甜品', '茶']],
  ['travel', ['旅行', '旅游', '机票', '接送', '包车', '地接', '出租车', '专车', '导游', '机场', '旅馆']],
  ['legal', ['律师', '法税', '事务所', 'consulting', '居留', '签证', '知识产权', '会计']],
  ['education', ['学校', '驾校', '课程', '培训', '留学', '中文', '教育', '汉学堂']],
  ['logistics', ['物流', '货行', '快递', '清关', '集运', '转运', '搬家', 'ups', 'fedex']],
  ['retail', ['商场', '超市', '百货', '批发', '玩具', '货源', '袋子', '商行', 'outlet']],
  ['printing', ['广告', '印刷', '屏幕', '显示屏', '菜单', '设计']],
  ['health', ['诊所', '牙科', '牙医', '医美', '妇科', '助听器', '按摩', '理疗', '针灸', '足浴', '健康']],
  ['beauty', ['美容', '美发', '美甲', '美睫']],
  ['tech', ['科技', '电脑', '主机', '服务器', '域名', '邮箱', '华为', '收银', '税控', '软件', '手机', '维修']],
  ['home', ['装修', '置业', '房产', '中介', '饰材', '室内设计', '建筑']],
  ['car', ['车行', '汽车', '摩托车', '电动车']],
  ['energy', ['太阳能', '光伏', '新能源', '充电桩', 'efficiency', 'energ']],
  ['grocery', ['食品', '农家', '酿酒', '亚洲', '水果']]
];

function pickCover(listing) {
  const text = `${listing.title || ''} ${listing.description || ''} ${listing.category || ''}`.toLowerCase();
  const found = rules.find(([, keywords]) => keywords.some(keyword => text.includes(keyword.toLowerCase())));
  return coverImages[found?.[0] || 'default'];
}

function hasImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.filter(Boolean).length > 0;
    } catch {
      return Boolean(value.trim());
    }
  }
  return false;
}

async function fetchListings() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/listings?select=id,title,category,description,images,user_id,status&limit=10000`, {
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${PUBLISHABLE_KEY}`
    }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function main() {
  const rows = await fetchListings();
  const imported = rows.filter(row =>
    row.status === 'approved' &&
    !row.user_id &&
    String(row.description || '').includes('平台代登记商家信息') &&
    !hasImages(row.images)
  );
  const updates = imported.map(row => ({
    id: row.id,
    title: row.title,
    category: row.category,
    images: [pickCover(row)]
  }));
  fs.writeFileSync(OUTPUT, JSON.stringify({ updates }, null, 2), 'utf8');
  const counts = updates.reduce((acc, row) => {
    const url = row.images[0];
    const key = Object.entries(coverImages).find(([, value]) => value === url)?.[0] || 'default';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log(`wrote ${updates.length} image updates to ${OUTPUT}`);
  console.log(JSON.stringify(counts, null, 2));
  console.log(updates.slice(0, 30).map(row => `${row.id} | ${row.title} | ${row.images[0]}`).join('\n'));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
