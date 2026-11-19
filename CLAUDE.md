# RBXHub (rbxhub.org)

Статичный сайт на Vercel (`vercel.json`: cleanUrls — ссылки без `.html`). Сборщика нет, HTML правится руками.

## Структура
- Корень: `index.html` (экзекьюторы и тулзы), `scripts.html` (живой поиск через ScriptBlox API в браузере), страницы загрузки (`solara.html`, `xeno.html`, …), `legal.html`, `404.html`.
- `output.css` — скомпилированный Tailwind (`input.css`); у каждой страницы ещё свой `<style>` в head.
- Сезонные темы: `season.js` выбирает активную по дате (хеллоуин 1 окт – 2 нояб, осень сент и 3–30 нояб, зима 1 дек – фев, иначе без темы) и ставит `window.RBX_SEASON`; `halloween.*`, `autumn.*`, `winter.*` подключены на всех страницах, неактивные снимают свой CSS сами. Превью только в своём браузере: `?theme=winter|autumn|halloween|none`, выход `?theme=auto`. Зима с 1 дек по 10 янв в праздничном режиме (`html.wi-festive`): гирлянда, отсчёт до Нового года, салют в полночь и при первом визите в новом году.
- `/_vercel/insights/script.js` — Vercel Web Analytics (включается в дашборде Vercel).

## Страницы игр (генерируются — руками не править)
- `tools/build-game-pages.mjs` + `tools/games.json` (список игр и описания на en/pt/es).
- Выход: `games/*.html`, `pt/games/`, `es/games/`, `games/trending.html`, `games/feed.xml`, `games/data/seen.json`, `sitemap.xml`.
- Статичные файлы рядом: `games/games.css`, `games/games.js` (копирование + избранное в localStorage).
- Запуск: `node tools/build-game-pages.mjs` (~2 мин). GitHub Action `.github/workflows/update-game-pages.yml` гоняет его ежедневно и коммитит; секрет `DISCORD_WEBHOOK_URL` (необязательный) включает посты о новых скриптах.
- Новая игра = новая запись в `tools/games.json`.

## Локальный просмотр
`.claude/launch.json` → python http.server на 8123. Он не понимает clean URLs — открывать страницы с `.html`.

## Git
`git` не в PATH; бандл GitHub Desktop: `%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`. Remotes: `origin` = RobloxHubRBX/hubforrbx, `upstream` = rbxdasneads/hubforrbx.
