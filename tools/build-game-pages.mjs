// Генератор статичных страниц скриптов под популярные игры.
// Данные берутся из ScriptBlox API. Собирает:
//   /games/<игра>-script (+ /pt, /es), /games/<игра>-<функция>-script, /games/trending,
//   /games/feed.xml (RSS), sitemap.xml, и шлёт новые скрипты в Discord (если задан DISCORD_WEBHOOK_URL).
// Запуск: node tools/build-game-pages.mjs
import { readFile, writeFile, mkdir, readdir, access, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://rbxhub.org';
const API = 'https://scriptblox.com/api/script/search';
const PAGES_PER_GAME = 4;
const MAX_SCRIPTS = 30;
const MIN_SCRIPTS = 3;
const MIN_FEATURE_SCRIPTS = 4;
const SEEN_FILE = path.join(ROOT, 'games', 'data', 'seen.json');
const NOW = new Date();
const YEAR = NOW.getUTCFullYear();
const today = NOW.toISOString().slice(0, 10);

const FEATURES = [
    { slug: 'auto-farm', name: 'Auto Farm', re: /auto[\s-]*farm/i },
    { slug: 'aimbot', name: 'Aimbot', re: /aim\s*bot|silent\s*aim|aim\s*lock/i },
    { slug: 'esp', name: 'ESP', re: /\besp\b/i },
    { slug: 'kill-aura', name: 'Kill Aura', re: /kill\s*aura/i },
    { slug: 'auto-parry', name: 'Auto Parry', re: /auto\s*parry/i },
    { slug: 'fly', name: 'Fly', re: /\bfly\b/i },
];

// ===== Тексты на трёх языках =====
const LANGS = {
    en: {
        code: 'en', prefix: '', locale: 'en-US', name: 'EN',
        nav: ['Exploits', 'Scripts', 'Games'], badge: 'UPDATED DAILY',
        label: (g) => g.universal ? 'Universal Roblox Scripts' : `${g.name} Script`,
        tag: (k) => k > 0 ? 'Keyless' : 'Free',
        title: (g, k) => g.universal
            ? `Universal Roblox Scripts (${YEAR}) – ${k > 0 ? 'Keyless' : 'Free'}, Updated Daily | RBXHub`
            : `${g.name} Script (${YEAR}) – ${k > 0 ? 'Keyless, No Key' : 'Free'}, Updated Daily | RBXHub`,
        desc: (g, n, k, top, d) => `${n} free ${g.universal ? 'universal Roblox' : g.name} scripts, ${k} keyless. Top picks: ${top}. Updated ${d}.`,
        stats: (n, k, d) => `<b>${n}</b> working scripts · <b>${k}</b> keyless · Updated ${d}`,
        runs: 'runs', views: 'views', source: 'Source', copy: 'Copy Script', copied: '✓ Copied to clipboard',
        fav: 'Add to favorites', crumbs: 'Game Scripts', more: 'More Game Scripts', faqTitle: 'FAQ',
        features: 'Popular Features', trending: '🔥 Trending This Week', favorites: '⭐ My Favorites',
        footer: ['Game Scripts', 'All Scripts', 'Terms of Use', 'Privacy'],
        sourced: 'Scripts sourced from the',
        faq: (g, n, d) => {
            const name = g.universal ? 'universal Roblox' : g.name;
            return [
                [`How do I use a ${name} script?`, `Copy the script, open your Roblox executor, join ${g.universal ? 'any game' : g.name}, paste the code into the executor and press Execute.`],
                ['What does "keyless" mean?', 'A keyless script runs right away. Scripts marked "Key System" ask you to get a free key from the developer\'s website first.'],
                [`Are these ${name} scripts free?`, `Yes. All ${n} scripts on this page are free community scripts collected from ScriptBlox. Patched scripts are removed automatically.`],
                ['Can I get banned for using scripts?', 'Yes. Using scripts breaks the Roblox Terms of Use and can get your account banned. Many players test scripts on an alternate account.'],
                ['How often is this list updated?', `Every day, automatically. This page was last updated on ${d}.`],
            ];
        },
        indexTitle: `Roblox Game Scripts (${YEAR}) – Blox Fruits, Grow a Garden, Rivals & More | RBXHub`,
        indexDesc: (n, names) => `Free Roblox scripts for ${n} popular games, updated daily: ${names} and more.`,
        indexH1: 'Roblox Game Scripts',
        indexIntro: 'Pick a game to get free Roblox scripts, most of them keyless. Every list is refreshed daily and patched scripts are removed automatically.',
        tile: (n, k) => `${n} scripts · ${k} keyless`,
        updated: (d) => `Updated ${d}`,
    },
    pt: {
        code: 'pt', prefix: '/pt', locale: 'pt-BR', name: 'PT',
        nav: ['Exploits', 'Scripts', 'Jogos'], badge: 'ATUALIZADO DIARIAMENTE',
        label: (g) => g.universal ? 'Scripts Universais Roblox' : `Script ${g.name}`,
        tag: (k) => k > 0 ? 'Sem Key' : 'Grátis',
        title: (g, k) => g.universal
            ? `Scripts Universais Roblox (${YEAR}) – ${k > 0 ? 'Sem Key' : 'Grátis'}, Atualizado Diariamente | RBXHub`
            : `Script ${g.name} (${YEAR}) – ${k > 0 ? 'Sem Key' : 'Grátis'}, Atualizado Diariamente | RBXHub`,
        desc: (g, n, k, top, d) => `${n} scripts grátis de ${g.universal ? 'Roblox universais' : g.name}, ${k} sem key. Destaques: ${top}. Atualizado em ${d}.`,
        stats: (n, k, d) => `<b>${n}</b> scripts funcionando · <b>${k}</b> sem key · Atualizado em ${d}`,
        runs: 'execuções', views: 'visualizações', source: 'Fonte', copy: 'Copiar Script', copied: '✓ Copiado',
        fav: 'Adicionar aos favoritos', crumbs: 'Scripts de Jogos', more: 'Mais Scripts de Jogos', faqTitle: 'Perguntas Frequentes',
        features: 'Funções Populares', trending: '🔥 Em Alta Esta Semana', favorites: '⭐ Meus Favoritos',
        footer: ['Scripts de Jogos', 'Todos os Scripts', 'Termos de Uso', 'Privacidade'],
        sourced: 'Scripts da comunidade',
        faq: (g, n, d) => {
            const name = g.universal ? 'universal do Roblox' : g.name;
            return [
                [`Como usar um script de ${name}?`, `Copie o script, abra seu executor de Roblox, entre em ${g.universal ? 'qualquer jogo' : g.name}, cole o código no executor e clique em Execute.`],
                ['O que significa "sem key" (keyless)?', 'Um script sem key funciona na hora. Scripts marcados como "Key System" pedem que você pegue uma key grátis no site do desenvolvedor primeiro.'],
                [`Esses scripts de ${name} são grátis?`, `Sim. Todos os ${n} scripts desta página são scripts grátis da comunidade, coletados do ScriptBlox. Scripts com patch são removidos automaticamente.`],
                ['Posso ser banido por usar scripts?', 'Sim. Usar scripts viola os Termos de Uso do Roblox e pode banir sua conta. Muitos jogadores testam scripts em uma conta alternativa.'],
                ['Com que frequência a lista é atualizada?', `Todos os dias, automaticamente. Esta página foi atualizada em ${d}.`],
            ];
        },
        indexTitle: `Scripts de Jogos Roblox (${YEAR}) – Blox Fruits, Grow a Garden, Rivals e Mais | RBXHub`,
        indexDesc: (n, names) => `Scripts grátis de Roblox para ${n} jogos populares, atualizados diariamente: ${names} e mais.`,
        indexH1: 'Scripts de Jogos Roblox',
        indexIntro: 'Escolha um jogo e pegue scripts grátis de Roblox, a maioria sem key. Todas as listas são atualizadas diariamente e scripts com patch são removidos automaticamente.',
        tile: (n, k) => `${n} scripts · ${k} sem key`,
        updated: (d) => `Atualizado em ${d}`,
    },
    es: {
        code: 'es', prefix: '/es', locale: 'es-ES', name: 'ES',
        nav: ['Exploits', 'Scripts', 'Juegos'], badge: 'ACTUALIZADO A DIARIO',
        label: (g) => g.universal ? 'Scripts Universales de Roblox' : `Script de ${g.name}`,
        tag: (k) => k > 0 ? 'Sin Key' : 'Gratis',
        title: (g, k) => g.universal
            ? `Scripts Universales de Roblox (${YEAR}) – ${k > 0 ? 'Sin Key' : 'Gratis'}, Actualizado a Diario | RBXHub`
            : `Script de ${g.name} (${YEAR}) – ${k > 0 ? 'Sin Key' : 'Gratis'}, Actualizado a Diario | RBXHub`,
        desc: (g, n, k, top, d) => `${n} scripts gratis de ${g.universal ? 'Roblox universales' : g.name}, ${k} sin key. Destacados: ${top}. Actualizado el ${d}.`,
        stats: (n, k, d) => `<b>${n}</b> scripts funcionando · <b>${k}</b> sin key · Actualizado el ${d}`,
        runs: 'ejecuciones', views: 'vistas', source: 'Fuente', copy: 'Copiar Script', copied: '✓ Copiado',
        fav: 'Añadir a favoritos', crumbs: 'Scripts de Juegos', more: 'Más Scripts de Juegos', faqTitle: 'Preguntas Frecuentes',
        features: 'Funciones Populares', trending: '🔥 Tendencias de la Semana', favorites: '⭐ Mis Favoritos',
        footer: ['Scripts de Juegos', 'Todos los Scripts', 'Términos de Uso', 'Privacidad'],
        sourced: 'Scripts de la comunidad',
        faq: (g, n, d) => {
            const name = g.universal ? 'universal de Roblox' : g.name;
            return [
                [`¿Cómo uso un script de ${name}?`, `Copia el script, abre tu executor de Roblox, entra a ${g.universal ? 'cualquier juego' : g.name}, pega el código en el executor y pulsa Execute.`],
                ['¿Qué significa "sin key" (keyless)?', 'Un script sin key funciona al instante. Los scripts marcados como "Key System" te piden conseguir primero una key gratis en la web del desarrollador.'],
                [`¿Estos scripts de ${name} son gratis?`, `Sí. Los ${n} scripts de esta página son scripts gratuitos de la comunidad, recopilados de ScriptBlox. Los scripts parcheados se eliminan automáticamente.`],
                ['¿Me pueden banear por usar scripts?', 'Sí. Usar scripts infringe los Términos de Uso de Roblox y puede hacer que baneen tu cuenta. Muchos jugadores prueban los scripts en una cuenta alternativa.'],
                ['¿Cada cuánto se actualiza la lista?', `Todos los días, automáticamente. Esta página se actualizó el ${d}.`],
            ];
        },
        indexTitle: `Scripts de Juegos de Roblox (${YEAR}) – Blox Fruits, Grow a Garden, Rivals y Más | RBXHub`,
        indexDesc: (n, names) => `Scripts gratis de Roblox para ${n} juegos populares, actualizados a diario: ${names} y más.`,
        indexH1: 'Scripts de Juegos de Roblox',
        indexIntro: 'Elige un juego y consigue scripts gratis de Roblox, la mayoría sin key. Todas las listas se actualizan a diario y los scripts parcheados se eliminan automáticamente.',
        tile: (n, k) => `${n} scripts · ${k} sin key`,
        updated: (d) => `Actualizado el ${d}`,
    },
};
const LANG_LIST = Object.values(LANGS);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const dateFor = (L) => NOW.toLocaleDateString(L.locale, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const about = (g, L) => g['about_' + L.code] || g.about;
const gameUrl = (L, slug) => `${SITE}${L.prefix}/games/${slug}-script`;
const keylessCount = (list) => list.filter((s) => s.key === false).length;

// Хеллоуинская тема включается сама с 1 октября по 2 ноября
function isHalloween(d = NOW) {
    const m = d.getUTCMonth(), day = d.getUTCDate();
    return m === 9 || (m === 10 && day <= 2);
}

function formatNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

async function exists(p) {
    try { await access(p); return true; } catch { return false; }
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
        for (const item of data.result?.scripts || []) {
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
    if (!url) return SITE + '/favicon-v2.png';
    return url.startsWith('http') ? url : 'https://scriptblox.com' + url;
}

// ===== Общие куски HTML =====
function head({ L, title, description, canonical, alternates, ogImage, jsonLd = [], noindex = false }) {
    const hw = isHalloween()
        ? '\n    <link rel="stylesheet" href="/halloween.css">\n    <script src="/halloween.js"></script>'
        : '';
    const alt = alternates
        ? '\n    ' + [...alternates.map(([code, url]) => `<link rel="alternate" hreflang="${code}" href="${url}">`),
            `<link rel="alternate" hreflang="x-default" href="${alternates.find(([c]) => c === 'en')[1]}">`].join('\n    ')
        : '';
    return `<meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">${noindex ? '\n    <meta name="robots" content="noindex">' : ''}
    <link rel="canonical" href="${canonical}">${alt}
    <meta name="theme-color" content="#3b82f6">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="RBXHub">
    <meta property="og:locale" content="${L.locale.replace('-', '_')}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${esc(ogImage || SITE + '/favicon-v2.png')}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:image" content="${esc(ogImage || SITE + '/favicon-v2.png')}">
    <link rel="icon" type="image/png" href="/favicon-v2.png">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="alternate" type="application/rss+xml" title="RBXHub – New Roblox Scripts" href="/games/feed.xml">
    <link rel="stylesheet" href="/games/games.css">${hw}
    <script src="/games/games.js" defer></script>
    <script defer src="/_vercel/insights/script.js"></script>
    ${jsonLd.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n    ')}`;
}

function header(L, langLinks) {
    const switcher = langLinks
        ? `<div class="lang-switch">${langLinks.map(([code, url]) => `<a href="${url.replace(SITE, '')}" hreflang="${code}"${code === L.code ? ' class="active"' : ''}>${LANGS[code].name}</a>`).join('')}</div>`
        : '';
    return `<header class="header-nav">
        <div class="nav-toggle">
            <a href="/" class="nav-btn">${L.nav[0]}</a>
            <a href="/scripts.html" class="nav-btn">${L.nav[1]}</a>
            <a href="${L.prefix}/games/" class="nav-btn active">${L.nav[2]}</a>
        </div>
        <a href="/" class="logo-link"><span class="logo-text">RBX<span>HUB</span></span></a>
        <div class="header-right">${switcher}<div class="status-badge"><span class="status-dot"></span>${L.badge}</div></div>
    </header>`;
}

function footer(L) {
    return `<footer class="site-footer">
        <div class="footer-links">
            <a href="${L.prefix}/games/">${L.footer[0]}</a>
            <a href="/scripts.html">${L.footer[1]}</a>
            <a href="/legal.html">${L.footer[2]}</a>
            <a href="/legal.html">${L.footer[3]}</a>
        </div>
        <p>© ${YEAR} RBXHub · ${L.sourced} <a href="https://scriptblox.com" rel="nofollow noopener" target="_blank">ScriptBlox</a></p>
    </footer>`;
}

function card(L, s, i, showGame) {
    const id = `code-${i}`;
    const badge = s.key === false
        ? '<span class="badge badge-green">KEYLESS</span>'
        : '<span class="badge badge-yellow">KEY SYSTEM</span>';
    const verified = s.verified ? '<span class="badge badge-blue">VERIFIED</span>' : '';
    const gameBadge = showGame && s.game?.name ? `<span class="badge badge-gray">${esc(s.game.name)}</span>` : '';
    const updated = (s.lastBump || s.updatedAt || s.createdAt || '').slice(0, 10);
    const fav = JSON.stringify({ id: s._id, t: s.title, g: s.game?.name || '', c: s.script || '', s: s.slug || '', i: imageOf(s) });
    return `<article class="glass-card">
            <div class="card-top">
                <div class="card-thumb-wrapper"><img src="${esc(imageOf(s))}" alt="${esc(s.title)}" loading="lazy" width="50" height="50" onerror="this.onerror=null;this.src='/favicon-v2.png'"></div>
                <div class="card-head">
                    <h3 title="${esc(s.title)}">${esc(s.title)}</h3>
                    <div class="badges">${gameBadge}${badge}${verified}</div>
                </div>
                <button type="button" class="btn-fav" title="${esc(L.fav)}" aria-label="${esc(L.fav)}" data-fav="${esc(fav)}">☆</button>
            </div>
            <pre class="code"><code id="${id}">${esc(s.script)}</code></pre>
            <div class="card-meta">
                <span>▶ ${formatNum(s.executes)} ${L.runs} · 👁 ${formatNum(s.views)} ${L.views}${updated ? ` · ${esc(updated)}` : ''}</span>
                <a href="https://scriptblox.com/script/${esc(s.slug)}" rel="nofollow noopener" target="_blank">${L.source}</a>
            </div>
            <button type="button" class="btn-copy" data-target="${id}" data-copied="${esc(L.copied)}">${esc(L.copy)}</button>
        </article>`;
}

function chips(items) {
    return `<div class="chips">\n            ${items.map(([href, text]) => `<a href="${href}" class="chip">${esc(text)}</a>`).join('\n            ')}\n        </div>`;
}

// Универсальная страница со списком скриптов (игра, функция, тренды)
function renderListPage(o) {
    const { L } = o;
    const faqLd = o.faq ? [{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: o.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    }] : [];
    const crumbsLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: o.crumbs.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })),
    };
    return `<!DOCTYPE html>
<html lang="${L.code}">
<head>
    ${head({ L, title: o.title, description: o.description, canonical: o.canonical, alternates: o.alternates, ogImage: o.ogImage, jsonLd: [crumbsLd, ...faqLd] })}
</head>
<body>
<div class="wrap">
    ${header(L, o.alternates)}

    <nav class="breadcrumbs" aria-label="Breadcrumb">${o.crumbs.map(([name, url], i) => i === o.crumbs.length - 1
        ? `<span>${esc(name)}</span>` : `<a href="${url.replace(SITE, '')}">${esc(name)}</a>`).join(' › ')}</nav>

    <section class="intro" data-count="${o.scripts.length}" data-keyless="${keylessCount(o.scripts)}" data-image="${esc(o.ogImage || '')}">
        <h1>${esc(o.h1)}</h1>
        ${o.intro.map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
        <p class="stats">${o.stats}</p>
    </section>
${o.topChips ? `\n    <section class="related top">\n        <h2>${esc(o.topChips[0])}</h2>\n        ${chips(o.topChips[1])}\n    </section>\n` : ''}
    <section class="grid">
        ${o.scripts.map((s, i) => card(L, s, i, o.showGame)).join('\n        ')}
    </section>
${o.faq ? `
    <section class="faq">
        <h2>${esc(o.faqTitle)}</h2>
        ${o.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n        ')}
    </section>
` : ''}
    <section class="related">
        <h2>${esc(L.more)}</h2>
        ${chips(o.related)}
    </section>

    ${footer(L)}
</div>
</body>
</html>
`;
}

