const fs = require('fs');

const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MARK = '\u5e73\u53f0\u4ee3\u767b\u8bb0\u5546\u5bb6\u4fe1\u606f';
const OUTPUT = 'merchant-image-refresh-missing-2026-05-25.json';
const REFRESH_FILE = process.argv.includes('--refresh-output') ? OUTPUT : '';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
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

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function loadImagePools() {
  const data = JSON.parse(fs.readFileSync('merchant-image-varied-pools-2026-05-21.json', 'utf8'));
  const pools = {};
  for (const update of data.updates || []) {
    if (!update.industry || !Array.isArray(update.images)) continue;
    pools[update.industry] ||= [];
    for (const url of update.images) {
      if (url && !pools[update.industry].includes(url)) pools[update.industry].push(url);
    }
  }
  return pools;
}

function industryFor(row) {
  const text = `${row.title || ''} ${row.category || ''} ${row.city || ''} ${row.description || ''}`.toLowerCase();
  if (/moda|fashion|bolso|bolsos|confeccion|ropa|textil|wear|vestido|bag|trendy|sofia|cherry|elena|mimi|kuka|placi/.test(text)) return 'fashion_pet_auto';
  if (/restaurante|餐|饭|面|寿司|料理|火锅|食品|food|gatti|dulce|甜|咖啡|cafe|cafeteria|restaurant/.test(text)) return 'restaurant_catering';
  if (/mayor|wholesale|poligono|批发|百元|bazar|almacen|仓库|import|export|asia|chino|mercanta|tsangku|toys|juguete|xhi|m7|yuyu|huaxin|comercial/.test(text)) return 'wholesale_retail';
  if (/abogado|law|legal|gestor|asesor|tradu|律师|翻译|居留|物流|logistic|transporte|envio|mudanza/.test(text)) return 'legal_logistics';
  if (/decor|reforma|obra|material|constru|装修|维修|家具|mueble/.test(text)) return 'renovation_materials';
  if (/led|light|electro|movil|phone|tech|informatica|电子|手机|灯|照明/.test(text)) return 'lighting_electronics';
  if (/academ|school|curso|educa|培训|教育|学校/.test(text)) return 'education_training';
  if (/beauty|belleza|pelu|nail|salon|美容|美发|美甲|健康|按摩/.test(text)) return 'beauty_health';
  if (/home|hogar|furniture|mueble|家居/.test(text)) return 'home_furniture';
  if (/office|papel|stationery|oficina|文具/.test(text)) return 'stationery_office';
  return 'wholesale_retail';
}

async function fetchJson(path, key = PUBLISHABLE_KEY, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || String(response.status));
  return text ? JSON.parse(text) : null;
}

async function main() {
  const pools = loadImagePools();
  const rows = await fetchJson('/rest/v1/listings?select=id,title,category,city,description,images,user_id,status&status=eq.approved&limit=10000');
  const refreshIds = REFRESH_FILE && fs.existsSync(REFRESH_FILE)
    ? new Set((JSON.parse(fs.readFileSync(REFRESH_FILE, 'utf8')).updates || []).map(row => Number(row.id)).filter(Boolean))
    : null;
  const targets = rows
    .filter(row => !row.user_id && clean(row.description).includes(MARK))
    .filter(row => refreshIds ? refreshIds.has(Number(row.id)) : !hasImages(row.images))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const counters = {};
  const updates = targets.map(row => {
    const industry = industryFor(row);
    const pool = pools[industry] || pools.wholesale_retail || [];
    const index = counters[industry] || 0;
    counters[industry] = index + 1;
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      city: row.city,
      industry,
      images: [pool[index % pool.length]]
    };
  }).filter(row => row.images[0]);

  fs.writeFileSync(OUTPUT, JSON.stringify({
    generated_at: new Date().toISOString(),
    source: 'refresh missing placeholder photos for imported merchants',
    note: 'Each missing imported merchant receives one varied industry-related placeholder photo. Merchants can replace it after claiming or through admin edit.',
    total: updates.length,
    industry_counts: updates.reduce((acc, row) => {
      acc[row.industry] = (acc[row.industry] || 0) + 1;
      return acc;
    }, {}),
    updates
  }, null, 2), 'utf8');

  let changed = 0;
  const skipped = [];
  for (const update of updates) {
    try {
      await fetchJson(`/rest/v1/listings?id=eq.${encodeURIComponent(update.id)}`, SERVICE_ROLE_KEY, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ images: update.images, updated_at: new Date().toISOString() })
      });
      changed += 1;
    } catch (error) {
      skipped.push({ id: update.id, title: update.title, reason: error.message });
    }
  }

  console.log(JSON.stringify({
    output: OUTPUT,
    mode: refreshIds ? 'refresh_output_ids' : 'missing_only',
    targets: targets.length,
    prepared: updates.length,
    updated: changed,
    skipped: skipped.length,
    industry_counts: updates.reduce((acc, row) => {
      acc[row.industry] = (acc[row.industry] || 0) + 1;
      return acc;
    }, {}),
    sample: updates.slice(0, 10).map(row => ({ id: row.id, title: row.title, industry: row.industry, image: row.images[0] }))
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
