import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const languages = [
  ['en', 'en', 'English'], ['ru', 'ru', 'Русский'], ['tr', 'tr', 'Türkçe'],
  ['ar', 'ar', 'العربية'], ['es', 'es', 'Español'], ['it', 'it', 'Italiano'],
  ['de', 'de', 'Deutsch'], ['zh', 'zh-Hans', '简体中文'], ['ja', 'ja', '日本語'],
  ['uk', 'uk', 'Українська'], ['hi', 'hi', 'हिन्दी'], ['bn', 'bn', 'বাংলা'],
  ['ur', 'ur', 'اردو'], ['fa', 'fa', 'فارسی'], ['he', 'he', 'עברית']
];
const fields = [
  'landing_topic_market', 'landing_topic_trade', 'landing_kicker', 'landing_lead', 'go_to_feed',
  'landing_note', 'landing_story_kicker', 'landing_story_title', 'landing_story_copy',
  'landing_story_aside', 'landing_howto_title', 'landing_step1_title', 'landing_step1_copy',
  'landing_step2_title', 'landing_step2_copy', 'landing_step3_title', 'landing_step3_copy',
  'landing_howto_note', 'feature_community', 'feature_community_copy', 'feature_market',
  'feature_market_copy', 'feature_clans', 'feature_clans_copy', 'feature_feed', 'feature_feed_copy',
  'landing_economy_kicker', 'landing_economy_title', 'landing_economy_copy', 'landing_economy_sell',
  'landing_economy_trade', 'landing_economy_note_title', 'landing_economy_note_copy1',
  'landing_economy_note_copy2', 'discussion_kicker', 'discussion_title', 'discussion_copy'
];
const context = vm.createContext({ window: {} });
for (const [code] of languages) {
  const source = fs.readFileSync(path.join(root, 'js/core/languages', `${code}.js`), 'utf8');
  vm.runInContext(source, context, { filename: `${code}.js` });
}
vm.runInContext(fs.readFileSync(path.join(root, 'js/core/languages/site-extra.js'), 'utf8'), context, { filename: 'site-extra.js' });

const dictionaries = Object.fromEntries(languages.map(([code]) => [
  code,
  { ...(context.window[`LANG_${code.toUpperCase()}`] || {}), ...(context.window[`LANG_${code.toUpperCase()}_EXTRA`] || {}) }
]));
const missing = languages.flatMap(([code]) => fields.filter((key) => !dictionaries[code][key]).map((key) => `${code}:${key}`));
if (missing.length) throw new Error(`Missing localized landing copy: ${missing.join(', ')}`);

const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const alternates = languages.map(([code, hreflang]) => `    <link rel="alternate" hreflang="${hreflang}" href="https://metaimperiya.com/${code === 'ru' ? '' : `${code}/`}">`).join('\n');
const htmlFor = ([code, hreflang, displayName]) => {
  const t = dictionaries[code];
  const title = code === 'ru'
    ? 'CPM2 METAIMPERIYA | Car Parking 2 — Продажа, Покупка и Обмен Авто'
    : `CPM2 METAIMPERIYA | Car Parking 2 — ${t.landing_topic_market}`;
  const description = `${t.landing_lead} Buy & Sell Cars, Car Trade, Car Exchange.`;
  const keywords = [
    'CPM2', 'CPM 2', 'Car Parking Multiplayer 2', 'Car Parking 2', 'METAIMPERIYA',
    t.landing_topic_market, t.landing_topic_trade, 'Buy & Sell Cars', 'Car Trade', 'Car Exchange'
  ].join(', ');
  const href = `https://metaimperiya.com/${code}/`;
  const dir = ['ar', 'fa', 'ur', 'he'].includes(code) ? 'rtl' : 'ltr';
  const langLinks = languages.map(([otherCode, otherTag, name]) =>
    `<a lang="${otherTag}" href="${otherCode === 'ru' ? '/' : `/${otherCode}/`}"${otherCode === code ? ' aria-current="page"' : ''}>${esc(name)}</a>`
  ).join('\n        ');
  return `<!doctype html>
<html lang="${hreflang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index,follow">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="keywords" content="${esc(keywords)}">
  <link rel="canonical" href="${href}">
${alternates}
  <link rel="alternate" hreflang="x-default" href="https://metaimperiya.com/en/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CPM2 METAIMPERIYA">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${href}">
  <meta property="og:image" content="https://metaimperiya.com/assets/images/metaimperiya-com.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="https://metaimperiya.com/assets/images/metaimperiya-com.png">
  <link rel="icon" href="/assets/icons/metaimperiya.ico" sizes="any">
  <link rel="stylesheet" href="/css/core/reset.css?v=3.0">
  <link rel="stylesheet" href="/css/core/variables.css?v=3.0">
  <link rel="stylesheet" href="/css/core/base.css?v=3.0">
  <link rel="stylesheet" href="/css/features/cpm2-landing.css?v=1.5">
  <link rel="stylesheet" href="/css/localized-landing.css?v=1.0">
  <script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${href}#webpage`,
    name: title,
    description,
    url: href,
    inLanguage: hreflang,
    isPartOf: { '@id': 'https://metaimperiya.com/#website' },
    about: { '@id': 'https://metaimperiya.com/#organization' }
  }, null, 2)}
  </script>
