import { mkdir, writeFile } from 'node:fs/promises';

const site = 'www_metaimperiya_com';
const origin = (process.env.SITE_ORIGIN || 'https://metaimperiya.com').replace(/\/$/, '');
const endpoint = `https://myecosystem-e6414-default-rtdb.firebaseio.com/sites/${site}/articles.json`;
const categoryMeta = {
  news: ['Новости', 'Свежие новости и важные события в сообществе METAIMPERIYA.', 'События, обновления и истории, о которых стоит знать.'],
  video: ['Видео', 'Видео, обзоры и авторские материалы METAIMPERIYA.', 'Смотрим, обсуждаем и открываем новое.'],
  music: ['Музыка', 'Музыкальные материалы, релизы и подборки METAIMPERIYA.', 'Звуки, исполнители и истории о музыке.'],
  games: ['Игры', 'Игры, игровые новости и материалы METAIMPERIYA.', 'Игровые миры, новинки и идеи.'],
  sport: ['Спорт', 'Спортивные новости и материалы METAIMPERIYA.', 'Матчи, достижения и активный образ жизни.'],
  cinema: ['Кино', 'Кино, сериалы и обзоры от METAIMPERIYA.', 'Премьеры, истории и впечатления от экрана.'],
  programming: ['Программирование', 'Программирование, технологии и практические материалы METAIMPERIYA.', 'Код, технологии и опыт создания продуктов.'],
  business: ['Бизнес', 'Бизнес, проекты и полезные материалы METAIMPERIYA.', 'Идеи, стратегии и истории развития.'],
  dating: ['Знакомства', 'Знакомства, общение и отношения в METAIMPERIYA.', 'Общение, новые люди и полезные советы.']
};
const categories = Object.keys(categoryMeta);
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = value => new Date(value || Date.now()).toISOString().slice(0, 10);
const displayDate = value => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
const nav = () => `<nav><a href="/news/">Новости</a><a href="/video/">Видео</a><a href="/music/">Музыка</a><a href="/games/">Игры</a><a href="/sport/">Спорт</a><a href="/cinema/">Кино</a><a href="/programming/">Программирование</a><a href="/business/">Бизнес</a><a href="/dating/">Знакомства</a></nav>`;
const header = () => `<header class="content-header"><div class="content-nav"><a class="content-brand" href="/">METAIMPERIYA</a>${nav()}</div></header>`;
const meta = ({ title, description, url, type = 'website', image, robots = 'index,follow' }) => `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — METAIMPERIYA</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${url}"><link rel="sitemap" type="application/xml" href="${origin}/sitemap.xml"><meta property="og:type" content="${type}"><meta property="og:site_name" content="METAIMPERIYA"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${esc(image || `${origin}/assets/images/metaimperiya-512x512.png`)}"><link rel="stylesheet" href="/css/content.css">`;
const firebaseScripts = auth => `<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js"></script>${auth ? '<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>' : ''}<script src="/js/core/firebase.js"></script><script src="/js/content-public.js"></script>`;

function card(a) {
  const url = `/${a.category}/${a.slug}/`;
  return `<article class="article-card">${a.coverUrl ? `<img src="${esc(a.coverUrl)}" alt="${esc(a.title)}" loading="lazy">` : ''}<div class="article-card__body"><time datetime="${date(a.publishedAt)}">${displayDate(a.publishedAt)}</time><h2><a href="${url}">${esc(a.title)}</a></h2><p>${esc(a.description)}</p><a class="button" href="${url}">Читать</a></div></article>`;
}

function categoryPage(category, articles) {
  const [title, description, lead] = categoryMeta[category];
  const url = `${origin}/${category}/`;
  const listing = articles.length ? articles.map(card).join('') : '<div class="empty-state"><strong>Материалов пока нет</strong><br>Новые публикации этого раздела появятся здесь.</div>';
  return `<!doctype html><html lang="ru"><head>${meta({ title, description, url, robots: articles.length ? 'index,follow' : 'noindex,follow' })}</head><body class="content-site" data-category="${category}">${header()}<main class="content-main"><div class="content-hero"><div class="content-kicker">METAIMPERIYA · раздел</div><h1>${title}</h1><p class="content-lead">${lead}</p></div><section class="articles-grid" id="articles">${listing}</section></main>${firebaseScripts(false)}</body></html>`;
}

function articlePage(a) {
  const url = `${origin}/${a.category}/${a.slug}/`;
  return `<!doctype html><html lang="ru"><head>${meta({ title: a.title, description: a.description, url, type: 'article', image: a.coverUrl })}</head><body class="content-site" data-article-id="${esc(a.id)}">${header()}<main class="content-main article-page"><article id="article"><p class="article-meta"><time datetime="${date(a.publishedAt)}">${displayDate(a.publishedAt)}</time> · ${esc(categoryMeta[a.category][0])}</p><h1>${esc(a.title)}</h1>${a.coverUrl ? `<img class="article-cover" src="${esc(a.coverUrl)}" alt="${esc(a.title)}">` : ''}<div class="article-body">${a.content || ''}</div><section class="share-box"><h2>Поделиться в ленте METAIMPERIYA</h2><p>Опубликуйте карточку статьи у себя в ленте.</p><button class="button" id="shareArticle">Поделиться в ленте</button></section><section class="comments-box"><h2>Комментарии</h2><div id="comments"></div><div class="comment-form"><input id="commentText" placeholder="Написать комментарий"><button class="button" id="sendComment">Отправить</button></div></section></article></main>${firebaseScripts(true)}</body></html>`;
}

let data = {};
try {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(String(response.status));
  data = await response.json() || {};
} catch (error) {
  console.warn(`Content generation skipped: ${error.message}`);
}
const articles = Object.entries(data).map(([id, article]) => ({ ...article, id })).filter(article => article && article.status === 'published' && categoryMeta[article.category] && /^[a-z0-9-]+$/.test(article.slug || '')).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

for (const category of categories) {
  const categoryArticles = articles.filter(article => article.category === category);
  await mkdir(category, { recursive: true });
  await writeFile(`${category}/index.html`, categoryPage(category, categoryArticles));
}
for (const article of articles) {
  await mkdir(`${article.category}/${article.slug}`, { recursive: true });
  await writeFile(`${article.category}/${article.slug}/index.html`, articlePage(article));
}
const urls = [`  <url><loc>${origin}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`];
for (const category of categories.filter(category => articles.some(article => article.category === category))) urls.push(`  <url><loc>${origin}/${category}/</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`);
for (const article of articles) urls.push(`  <url><loc>${origin}/${article.category}/${article.slug}/</loc><lastmod>${date(article.updatedAt || article.publishedAt)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
await writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`Generated ${articles.length} published article pages and sitemap.`);
