/* ===== RBXHub — Winter (мягкая холодная тема + новогоднее настроение) ===== */
(function () {
    // Какая тема активна, решает season.js (по дате или превью)
    if (window.RBX_SEASON !== 'winter') {
        const css = document.querySelector('link[href="/winter.css"]');
        if (css) css.remove();
        return;
    }

    const now = new Date();
    const m = now.getMonth(), d = now.getDate();
    const lateWinter = (m === 0 && d > 10) || m === 1;
    // Праздничный режим: 1 декабря – 10 января (в превью — всегда, кроме конца зимы)
    const festive = m === 11 || (m === 0 && d <= 10) || (window.RBX_SEASON_PREVIEW && !lateWinter);
    const newYear = new Date(now.getFullYear() + (m === 0 ? 0 : 1), 0, 1); // ближайшее 1 января
    const nyYear = newYear.getFullYear();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = (min, max) => Math.random() * (max - min) + min;
    const COLORS = ['#f1d8a2', '#e9b8c4', '#a9c7ec', '#a6d8c5'];

    if (festive) document.documentElement.classList.add('wi-festive');

    function pad(n) { return String(n).padStart(2, '0'); }

    function buildEventBar() {
        const bar = document.createElement('div');
        bar.id = 'wi-event';
        const cs = getComputedStyle(document.body);
        bar.style.margin = `-${cs.paddingTop} -${cs.paddingRight} 16px -${cs.paddingLeft}`;
        document.body.prepend(bar);

        if (!festive) {
            const end = new Date(now.getFullYear() + (m >= 2 ? 1 : 0), 2, 1); // ближайшее 1 марта
            const days = Math.ceil((end - now) / 864e5);
            bar.innerHTML = `<b>Winter Update</b><span>· fresh scripts every day ·</span><span class="wi-timer">${days > 1 ? days + ' days left' : 'last day'}</span>`;
            return bar;
        }

        const happy = () => {
            bar.innerHTML = `<b>Happy New Year ${nyYear}!</b><span>· thanks for being with RBXHub ✨</span>`;
        };
        if (Date.now() >= newYear) { happy(); return bar; }

        bar.innerHTML = `<b>New Year ${nyYear}</b><span>· in</span><span class="wi-timer" id="wi-timer"></span>`;
        const timer = bar.querySelector('#wi-timer');
        const tick = () => {
            const diff = newYear - Date.now();
            if (diff <= 0) {
                clearInterval(id);
                happy();
                celebrate();
                return;
            }
            const days = Math.floor(diff / 864e5);
            timer.textContent = `${days ? days + 'd ' : ''}${pad(Math.floor(diff / 36e5) % 24)}:${pad(Math.floor(diff / 6e4) % 60)}:${pad(Math.floor(diff / 1e3) % 60)}`;
        };
        const id = setInterval(tick, 1000);
        tick();
        return bar;
    }

    // Гирлянда: провисающий провод между точками крепления и лампочки на нём
    function buildGarland(after) {
        const box = document.createElement('div');
        box.id = 'wi-garland';
        box.style.marginLeft = after.style.marginLeft;
        box.style.marginRight = after.style.marginRight;
        after.after(box);

        function draw() {
            const w = box.clientWidth;
            const span = w < 640 ? 120 : 180;
            const sag = 14, top = 4;
            const spans = Math.max(1, Math.round(w / span));
            const step = w / spans;
            let path = `M0 ${top}`;
            for (let i = 0; i < spans; i++) {
                const x0 = i * step, x1 = x0 + step;
                path += ` Q${x0 + step / 2} ${top + sag * 2} ${x1} ${top}`;
            }
            box.innerHTML = `<svg viewBox="0 0 ${w} 34" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="rgba(205,222,255,0.18)" stroke-width="1.2"/></svg>`;

            const perSpan = 4;
            let n = 0;
            for (let i = 0; i < spans; i++) {
                for (let k = 1; k <= perSpan; k++) {
                    const t = k / (perSpan + 1);
                    const x0 = i * step;
                    const x = x0 + step * t;
                    // точка на квадратичной кривой: y = (1-t)²·top + 2(1-t)t·(top+2·sag) + t²·top
                    const y = top + 2 * (1 - t) * t * 2 * sag;
                    const bulb = document.createElement('span');
                    const color = COLORS[n % COLORS.length];
                    bulb.className = 'wi-bulb';
                    bulb.style.left = x + 'px';
                    bulb.style.top = y + 2 + 'px';
                    bulb.style.background = color;
                    bulb.style.boxShadow = `0 0 8px 2px ${color}55`;
                    bulb.style.animationDelay = (n % 7) * -0.45 + 's';
                    box.appendChild(bulb);
                    n++;
                }
            }
        }
        draw();
        let t;
        window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 150); });
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

    function spawnSpark(layer) {
        const s = document.createElement('span');
        s.className = 'wi-spark';
        s.style.left = rand(3, 97) + 'vw';
        s.style.top = rand(8, 70) + 'vh';
        layer.appendChild(s);
        setTimeout(() => s.remove(), 4000);
    }

    // Тихий салют из мягких разноцветных точек
    function burst(x, y) {
        for (let i = 0; i < 24; i++) {
            const p = document.createElement('span');
            p.className = 'wi-burst';
            const color = COLORS[i % COLORS.length];
            const angle = (Math.PI * 2 * i) / 24 + rand(-0.15, 0.15);
            const dist = rand(60, 140);
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.background = color;
            p.style.boxShadow = `0 0 8px ${color}`;
            p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 1800);
        }
    }

    function celebrate() {
        if (reduceMotion) return;
        for (let i = 0; i < 4; i++) {
            setTimeout(() => burst(rand(0.2, 0.8) * innerWidth, rand(0.15, 0.45) * innerHeight), i * 450);
        }
    }

    function init() {
        const bar = buildEventBar();
        if (festive) buildGarland(bar);

        const layer = document.createElement('div');
        layer.id = 'wi-layer';
        layer.innerHTML = '<div class="wi-frost"></div>';
        document.body.appendChild(layer);
        if (reduceMotion) return;

        for (let i = 0; i < 12; i++) setTimeout(() => spawnFlake(layer), i * 400);
        setInterval(() => spawnFlake(layer), 700);

        if (festive) {
            setInterval(() => spawnSpark(layer), 2200);
            // Первый визит в новом году — один раз салютуем
            if (Date.now() >= newYear) {
                const key = 'rbxhub-ny-' + nyYear;
                let seen = true;
                try { seen = localStorage.getItem(key) === '1'; localStorage.setItem(key, '1'); } catch (e) { /* приватный режим */ }
                if (!seen) setTimeout(celebrate, 600);
            }
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