function relatedChips(L, games, exceptSlug) {
    const list = games.filter((g) => g.slug !== exceptSlug).slice(0, 12)
        .map((g) => [`${L.prefix}/games/${g.slug}-script`, L.label(g)]);
    if (L.code === 'en') list.unshift(['/games/trending', L.trending]);
    list.push([`${L.prefix}/games/`, '→']);
    return list;
}

function renderGamePage(L, game, scripts, games, featurePages) {
    const k = keylessCount(scripts);
    const d = dateFor(L);
    const label = L.label(game);
    const alternates = LANG_LIST.map((x) => [x.code, gameUrl(x, game.slug)]);
    const faq = L.faq(game, scripts.length, d);
    return renderListPage({
        L,
        title: L.title(game, k),
        description: L.desc(game, scripts.length, k, scripts.slice(0, 3).map((s) => s.title).join(', '), d).slice(0, 300),
        canonical: gameUrl(L, game.slug),
        alternates,
        ogImage: imageOf(scripts[0]),
        crumbs: [['RBXHub', SITE + '/'], [L.crumbs, `${SITE}${L.prefix}/games/`], [label, gameUrl(L, game.slug)]],
        h1: `${label}${game.universal ? '' : ` (${L.tag(k)})`} – ${YEAR}`,
        intro: [about(game, L)],
        stats: L.stats(scripts.length, k, `<time datetime="${today}">${d}</time>`),
        topChips: featurePages.length ? [L.features, featurePages.map((f) => [`/games/${game.slug}-${f.slug}-script`, `${game.name} ${f.name}`])] : null,
        scripts,
        faq,
        faqTitle: `${label} – ${L.faqTitle}`,
        related: relatedChips(L, games, game.slug),
    });
}

