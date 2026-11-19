/* ===== RBXHub — Autumn (мягкая тёплая тема) ===== */
(function () {
    // Какая тема активна, решает season.js (по дате или превью)
    const now = new Date();
    if (window.RBX_SEASON !== 'autumn') {
        const css = document.querySelector('link[href="/autumn.css"]');
        if (css) css.remove();
        return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = (min, max) => Math.random() * (max - min) + min;

    function buildEventBar() {
        const bar = document.createElement('div');
        bar.id = 'au-event';
        bar.innerHTML = '<b>Autumn Update</b><span>· fresh scripts every day ·</span><span class="au-timer" id="au-timer"></span>';
        const cs = getComputedStyle(document.body);
        bar.style.margin = `-${cs.paddingTop} -${cs.paddingRight} 16px -${cs.paddingLeft}`;
        document.body.prepend(bar);

        const end = new Date(now.getFullYear(), 11, 1); // 1 декабря
        const days = Math.ceil((end - now) / 864e5);
        bar.querySelector('#au-timer').textContent = days > 1 ? `${days} days left` : 'last day';
    }

    // Несколько медленных полупрозрачных листьев, без суеты
    function spawnLeaf(layer) {
        const leaf = document.createElement('div');
        leaf.className = 'au-leaf';
        const inner = document.createElement('span');
        inner.textContent = Math.random() < 0.5 ? '🍂' : '🍁';
        inner.style.fontSize = rand(12, 18) + 'px';
        inner.style.setProperty('--r0', rand(-40, 0) + 'deg');
        inner.style.setProperty('--r1', rand(15, 45) + 'deg');
        inner.style.animationDuration = rand(2.5, 4) + 's';
        leaf.appendChild(inner);
        leaf.style.left = rand(0, 100) + 'vw';
        leaf.style.setProperty('--dx', rand(-120, 120) + 'px');
        const dur = rand(18, 28);
        leaf.style.animationDuration = dur + 's';
        layer.appendChild(leaf);
        setTimeout(() => leaf.remove(), dur * 1000);
    }

    function init() {
        buildEventBar();
        if (reduceMotion) return;
        const layer = document.createElement('div');
        layer.id = 'au-layer';
        document.body.appendChild(layer);
        for (let i = 0; i < 3; i++) setTimeout(() => spawnLeaf(layer), i * 2500);
        setInterval(() => spawnLeaf(layer), 3500);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
