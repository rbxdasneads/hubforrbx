/* Скрипт страниц /games: копирование и избранное (хранится только в этом браузере) */
(function () {
    var KEY = 'rbxhub-favorites';

    function load() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
    }
    function save(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* приватный режим */ }
    }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function syncStars() {
        var ids = load().map(function (f) { return f.id; });
        document.querySelectorAll('.btn-fav').forEach(function (btn) {
            var data = JSON.parse(btn.dataset.fav);
            var on = ids.indexOf(data.id) !== -1;
            btn.textContent = on ? '★' : '☆';
            btn.classList.toggle('on', on);
        });
    }

    function copy(btn) {
        var code = document.getElementById(btn.dataset.target);
        if (!code || !navigator.clipboard) return;
        navigator.clipboard.writeText(code.textContent).then(function () {
            var original = btn.textContent;
            btn.textContent = btn.dataset.copied || '✓ Copied';
            btn.classList.add('copied');
            setTimeout(function () { btn.textContent = original; btn.classList.remove('copied'); }, 2000);
        });
    }

    function toggleFav(btn) {
        var data = JSON.parse(btn.dataset.fav);
        var list = load();
        var idx = list.findIndex(function (f) { return f.id === data.id; });
        if (idx === -1) list.unshift(data); else list.splice(idx, 1);
        save(list);
        syncStars();
        if (document.getElementById('fav-list')) renderFavorites();
    }

    function renderFavorites() {
        var box = document.getElementById('fav-list');
        var list = load();
        document.getElementById('fav-empty').hidden = list.length > 0;
        box.innerHTML = list.map(function (f, i) {
            return '<article class="glass-card">' +
                '<div class="card-top">' +
                    '<div class="card-thumb-wrapper"><img src="' + esc(f.i || '/favicon-v2.png') + '" alt="" loading="lazy" width="50" height="50" onerror="this.onerror=null;this.src=\'/favicon-v2.png\'"></div>' +
                    '<div class="card-head"><h3 title="' + esc(f.t) + '">' + esc(f.t) + '</h3>' +
                    '<div class="badges">' + (f.g ? '<span class="badge badge-gray">' + esc(f.g) + '</span>' : '') + '</div></div>' +
                    '<button type="button" class="btn-fav on" title="Remove from favorites" data-fav="' + esc(JSON.stringify(f)) + '">★</button>' +
                '</div>' +
                '<pre class="code"><code id="fav-code-' + i + '">' + esc(f.c) + '</code></pre>' +
                '<div class="card-meta"><span></span>' + (f.s ? '<a href="https://scriptblox.com/script/' + esc(f.s) + '" rel="nofollow noopener" target="_blank">Source</a>' : '') + '</div>' +
                '<button type="button" class="btn-copy" data-target="fav-code-' + i + '">Copy Script</button>' +
            '</article>';
        }).join('');
    }

    document.addEventListener('click', function (e) {
        var copyBtn = e.target.closest('.btn-copy');
        if (copyBtn) return copy(copyBtn);
        var favBtn = e.target.closest('.btn-fav');
        if (favBtn) toggleFav(favBtn);
    });

    function init() {
        if (document.getElementById('fav-list')) renderFavorites();
        syncStars();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