function renderFeaturePage(game, feature, scripts, games) {
    const L = LANGS.en;
    const d = dateFor(L);
    const k = keylessCount(scripts);
    const url = `${SITE}/games/${game.slug}-${feature.slug}-script`;
    const label = `${game.name} ${feature.name} Script`;
    return renderListPage({
        L,
        title: `${label} (${YEAR}) – ${k > 0 ? 'Keyless' : 'Free'}, Updated Daily | RBXHub`,
        description: `${scripts.length} free ${game.name} scripts with ${feature.name}, ${k} keyless: ${scripts.slice(0, 3).map((s) => s.title).join(', ')}. Updated ${d}.`.slice(0, 300),
        canonical: url,
        ogImage: imageOf(scripts[0]),
        crumbs: [['RBXHub', SITE + '/'], [L.crumbs, SITE + '/games/'], [L.label(game), gameUrl(L, game.slug)], [label, url]],
        h1: `${label} – ${YEAR}`,
        intro: [`${scripts.length} ${game.name} scripts that include ${feature.name}. ${about(game, L)}`],
        stats: L.stats(scripts.length, k, `<time datetime="${today}">${d}</time>`),
        scripts,
        related: [[`/games/${game.slug}-script`, `All ${game.name} Scripts`], ...relatedChips(L, games, game.slug)],
    });
}

