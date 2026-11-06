/* ===== RBXHub — Autumn Update (Roblox style) ===== */
(function () {
    // Осень: сентябрь – ноябрь, кроме хеллоуинского окна (1 окт – 2 нояб), его держит halloween.js
    const now = new Date();
    const m = now.getMonth(), d = now.getDate();
    const halloween = m === 9 || (m === 10 && d <= 2);
    const season = (m >= 8 && m <= 10) && !halloween;
    if (!season) {
        const css = document.querySelector('link[href="/autumn.css"]');
        if (css) css.remove();
        return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = (min, max) => Math.random() * (max - min) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    function buildEventBar() {
        const bar = document.createElement('div');
        bar.id = 'au-event';
        bar.innerHTML = `<span>🍁</span><b>Autumn Update</b><span>Fresh scripts every day</span><span class="au-timer" id="au-timer">--</span><span>🍂</span>`;
        const cs = getComputedStyle(document.body);
        bar.style.margin = `-${cs.paddingTop} -${cs.paddingRight} 16px -${cs.paddingLeft}`;
        document.body.prepend(bar);

        const end = new Date(now.getFullYear(), 11, 1, 0, 0, 0); // 1 декабря
        const timer = bar.querySelector('#au-timer');
        const tick = () => {
            const diff = end - Date.now();
            if (diff <= 0) { timer.textContent = 'SEASON ENDS SOON'; return; }
            const days = Math.floor(diff / 864e5);
            const h = Math.floor(diff / 36e5) % 24;
            const min = Math.floor(diff / 6e4) % 60;
            const s = Math.floor(diff / 1e3) % 60;
            timer.textContent = `ENDS IN ${days}d ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };
        tick();
        setInterval(tick, 1000);
    }

    function buildLayer() {
        const layer = document.createElement('div');
        layer.id = 'au-layer';
        layer.innerHTML = '<div class="au-sun"></div><div class="au-hills"></div>';
        document.body.appendChild(layer);
        return layer;
    }

    function spawnLeaf(layer) {
        const leaf = document.createElement('div');
        leaf.className = 'au-leaf';
        const inner = document.createElement('span');
        inner.textContent = pick(['🍁', '🍂', '🍁', '🍂', '🍃', '🌰']);
        inner.style.fontSize = rand(14, 28) + 'px';
        inner.style.setProperty('--r0', rand(-60, 0) + 'deg');
        inner.style.setProperty('--r1', rand(20, 80) + 'deg');
        inner.style.animationDuration = rand(1.2, 2.6) + 's';
        leaf.appendChild(inner);
        leaf.style.left = rand(-5, 100) + 'vw';
        leaf.style.setProperty('--dx', rand(-160, 160) + 'px');
        const dur = rand(10, 20);
        leaf.style.animationDuration = dur + 's';
        layer.appendChild(leaf);
        setTimeout(() => leaf.remove(), dur * 1000);
    }

    // Листья и угощения при клике — как награда за ивент в Roblox
    function burst(x, y) {
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('span');
            p.className = 'au-pop';
            p.textContent = pick(['🍁', '🍂', '🌰', '🍄', '🍎', '🥧']);
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

        for (let i = 0; i < 8; i++) setTimeout(() => spawnLeaf(layer), i * 600);
        setInterval(() => spawnLeaf(layer), 1100);

        document.addEventListener('click', (e) => {
            if (e.target.closest('a, button, .glass, .glass-card')) burst(e.clientX, e.clientY);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
