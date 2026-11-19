/* ===== RBXHub — Winter (мягкая холодная тема) ===== */
(function () {
    // Какая тема активна, решает season.js (по дате или превью)
    if (window.RBX_SEASON !== 'winter') {
        const css = document.querySelector('link[href="/winter.css"]');
        if (css) css.remove();
        return;
    }

    const now = new Date();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = (min, max) => Math.random() * (max - min) + min;

    function buildEventBar() {
        const bar = document.createElement('div');
        bar.id = 'wi-event';
        bar.innerHTML = '<b>Winter Update</b><span>· fresh scripts every day ·</span><span class="wi-timer" id="wi-timer"></span>';
        const cs = getComputedStyle(document.body);
        bar.style.margin = `-${cs.paddingTop} -${cs.paddingRight} 16px -${cs.paddingLeft}`;
        document.body.prepend(bar);

        // Зима до ближайшего 1 марта (в декабре и в превью осенью — следующего года)
        const end = new Date(now.getFullYear() + (now.getMonth() >= 2 ? 1 : 0), 2, 1);
        const days = Math.ceil((end - now) / 864e5);
        bar.querySelector('#wi-timer').textContent = days > 1 ? `${days} days left` : 'last day';
    }

    // Тихий редкий снег: мягкие размытые точки разного размера
    function spawnFlake(layer) {
        const flake = document.createElement('span');
        flake.className = 'wi-flake';
        const size = rand(2, 5);
        flake.style.width = flake.style.height = size + 'px';
        flake.style.opacity = rand(0.25, 0.6).toFixed(2);
        flake.style.left = rand(0, 100) + 'vw';
        flake.style.setProperty('--dx', rand(-60, 60) + 'px');
        const dur = rand(14, 26);
        flake.style.animationDuration = dur + 's';
        layer.appendChild(flake);
        setTimeout(() => flake.remove(), dur * 1000);
    }

    function init() {
        buildEventBar();
        const layer = document.createElement('div');
        layer.id = 'wi-layer';
        layer.innerHTML = '<div class="wi-frost"></div>';
        document.body.appendChild(layer);
        if (reduceMotion) return;
        for (let i = 0; i < 12; i++) setTimeout(() => spawnFlake(layer), i * 400);
        setInterval(() => spawnFlake(layer), 700);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