function renderTrending(scripts, games) {
    const L = LANGS.en;
    const d = dateFor(L);
    const k = keylessCount(scripts);
    return renderListPage({
        L,
        title: `Trending Roblox Scripts This Week (${YEAR}) – Most Executed | RBXHub`,
        description: `The ${scripts.length} most executed Roblox scripts this week across Blox Fruits, Grow a Garden, Rivals and more. ${k} keyless. Updated ${d}.`,
        canonical: SITE + '/games/trending',
        ogImage: imageOf(scripts[0]),
        crumbs: [['RBXHub', SITE + '/'], [L.crumbs, SITE + '/games/'], ['Trending This Week', SITE + '/games/trending']],
        h1: `🔥 Trending Roblox Scripts This Week`,
        intro: ['The most executed scripts of the week across all popular Roblox games, ranked by the ScriptBlox weekly leaderboard.'],
        stats: L.stats(scripts.length, k, `<time datetime="${today}">${d}</time>`),
        scripts,
        showGame: true,
        related: relatedChips(L, games, 'trending'),
    });
}

function renderIndex(L, entries) {
    const d = dateFor(L);
    const canonical = `${SITE}${L.prefix}/games/`;
    const alternates = LANG_LIST.map((x) => [x.code, `${SITE}${x.prefix}/games/`]);
    const jsonLd = [{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: entries.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: gameUrl(L, e.game.slug), name: L.label(e.game) })),
    }];
    const tiles = entries.map((e) => `<a href="${L.prefix}/games/${e.game.slug}-script" class="game-tile glass-card">
            <div class="card-thumb-wrapper"><img src="${esc(e.image)}" alt="${esc(e.game.name)}" loading="lazy" width="50" height="50" onerror="this.onerror=null;this.src='/favicon-v2.png'"></div>
            <div class="card-head">
                <h2>${esc(L.label(e.game))}</h2>
                <p>${L.tile(e.count, e.keyless)}</p>
            </div>
        </a>`).join('\n        ');
    const extra = [];
    if (L.code === 'en') extra.push(['/games/trending', L.trending]);
    extra.push(['/games/favorites', L.favorites]);
    return `<!DOCTYPE html>
<html lang="${L.code}">
<head>
    ${head({ L, title: L.indexTitle, description: L.indexDesc(entries.length, entries.slice(0, 6).map((e) => e.game.name).join(', ')), canonical, alternates, jsonLd })}
</head>
<body>
<div class="wrap">
    ${header(L, alternates)}
    <section class="intro center">
        <h1>${esc(L.indexH1)}</h1>
        <p>${esc(L.indexIntro)}</p>
        <p class="stats">${L.updated(`<time datetime="${today}">${d}</time>`)}</p>
    </section>
    <section class="related top center">
        ${chips(extra)}
    </section>
    <section class="grid">
        ${tiles}
    </section>
    ${footer(L)}
</div>
</body>
</html>
`;
}

