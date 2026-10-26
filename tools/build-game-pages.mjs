// Генератор статичных страниц скриптов под популярные игры.
// Данные берутся из ScriptBlox API, HTML кладётся в /games, sitemap.xml пересобирается.
// Запуск: node tools/build-game-pages.mjs
import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'games');
const SITE = 'https://rbxhub.org';
const API = 'https://scriptblox.com/api/script/search';
const PAGES_PER_GAME = 4;
const MAX_SCRIPTS = 30;
const MIN_SCRIPTS = 3;
const YEAR = new Date().getUTCFullYear();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const today = new Date().toISOString().slice(0, 10);
const prettyDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Хеллоуинская тема включается сама с 1 октября по 2 ноября
function isHalloween(d = new Date()) {
    const m = d.getUTCMonth(), day = d.getUTCDate();
    return m === 9 || (m === 10 && day <= 2);
}

function formatNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

async function fetchJson(url, tries = 3) {
    for (let i = 1; i <= tries; i++) {
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'RBXHub-page-builder/1.0 (+https://rbxhub.org)' } });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } catch (err) {
            if (i === tries) throw err;
            await sleep(2000 * i);
        }
    }
}

function belongsToGame(item, game) {
    if (item.isPatched) return false;
    if (game.universal) return item.isUniversal === true;
    const name = (item.game?.name || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const q = game.query.toLowerCase();
    // Свой скрипт игры или хаб, который явно её поддерживает
    return name.includes(q) || (name.length > 3 && q.includes(name)) || title.includes(q);
}

async function collectScripts(game) {
    const seen = new Map();
    for (let page = 1; page <= PAGES_PER_GAME; page++) {
        const data = await fetchJson(`${API}?q=${encodeURIComponent(game.query)}&page=${page}`);
        const list = data.result?.scripts || [];
        for (const item of list) {
            if (belongsToGame(item, game) && item._id && !seen.has(item._id)) seen.set(item._id, item);
        }
        if (!data.result?.nextPage) break;
        await sleep(1200);
    }
    return [...seen.values()]
        .sort((a, b) => (Number(b.executes) || Number(b.views) || 0) - (Number(a.executes) || Number(a.views) || 0))
        .slice(0, MAX_SCRIPTS);
}

function imageOf(item) {
    const url = item.image || item.game?.imageUrl || '';
    if (!url) return '/images/solara.webp';
    return url.startsWith('http') ? url : 'https://scriptblox.com' + url;
}

function headCommon({ title, description, canonical, jsonLd }) {
    const hw = isHalloween()
        ? '\n    <link rel="stylesheet" href="/halloween.css">\n    <script src="/halloween.js" defer></script>'
        : '';
    return `<meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${canonical}">
    <meta name="theme-color" content="#3b82f6">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${SITE}/favicon-v2.png">
    <link rel="icon" type="image/png" href="/favicon-v2.png">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="stylesheet" href="/games/games.css">${hw}
    ${jsonLd.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n    ')}`;
}

function header(active) {
    return `<header class="header-nav">
        <div class="nav-toggle">
            <a href="/" class="nav-btn">Exploits</a>
            <a href="/scripts.html" class="nav-btn${active === 'scripts' ? ' active' : ''}">Scripts</a>
            <a href="/games/" class="nav-btn${active === 'games' ? ' active' : ''}">Games</a>
        </div>
        <a href="/" class="logo-link"><span class="logo-text">RBX<span>HUB</span></span></a>
        <div class="header-right"><div class="status-badge"><span class="status-dot"></span>UPDATED DAILY</div></div>
    </header>`;
}

function footer() {
    return `<footer class="site-footer">
        <div class="footer-links">
            <a href="/games/">Game Scripts</a>
            <a href="/scripts.html">All Scripts</a>
            <a href="/legal.html">Terms of Use</a>
            <a href="/legal.html">Privacy</a>
        </div>
        <p>© ${YEAR} RBXHub · Scripts sourced from the <a href="https://scriptblox.com" rel="nofollow noopener" target="_blank">ScriptBlox</a> community</p>
    </footer>`;
}

const COPY_JS = `<script>
document.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn-copy');
    if (!btn) return;
    var code = document.getElementById(btn.dataset.target);
    navigator.clipboard.writeText(code.textContent).then(function () {
        var original = btn.textContent;
        btn.textContent = '✓ Copied to clipboard';
        btn.classList.add('copied');
        setTimeout(function () { btn.textContent = original; btn.classList.remove('copied'); }, 2000);
    });
});
</script>`;

function faqFor(game, count) {
    const n = game.universal ? 'universal Roblox' : game.name;
    return [
        [`How do I use a ${n} script?`,
         `Copy the script, open your Roblox executor (for example Solara, Velocity or Xeno), join ${game.universal ? 'any game' : game.name}, paste the code into the executor and press Execute.`],
        [`What does "keyless" mean?`,
         `A keyless script runs right away. Scripts marked "Key System" ask you to get a free key from the developer's website first.`],
        [`Are these ${n} scripts free?`,
         `Yes. All ${count} scripts on this page are free community scripts collected from ScriptBlox. Patched scripts are removed automatically.`],
        [`Can I get banned for using scripts?`,
         `Yes. Using scripts breaks the Roblox Terms of Use and can get your account banned. Many players test scripts on an alternate account.`],
        [`How often is this list updated?`,
         `Every day, automatically. This page was last updated on ${prettyDate}.`],
    ];
}

function renderGamePage(game, scripts, allGames) {
    const canonical = `${SITE}/games/${game.slug}-script`;
    const keyless = scripts.filter((s) => s.key === false).length;
    const label = game.universal ? 'Universal Roblox Scripts' : `${game.name} Script`;
    // «Keyless» в заголовке только если такие скрипты реально есть
    const tag = keyless > 0 ? 'Keyless' : 'Free';
    const title = game.universal
        ? `Universal Roblox Scripts (${YEAR}) – ${tag}, Updated Daily | RBXHub`
        : `${game.name} Script (${YEAR}) – ${keyless > 0 ? 'Keyless, No Key' : 'Free'}, Updated Daily | RBXHub`;
    const description = `${scripts.length} free ${game.universal ? 'universal Roblox' : game.name} scripts, ${keyless} keyless. ` +
        `Top picks: ${scripts.slice(0, 3).map((s) => s.title).join(', ')}. Updated ${prettyDate}.`.slice(0, 300);
    const faq = faqFor(game, scripts.length);

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'RBXHub', item: SITE + '/' },
                { '@type': 'ListItem', position: 2, name: 'Game Scripts', item: SITE + '/games/' },
                { '@type': 'ListItem', position: 3, name: label, item: canonical },
            ],
        },
        {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
        },
    ];

    const cards = scripts.map((s, i) => {
        const id = `code-${i}`;
        const badge = s.key === false
            ? '<span class="badge badge-green">KEYLESS</span>'
            : '<span class="badge badge-yellow">KEY SYSTEM</span>';
        const verified = s.verified ? '<span class="badge badge-blue">VERIFIED</span>' : '';
        const updated = (s.lastBump || s.updatedAt || s.createdAt || '').slice(0, 10);
        return `<article class="glass-card">
            <div class="card-top">
                <div class="card-thumb-wrapper"><img src="${esc(imageOf(s))}" alt="${esc(s.title)}" loading="lazy" width="50" height="50" onerror="this.onerror=null;this.src='/favicon-v2.png'"></div>
                <div class="card-head">
                    <h3 title="${esc(s.title)}">${esc(s.title)}</h3>
                    <div class="badges">${badge}${verified}</div>
                </div>
            </div>
            <pre class="code"><code id="${id}">${esc(s.script)}</code></pre>
            <div class="card-meta">
                <span>▶ ${formatNum(s.executes)} runs · 👁 ${formatNum(s.views)} views${updated ? ` · ${esc(updated)}` : ''}</span>
                <a href="https://scriptblox.com/script/${esc(s.slug)}" rel="nofollow noopener" target="_blank">Source</a>
            </div>
            <button type="button" class="btn-copy" data-target="${id}">Copy Script</button>
        </article>`;
    }).join('\n        ');

    const related = allGames.filter((g) => g.slug !== game.slug).slice(0, 12)
        .map((g) => `<a href="/games/${g.slug}-script" class="chip">${esc(g.universal ? 'Universal Scripts' : g.name + ' Script')}</a>`).join('\n            ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    ${headCommon({ title, description, canonical, jsonLd })}
</head>
<body>
<div class="wrap">
    ${header('games')}

    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">RBXHub</a> › <a href="/games/">Game Scripts</a> › <span>${esc(label)}</span></nav>

    <section class="intro">
        <h1>${esc(label)}${game.universal ? '' : ` (${tag})`} – ${YEAR}</h1>
        <p>${esc(game.about)}</p>
        <p class="stats"><b>${scripts.length}</b> working scripts · <b>${keyless}</b> keyless · Updated <time datetime="${today}">${prettyDate}</time></p>
    </section>

    <section class="grid">
        ${cards}
    </section>

    <section class="faq">
        <h2>${esc(label)} – FAQ</h2>
        ${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n        ')}
    </section>

    <section class="related">
        <h2>More Game Scripts</h2>
        <div class="chips">
            ${related}
        </div>
    </section>

    ${footer()}
</div>
${COPY_JS}
</body>
</html>
`;
}

function renderIndex(entries) {
    const canonical = `${SITE}/games/`;
    const title = `Roblox Game Scripts (${YEAR}) – Blox Fruits, Grow a Garden, Rivals & More | RBXHub`;
    const description = `Free keyless Roblox scripts for ${entries.length} popular games, updated daily: ` +
        entries.slice(0, 6).map((e) => e.game.name).join(', ') + ' and more.';
    const jsonLd = [{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: entries.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/games/${e.game.slug}-script`, name: e.game.name + ' Script' })),
    }];
    const tiles = entries.map((e) => `<a href="/games/${e.game.slug}-script" class="game-tile glass-card">
            <div class="card-thumb-wrapper"><img src="${esc(e.image)}" alt="${esc(e.game.name)}" loading="lazy" width="50" height="50"></div>
            <div class="card-head">
                <h2>${esc(e.game.universal ? 'Universal Scripts' : e.game.name + ' Script')}</h2>
                <p>${e.count} scripts · ${e.keyless} keyless</p>
            </div>
        </a>`).join('\n        ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    ${headCommon({ title, description, canonical, jsonLd })}
</head>
<body>
<div class="wrap">
    ${header('games')}
    <section class="intro center">
        <h1>Roblox Game Scripts</h1>
        <p>Pick a game to get free Roblox scripts, most of them keyless. Every list is refreshed daily and patched scripts are removed automatically.</p>
        <p class="stats">Updated <time datetime="${today}">${prettyDate}</time></p>
    </section>
    <section class="grid">
        ${tiles}
    </section>
    ${footer()}
</div>
</body>
</html>
`;
}

async function exists(p) {
    try { await access(p); return true; } catch { return false; }
}

async function readOldMeta(file) {
    // Если API не ответил — оставляем старую страницу и берём её цифры для индекса
    const html = await readFile(file, 'utf8');
    const count = Number(html.match(/<b>(\d+)<\/b> working scripts/)?.[1] || 0);
    const keyless = Number(html.match(/<b>(\d+)<\/b> keyless/)?.[1] || 0);
    const image = html.match(/<img src="([^"]+)"/)?.[1] || '/images/solara.webp';
    return { count, keyless, image };
}

async function buildSitemap(gameSlugs) {
    const files = (await readdir(ROOT)).filter((f) => f.endsWith('.html')).sort();
    const urls = files.map((f) => {
        const loc = f === 'index.html' ? `${SITE}/` : `${SITE}/${f}`;
        const priority = f === 'index.html' ? '1.0' : f === 'scripts.html' ? '0.9' : f === 'legal.html' ? '0.3' : '0.7';
        return `  <url><loc>${loc}</loc><priority>${priority}</priority></url>`;
    });
    urls.push(`  <url><loc>${SITE}/games/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`);
    for (const slug of gameSlugs) {
        urls.push(`  <url><loc>${SITE}/games/${slug}-script</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`);
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
    await writeFile(path.join(ROOT, 'sitemap.xml'), xml);
}

async function main() {
    const games = JSON.parse(await readFile(path.join(ROOT, 'tools', 'games.json'), 'utf8'));
    await mkdir(OUT_DIR, { recursive: true });

    const entries = [];
    for (const game of games) {
        const file = path.join(OUT_DIR, `${game.slug}-script.html`);
        try {
            const scripts = await collectScripts(game);
            if (scripts.length < MIN_SCRIPTS) throw new Error(`only ${scripts.length} scripts`);
            await writeFile(file, renderGamePage(game, scripts, games));
            entries.push({ game, count: scripts.length, keyless: scripts.filter((s) => s.key === false).length, image: imageOf(scripts[0]) });
            console.log(`✓ ${game.name}: ${scripts.length} scripts`);
        } catch (err) {
            if (await exists(file)) {
                entries.push({ game, ...(await readOldMeta(file)) });
                console.warn(`! ${game.name}: ${err.message} — kept previous page`);
            } else {
                console.warn(`✗ ${game.name}: ${err.message} — skipped`);
            }
        }
        await sleep(1200);
    }

    if (entries.length === 0) {
        console.error('No pages built — ScriptBlox API unreachable?');
        process.exit(1);
    }

    await writeFile(path.join(OUT_DIR, 'index.html'), renderIndex(entries));
    await buildSitemap(entries.map((e) => e.game.slug));
    console.log(`Done: ${entries.length} game pages, sitemap updated.`);
}

main();
