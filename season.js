/* ===== RBXHub — выбор сезонной темы =====
   По дате: хеллоуин 1 окт – 2 нояб, осень сентябрь и 3–30 нояб, зима 1 дек – конец февраля.
   Превью только в своём браузере: ?theme=winter (или autumn, halloween, none), выход — ?theme=auto.
   Подключается в <head> раньше halloween.js / autumn.js / winter.js. */
(function () {
    var KEY = 'rbxhub-theme-preview';
    var THEMES = ['halloween', 'autumn', 'winter', 'none'];

    function byDate(d) {
        var m = d.getMonth(), day = d.getDate();
        if (m === 9 || (m === 10 && day <= 2)) return 'halloween';
        if (m === 8 || m === 10) return 'autumn';
        if (m === 11 || m <= 1) return 'winter';
        return 'none';
    }

    var preview = null;
    try {
        var param = new URLSearchParams(location.search).get('theme');
        if (param === 'auto') localStorage.removeItem(KEY);
        else if (THEMES.indexOf(param) !== -1) localStorage.setItem(KEY, param);
        preview = localStorage.getItem(KEY);
        if (THEMES.indexOf(preview) === -1) preview = null;
    } catch (e) { /* без localStorage — только по дате */ }

    window.RBX_SEASON = preview || byDate(new Date());
    window.RBX_SEASON_PREVIEW = !!preview;
    window.RBX_SEASON_BY_DATE = byDate;

    // Тема по дате сменилась, пока страница открыта (например, в полночь 1 декабря) — перезагружаем
    if (!preview) {
        var now = new Date();
        var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        setTimeout(function check() {
            if (byDate(new Date()) !== window.RBX_SEASON) location.reload();
            else setTimeout(check, 864e5);
        }, midnight - now + 1000);
    }

    // Плашка «Превью», видна только тому, кто включил превью
    if (preview) {
        document.addEventListener('DOMContentLoaded', function () {
            var tag = document.createElement('a');
            tag.href = '?theme=auto';
            tag.textContent = 'Preview: ' + preview + ' · exit';
            tag.setAttribute('style', 'position:fixed;left:12px;bottom:12px;z-index:10000;padding:6px 12px;border-radius:999px;' +
                'background:rgba(20,20,24,.85);color:#fff;font:600 12px/1.2 system-ui,sans-serif;text-decoration:none;' +
                'border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(6px)');
            document.body.appendChild(tag);
        });
    }
})();