</head>
<body>
  <header class="localized-topbar">
    <a class="localized-brand" href="/">CPM2 METAIMPERIYA</a>
    <nav class="localized-languages" aria-label="${esc(displayName)}">${langLinks}</nav>
  </header>
  <main class="cpm2-landing localized-main">
    <section class="cpm2-landing-hero">
      <span class="cpm2-landing-kicker">${esc(t.landing_kicker)}</span>
      <h1>${esc(title)}</h1>
      <p class="cpm2-landing-lead">${esc(t.landing_lead)}</p>
      <div class="cpm2-landing-search-terms"><span>CPM2</span><span>Car Parking Multiplayer 2</span><span>${esc(t.landing_topic_market)}</span><span>${esc(t.landing_topic_trade)}</span></div>
      <a class="cpm2-landing-primary localized-cta" href="/?lang=${code}">${esc(t.go_to_feed)} →</a>
      <p class="cpm2-landing-note">${esc(t.landing_note)}</p>
    </section>
    <section class="cpm2-landing-story">
      <div class="cpm2-landing-story-copy">
        <span class="cpm2-landing-kicker">${esc(t.landing_story_kicker)}</span>
        <h2>${esc(t.landing_story_title)}</h2>
        <p>${esc(t.landing_story_copy)}</p>
        <p class="cpm2-landing-story-aside">${esc(t.landing_story_aside)}</p>
      </div>
      <div class="cpm2-landing-howto">
        <h3>${esc(t.landing_howto_title)}</h3>
        <article><span>01</span><div><strong>${esc(t.landing_step1_title)}</strong><small>${esc(t.landing_step1_copy)}</small></div></article>
        <article><span>02</span><div><strong>${esc(t.landing_step2_title)}</strong><small>${esc(t.landing_step2_copy)}</small></div></article>
        <article><span>03</span><div><strong>${esc(t.landing_step3_title)}</strong><small>${esc(t.landing_step3_copy)}</small></div></article>
        <small class="cpm2-landing-howto-note">${esc(t.landing_howto_note)}</small>
      </div>
    </section>
    <section class="cpm2-landing-features" aria-label="${esc(t.landing_kicker)}">
      <article class="cpm2-landing-feature"><span>01 · CPM2</span><strong>${esc(t.feature_community)}</strong><small>${esc(t.feature_community_copy)}</small></article>
      <article class="cpm2-landing-feature"><span>02 · ${esc(t.landing_topic_market)}</span><strong>${esc(t.feature_market)}</strong><small>${esc(t.feature_market_copy)}</small></article>
      <article class="cpm2-landing-feature"><span>03</span><strong>${esc(t.feature_clans)}</strong><small>${esc(t.feature_clans_copy)}</small></article>
      <article class="cpm2-landing-feature"><span>04</span><strong>${esc(t.feature_feed)}</strong><small>${esc(t.feature_feed_copy)}</small></article>
    </section>
    <section class="cpm2-landing-economy">
      <div class="cpm2-landing-economy-copy"><span class="cpm2-landing-kicker">${esc(t.landing_economy_kicker)}</span><h2>${esc(t.landing_economy_title)}</h2><p>${esc(t.landing_economy_copy)}</p><a class="localized-market-link" href="/?lang=${code}">${esc(t.landing_economy_sell)} · ${esc(t.landing_economy_trade)} →</a></div>
      <aside class="cpm2-landing-economy-note"><strong>${esc(t.landing_economy_note_title)}</strong><p>${esc(t.landing_economy_note_copy1)}</p><p>${esc(t.landing_economy_note_copy2)}</p></aside>
    </section>
    <section class="cpm2-landing-discussion"><div class="cpm2-landing-section-heading"><span>${esc(t.discussion_kicker)}</span><h2>${esc(t.discussion_title)}</h2><p>${esc(t.discussion_copy)}</p></div></section>
  </main>
</body>
</html>
`;
};

const hreflangBlock = `  <!-- BEGIN GENERATED HREFLANG -->\n${alternates}\n  <link rel="alternate" hreflang="x-default" href="https://metaimperiya.com/en/">\n  <!-- END GENERATED HREFLANG -->`;
const homePath = path.join(root, 'index.html');
let home = fs.readFileSync(homePath, 'utf8');
const marker = /  <!-- BEGIN GENERATED HREFLANG -->[\s\S]*?  <!-- END GENERATED HREFLANG -->/;
if (marker.test(home)) home = home.replace(marker, hreflangBlock);
else home = home.replace('    <link rel="canonical" href="https://metaimperiya.com/">', `    <link rel="canonical" href="https://metaimperiya.com/">\n${hreflangBlock}`);
fs.writeFileSync(homePath, home);

for (const language of languages) {
  const [code] = language;
  if (code === 'ru') continue;
  const folder = path.join(root, code);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'index.html'), htmlFor(language));
}

const urls = languages.map(([code]) => `  <url><loc>https://metaimperiya.com/${code === 'ru' ? '' : `${code}/`}</loc></url>`).join('\n');
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

const vercelPath = path.join(root, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const localeRoutes = languages.filter(([code]) => code !== 'ru').flatMap(([code]) => [
    { source: `/${code}`, destination: `/${code}/index.html` },
    { source: `/${code}/`, destination: `/${code}/index.html` }
  ]);
  const routes = vercel.rewrites || [];
  const retained = routes.filter((route) => !localeRoutes.some((localeRoute) => localeRoute.source === route.source));
  const catchAllIndex = retained.findIndex((route) => route.source === '/(.*)' && route.destination === '/index.html');
  retained.splice(catchAllIndex < 0 ? retained.length : catchAllIndex, 0, ...localeRoutes);
  vercel.rewrites = retained;
  fs.writeFileSync(vercelPath, `${JSON.stringify(vercel, null, 2)}\n`);
}

console.log(`Generated ${languages.length - 1} localized landing pages and ${languages.length} sitemap URLs.`);
