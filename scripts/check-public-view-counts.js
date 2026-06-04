const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(name) {
  const start = html.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Missing ${name}`);
  const braceStart = html.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

eval(extractFunction('getPublicViewCount'));
eval(extractFunction('publicViewDisplayFromText'));

const listing = {
  id: 20260604,
  created_at: '2026-06-04T10:00:00.000Z',
  title: '稳定浏览数测试',
  view_count: 0
};

const stableA = getPublicViewCount(listing);
const stableB = getPublicViewCount({ ...listing, view_count: 9999 });
const stableC = getPublicViewCount({ ...listing, view_count: 1 }, 1);

if (stableA < 50) {
  throw new Error(`Public listing views must start at 50 or higher, got ${stableA}`);
}

if (stableA !== stableB || stableA !== stableC) {
  throw new Error(`Public listing views must not depend on real view_count: ${stableA}, ${stableB}, ${stableC}`);
}

const textA = publicViewDisplayFromText('稳定浏览数测试', 1);
const textB = publicViewDisplayFromText('稳定浏览数测试', 9999);

if (textA < 50 || textA !== textB) {
  throw new Error(`Public fallback views must be stable and 50+, got ${textA}, ${textB}`);
}

const forbiddenDisplayPatterns = [
  /<span>[^<]*👁[^<]*\$\{[^}]*view_count/i,
  /textContent\s*=\s*[^;]*view_count/i,
  /innerHTML\s*=[\s\S]{0,300}👁[\s\S]{0,300}view_count/i
];

for (const pattern of forbiddenDisplayPatterns) {
  if (pattern.test(html)) {
    throw new Error(`Public UI appears to display raw view_count: ${pattern}`);
  }
}

console.log(`Public view count check passed: stable display starts at ${stableA}.`);