function renderFavorites() {
    const L = LANGS.en;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    ${head({ L, title: 'My Favorite Scripts | RBXHub', description: 'Your saved Roblox scripts.', canonical: SITE + '/games/favorites', noindex: true })}
</head>
<body>
<div class="wrap">
    ${header(L)}
    <section class="intro center">
        <h1>⭐ My Favorite Scripts</h1>
        <p>Scripts you starred are saved in this browser. Tap ☆ on any script to add it here.</p>
    </section>
    <section class="grid" id="fav-list"></section>
    <p class="empty-note" id="fav-empty" hidden>No favorites yet. <a href="/games/">Browse game scripts →</a></p>
    ${footer(L)}
</div>
</body>
</html>
`;
}

function renderFeed(items) {
    const rows = items.map((s) => `    <item>
      <title>${esc(`${s.game?.name || 'Roblox'} – ${s.title}`)}</title>
      <link>${s._page}</link>
      <guid isPermaLink="false">${esc(s._id)}</guid>
      <pubDate>${new Date(s.createdAt || NOW).toUTCString()}</pubDate>
      <description>${esc(`${s.key === false ? 'Keyless' : 'Key system'} script for ${s.game?.name || 'Roblox'}. ${formatNum(s.executes)} runs.`)}</description>
    </item>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>RBXHub – New Roblox Scripts</title>
    <link>${SITE}/games/</link>
    <description>New free Roblox scripts for popular games, updated daily.</description>
    <language>en</language>
    <lastBuildDate>${NOW.toUTCString()}</lastBuildDate>
${rows}
  </channel>
</rss>
`;
}

// Если API не ответил — оставляем старую страницу и берём её цифры для индекса
async function readOldMeta(file) {
    const html = await readFile(file, 'utf8');
    return {
        count: Number(html.match(/data-count="(\d+)"/)?.[1] || html.match(/<b>(\d+)<\/b> working scripts/)?.[1] || 0),
        keyless: Number(html.match(/data-keyless="(\d+)"/)?.[1] || html.match(/<b>(\d+)<\/b> keyless/)?.[1] || 0),
        image: html.match(/data-image="([^"]+)"/)?.[1] || html.match(/<img src="([^"]+)"/)?.[1] || '/favicon-v2.png',
    };
}

async function listPages(dir, urlPrefix) {
    if (!(await exists(dir))) return [];
    return (await readdir(dir))
        .filter((f) => f.endsWith('.html') && f !== 'favorites.html')
        .map((f) => f === 'index.html' ? `${urlPrefix}/` : `${urlPrefix}/${f.replace(/\.html$/, '')}`);
}

async function buildSitemap() {
    const rootFiles = (await readdir(ROOT)).filter((f) => f.endsWith('.html') && f !== '404.html').sort();
    const urls = rootFiles.map((f) => {
        const loc = f === 'index.html' ? `${SITE}/` : `${SITE}/${f}`;
        const priority = f === 'index.html' ? '1.0' : f === 'scripts.html' ? '0.9' : f === 'legal.html' ? '0.3' : '0.7';
        return `  <url><loc>${loc}</loc><priority>${priority}</priority></url>`;
    });
    for (const L of LANG_LIST) {
        const pages = await listPages(path.join(ROOT, L.prefix.slice(1), 'games'), `${SITE}${L.prefix}/games`);
        for (const loc of pages.sort()) {
            const priority = loc.endsWith('/games/') ? '0.9' : /-(auto-farm|aimbot|esp|kill-aura|auto-parry|fly)-script$/.test(loc) ? '0.6' : '0.8';
            urls.push(`  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${priority}</priority></url>`);
        }
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
    await writeFile(path.join(ROOT, 'sitemap.xml'), xml);
    return urls.length;
}

// ===== Discord: шлём только скрипты, которых не было в прошлый запуск =====
async function notifyDiscord(collected) {
    let seenIds = null;
    try { seenIds = new Set(JSON.parse(await readFile(SEEN_FILE, 'utf8')).ids); } catch { /* первый запуск */ }

    const all = collected.flatMap(({ game, scripts }) => scripts.map((s) => ({ s, game })));
    const fresh = seenIds ? all.filter(({ s }) => !seenIds.has(s._id)) : [];

    const ids = [...new Set([...(seenIds || []), ...all.map(({ s }) => s._id)])].slice(-5000);
    await mkdir(path.dirname(SEEN_FILE), { recursive: true });
    await writeFile(SEEN_FILE, JSON.stringify({ updated: today, ids }) + '\n');

    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook || fresh.length === 0) return fresh.length;

    const top = fresh.sort((a, b) => (Number(b.s.executes) || 0) - (Number(a.s.executes) || 0)).slice(0, 20);
    for (let i = 0; i < top.length; i += 10) {
        const embeds = top.slice(i, i + 10).map(({ s, game }) => ({
            title: `${game.universal ? 'Universal' : game.name} – ${s.title}`.slice(0, 250),
            url: gameUrl(LANGS.en, game.slug),
            description: `${s.key === false ? '🔓 Keyless' : '🔑 Key system'} · ▶ ${formatNum(s.executes)} runs`,
            thumbnail: { url: imageOf(s) },
            color: s.key === false ? 0x34d399 : 0xfacc15,
        }));
        const res = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'RBXHub', content: i === 0 ? `🆕 **${fresh.length} new Roblox scripts** on RBXHub today` : '', embeds }),
        });
        if (!res.ok) console.warn('Discord webhook failed: HTTP ' + res.status);
        await sleep(1000);
    }
    return fresh.length;
}

async function main() {
    const games = JSON.parse(await readFile(path.join(ROOT, 'tools', 'games.json'), 'utf8'));
    for (const L of LANG_LIST) await mkdir(path.join(ROOT, L.prefix.slice(1), 'games'), { recursive: true });
    const outDir = (L) => path.join(ROOT, L.prefix.slice(1), 'games');

    const entries = [];
    const collected = [];
    for (const game of games) {
        const enFile = path.join(outDir(LANGS.en), `${game.slug}-script.html`);
        try {
            const scripts = await collectScripts(game);
            if (scripts.length < MIN_SCRIPTS) throw new Error(`only ${scripts.length} scripts`);

            // Страницы под функции (только EN): пишем подходящие, удаляем устаревшие
            const featurePages = [];
            for (const f of FEATURES) {
                const file = path.join(outDir(LANGS.en), `${game.slug}-${f.slug}-script.html`);
                const list = game.universal ? [] : scripts.filter((s) => f.re.test(s.title || ''));
                if (list.length >= MIN_FEATURE_SCRIPTS) {
                    await writeFile(file, renderFeaturePage(game, f, list, games));
                    featurePages.push(f);
                } else if (await exists(file)) {
                    await unlink(file);
                }
            }

            for (const L of LANG_LIST) {
                await writeFile(path.join(outDir(L), `${game.slug}-script.html`), renderGamePage(L, game, scripts, games, L.code === 'en' ? featurePages : []));
            }
            entries.push({ game, count: scripts.length, keyless: keylessCount(scripts), image: imageOf(scripts[0]) });
            collected.push({ game, scripts });
            console.log(`✓ ${game.name}: ${scripts.length} scripts${featurePages.length ? `, features: ${featurePages.map((f) => f.slug).join(', ')}` : ''}`);
        } catch (err) {
            if (await exists(enFile)) {
                entries.push({ game, ...(await readOldMeta(enFile)) });
                console.warn(`! ${game.name}: ${err.message} — kept previous pages`);
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

    for (const L of LANG_LIST) await writeFile(path.join(outDir(L), 'index.html'), renderIndex(L, entries));
    await writeFile(path.join(outDir(LANGS.en), 'favorites.html'), renderFavorites());

    // Тренды недели: недельный рейтинг ScriptBlox, иначе — по запускам
    const pool = new Map();
    for (const { game, scripts } of collected) for (const s of scripts) if (!pool.has(s._id)) pool.set(s._id, { ...s, _page: gameUrl(LANGS.en, game.slug) });
    const all = [...pool.values()];
    const ranked = all.filter((s) => s.leaderboard?.period === 'week' && s.leaderboard?.rank).sort((a, b) => a.leaderboard.rank - b.leaderboard.rank);
    const rest = all.filter((s) => !ranked.includes(s)).sort((a, b) => (Number(b.executes) || 0) - (Number(a.executes) || 0));
    const trending = [...ranked, ...rest].slice(0, 30);
    if (trending.length >= MIN_SCRIPTS) await writeFile(path.join(outDir(LANGS.en), 'trending.html'), renderTrending(trending, games));

    // RSS: самые свежие скрипты
    const newest = all.filter((s) => s.createdAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
    if (newest.length) await writeFile(path.join(outDir(LANGS.en), 'feed.xml'), renderFeed(newest));

    const fresh = await notifyDiscord(collected);
    const urlCount = await buildSitemap();
    console.log(`Done: ${entries.length} games × ${LANG_LIST.length} languages, ${fresh} new scripts, sitemap: ${urlCount} URLs.`);
}

main();
