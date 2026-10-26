/* ===== RBXHub — Halloween Event (Roblox style) ===== */
(function () {
    // Тема живёт с 1 октября по 2 ноября, в остальное время сайт обычный
    const now = new Date();
    const season = now.getMonth() === 9 || (now.getMonth() === 10 && now.getDate() <= 2);
    if (!season) {
        const css = document.querySelector('link[href="/halloween.css"]');
        if (css) css.remove();
        return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = (min, max) => Math.random() * (max - min) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    if (!document.title.startsWith('🎃')) document.title = '🎃 ' + document.title;

    const WEB_SVG = `<svg viewBox="0 0 100 100" fill="none" stroke="#e9dcf5" stroke-width="0.8">
        <path d="M0 0 L100 100 M0 0 L100 40 M0 0 L40 100 M0 0 L100 70 M0 0 L70 100"/>
        <path d="M18 0 Q14 10 0 18 M36 0 Q32 22 21 30 Q14 34 0 36 M56 0 Q50 34 35 50 Q22 56 0 56 M78 0 Q70 46 50 64 Q30 76 0 78"/>
    </svg>`;

    function buildEventBar() {
        const bar = document.createElement('div');
        bar.id = 'hw-event';
        bar.innerHTML = `<span>🦇</span><b>Halloween Event</b><span>Spooky scripts &amp; exploits</span><span class="hw-timer" id="hw-timer">--</span><span>🎃</span>`;
        const cs = getComputedStyle(document.body);
        bar.style.margin = `-${cs.paddingTop} -${cs.paddingRight} 16px -${cs.paddingLeft}`;
        document.body.prepend(bar);

        const end = new Date(new Date().getFullYear(), 10, 1, 0, 0, 0); // 1 ноября
        const timer = bar.querySelector('#hw-timer');
        const tick = () => {
            const diff = end - Date.now();
            if (diff <= 0) { timer.textContent = 'ENDS SOON 👻'; return; }
            const d = Math.floor(diff / 864e5);
            const h = Math.floor(diff / 36e5) % 24;
            const m = Math.floor(diff / 6e4) % 60;
            const s = Math.floor(diff / 1e3) % 60;
            timer.textContent = `ENDS IN ${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };
        tick();
        setInterval(tick, 1000);
    }

    function buildLayer() {
        const layer = document.createElement('div');
        layer.id = 'hw-layer';
        layer.innerHTML = '<div class="hw-moon"></div><div class="hw-fog"></div><div class="hw-fog b"></div>';
        for (let i = 0; i < 60; i++) {
            const star = document.createElement('span');
            star.className = 'hw-star';
            star.style.left = rand(0, 100) + '%';
            star.style.top = rand(0, 60) + '%';
            star.style.animationDelay = rand(0, 3) + 's';
            layer.appendChild(star);
        }
        document.body.appendChild(layer);

        ['tl', 'tr'].forEach((pos) => {
            const web = document.createElement('div');
            web.className = 'hw-web ' + pos;
            web.innerHTML = WEB_SVG;
            document.body.appendChild(web);
        });

        const spider = document.createElement('div');
        spider.className = 'hw-spider';
        spider.textContent = '🕷️';
        spider.title = 'Boo!';
        document.body.appendChild(spider);

        return layer;
    }

    function spawnBat(layer) {
        const bat = document.createElement('span');
        bat.className = 'hw-bat';
        bat.textContent = '🦇';
        bat.style.top = rand(5, 55) + 'vh';
        bat.style.setProperty('--s', rand(0.6, 1.3).toFixed(2));
        const dur = rand(7, 13);
        bat.style.animationDuration = dur + 's';
        layer.appendChild(bat);
        setTimeout(() => bat.remove(), dur * 1000);
    }

    function spawnDrop(layer) {
        const drop = document.createElement('span');
        drop.className = 'hw-drop';
        drop.textContent = pick(['🍂', '🍁', '🍬', '🍭', '🎃', '🍂', '🍬']);
        drop.style.left = rand(0, 100) + 'vw';
        drop.style.fontSize = rand(14, 26) + 'px';
        drop.style.setProperty('--dx', rand(-120, 120) + 'px');
        drop.style.setProperty('--rot', rand(-540, 540) + 'deg');
        const dur = rand(9, 18);
        drop.style.animationDuration = dur + 's';
        layer.appendChild(drop);
        setTimeout(() => drop.remove(), dur * 1000);
    }

    function spawnGhost(layer) {
        const ghost = document.createElement('span');
        ghost.className = 'hw-ghost';
        ghost.textContent = '👻';
        ghost.style.left = rand(5, 85) + 'vw';
        ghost.style.top = rand(20, 75) + 'vh';
        layer.appendChild(ghost);
        setTimeout(() => ghost.remove(), 9000);
    }

    // Конфетти из конфет при клике — как награда за ивент в Roblox
    function candyBurst(x, y) {
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('span');
            p.className = 'hw-pop';
            p.textContent = pick(['🍬', '🍭', '🎃', '👻', '🦇', '🍫']);
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            const angle = (Math.PI * 2 * i) / 8 + rand(-0.3, 0.3);
            const dist = rand(40, 90);
            p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            p.style.setProperty('--rot', rand(-180, 180) + 'deg');
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 900);
        }
    }

    function init() {
        buildEventBar();
        const layer = buildLayer();
        if (reduceMotion) return;

        for (let i = 0; i < 3; i++) setTimeout(() => spawnBat(layer), i * 1200);
        setInterval(() => spawnBat(layer), 4500);
        for (let i = 0; i < 6; i++) setTimeout(() => spawnDrop(layer), i * 700);
        setInterval(() => spawnDrop(layer), 1400);
        setInterval(() => spawnGhost(layer), 11000);
        setTimeout(() => spawnGhost(layer), 2500);

        document.addEventListener('click', (e) => {
            if (e.target.closest('a, button, .hw-spider, .glass, .glass-card')) candyBurst(e.clientX, e.clientY);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
