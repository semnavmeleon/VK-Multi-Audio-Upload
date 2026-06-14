# VK Multi Audio Upload

Chrome-расширение для ВКонтакте: массовая заливка MP3, авто-плейлисты с обложкой, скачивание треков и плейлистов (включая HLS с AES-128), поиск дубликатов и недоступных треков с боковой панелью-навигатором.

---

## Возможности

### Загрузка музыки
- **Массовый drag & drop** прямо в нативный диалог «Добавить аудиозапись». Перехват drop'ов работает через window-capture в `injector_early.js` — VK не успевает «увести» файлы в свой загрузчик.
- **Очередь с прогрессом**: pending / uploading / done / error, ретрай по одному или пачкой, копирование имён неудачных файлов в буфер.
- **Чтение ID3v2** прямо в браузере: TPE1/TPE2 (исполнитель), TIT2 (название), TALB (альбом), TYER/TDRC (год), а также APIC (встроенная обложка).
- **Авто-метаданные**: если в файле нет тегов исполнителя/названия, они вытягиваются из имени по шаблону `Исполнитель - Название.mp3` (поддержка `–`, `—`, удаление префиксов вида `01.`).
- **Патч ID3 «на лету»**: перед заливкой переписывает теги в файле (не трогая существующую ID3-секцию правильно — пересборка тега через syncsafe).

### Авто-плейлист
- После завершения очереди автоматически создаёт плейлист.
- Название по шаблону `Альбом (Год) Исполнитель`, описание — заглавие + подпись.
- Обложка:
  1. **Свой файл** из настроек (JPG/PNG 1000×1000) — приоритет.
  2. **Встроенная обложка из ID3 APIC** первого трека — включается отдельным тоглом «Обложка из ID3».
  3. Любой источник прогоняется через canvas-композитор `makePerezalitoCover` — поверх рисуется диагональный водяной знак «перезалито» (красный с тенью).
- Заливка обложки идёт через перехват клика на `.ape_cover` и подмену файла в VK-input, плюс автоподтверждение crop-диалога.

### Анализ плейлиста (поиск дубликатов и недоступных)
- Кнопка-«квадратики» (📋) в шапке попапа плейлиста.
- **Полное раскрытие плейлиста** — клик по «Показать все», затем инкрементальный скролл реального scroll-контейнера страницы (`scroll_fix_wrap.fixed`) до тех пор пока виртуализация не подгрузит все треки (до 60 проходов). Работает для плейлистов любого размера (>25, >100), после загрузки скролл возвращается на исходную позицию.
- **Дубликаты** ищутся по ключу `artist|||title` (lowercase, trimmed).
- **Недоступные** определяются по `entity.data.isBlocked === true` или `data.url === null` из React fiber (`markRowTrackData` в injected.js пометит каждую строку через `data-vmu-track`).
- **Подсветка строк**: янтарный градиент-акцент + пульс для дубликатов, красный — для недоступных, с приоритетом красного на пересечении.
- **Боковая панель `#vmu-issue-panel`**, приклеенная к правому краю попапа:
  - Левая колонка — компактная миникарта (16×240 px) с маркерами пропорционально позиции трека в плейлисте: красные = недоступные, янтарные = дубликаты. Клик по маркеру → плавный `scrollIntoView({block:'center'})` и краткая вспышка строки.
  - Правая колонка (только если есть недоступные) — заголовок «Недоступно: N · Дубл: M», кнопка **«Копировать»** в стиле нативного VK-overlay (белый фон + чёрный текст, при успехе зелёная), под ним прокручиваемый список треков, каждый кликабелен.
- Сама себя убирает при закрытии попапа (`MutationObserver`).

### Скачивание плейлистов
- Две кнопки в шапке попапа плейлиста: **«Треки»** (каждый трек отдельным файлом) и **«ZIP»** (всё в один архив).
- Также пара кнопок на странице музыки.
- Сбор треков идёт через ту же expand-логику + fiber-extraction + API-фоллбек (`load_section` через `al_audio.php` с пагинацией по 50).
- **Прямые URL** через `reload_audio` + деобфускация vk audio_api_unavailable (порт декодера yuru-yuri).
- **HLS-стримы**: парсер m3u8 + master-playlist (выбор stream с максимальным bitrate), AES-128 (стандартный IV или vk-формат `IV+ciphertext`), извлечение аудио из MPEG-TS контейнера (распознавание AAC/MP3 по stream_type, парс PAT→PMT→PES).
- **ZIP-сборщик** — встроенный, метод store (без сжатия — MP3/AAC уже сжаты), CRC32 через таблицу, без зависимостей.

### Скачивание отдельных треков
- Иконка ↓ на каждой строке (новый и старый VK, в попапе плейлиста и на странице музыки).
- В новом VK кнопка живёт внутри `[class*="buttonGroup"]` — нативной hover-панели, поэтому появляется/исчезает синхронно с VK-иконками (clipboard/dislike/AI/+/⋯).
- В старом VK — внутри `.audio_row__actions`, который VK создаёт на hover.
- Прогресс-тост с процентами для HLS-треков.

---

## Установка

1. Скачать/склонировать репозиторий.
2. Открыть `chrome://extensions/`.
3. Включить **Режим разработчика**.
4. **Загрузить распакованное расширение** → выбрать папку с проектом.
5. Обновить открытые вкладки vk.com.

---

## Настройки

Шестерёнка в шапке нативного диалога «Выберите аудиозапись на вашем компьютере»:

| Опция | По умолчанию | Что делает |
|---|---|---|
| **Авто-плейлист** | OFF | После очереди сам создаёт плейлист |
| **Обложка** | — | Базовая картинка (1000×1000), применяется ко всем создаваемым плейлистам |
| **Обложка из ID3** | OFF | Fallback: если своя обложка не выбрана, берёт встроенную APIC из первого трека |
| **Авто-метаданные** | OFF | Если в файле нет TPE1/TIT2, парсит их из имени файла и патчит ID3 перед заливкой |

Сохраняется в `localStorage[vmu_settings_v2]`.

---

## Использование

### Залить пачку MP3
1. Перейти на свою страницу музыки (`/audios{id}`) или страницу группы (`/audios-{id}`).
2. Нажать «Добавить аудиозапись» — VK-диалог автоматически перерисуется в нашу панель.
3. Перетащить файлы или нажать **«Выбрать файлы»**.
4. Треки уходят по очереди; готовые отмечаются ✓, упавшие можно повторить.

### Создать плейлист с одного захода
1. Включить **Авто-плейлист** в настройках.
2. (Опционально) задать обложку или включить «Обложка из ID3».
3. Залить пачку — после последнего трека VK сам откроет диалог создания, заполнит поля и сохранит. Обложка применится автоматически.

### Найти проблемные треки в плейлисте
1. Открыть попап плейлиста (по `?z=audio_playlist...`).
2. Нажать кнопку с иконкой 📋 в шапке.
3. Подождать пока подгрузятся все треки — слева появится миникарта, справа список недоступных.
4. Кликать по маркерам/строкам — попап скролится к нужному треку с подсветкой.
5. «Копировать» — список недоступных уходит в буфер для замены.

### Скачать плейлист
1. В попапе плейлиста — **Треки** или **ZIP**.
2. Прогресс-бар вверху попапа, кнопка «Остановить».

### Скачать один трек
- Навести на трек → клик по стрелке ↓.

---

## Структура файлов

```
├── manifest.json        — MV3 манифест, content_scripts на vk.com
├── background.js        — service worker, обработка chrome.downloads
├── injector_early.js    — drop-перехватчик, document_start
├── injected.js          — page-context: VK API, React fiber, HLS decrypt, ZIP, ID3
├── content.js           — isolated-world: UI, очередь, настройки, миникарта
└── style.css            — все стили (UI расширения и инжектированные кнопки)
```

### Поток данных
```
content.js  ──postMessage──▶  injected.js  ──fetch/XHR──▶  vk.com API
     ▲                              │
     │                              └── React fiber, HLS, AES-CBC, ZIP
     │
     └── DOM, settings, UI, очередь
```

`content.js` живёт в isolated world (нет доступа к `window.vk`, React fiber, перехвату fetch). Всё что требует page-context — пробрасывается через `pageCall(sendType, responseType, payload)` поверх `window.postMessage`.

---

## Технические особенности
- **Manifest V3**, без удалённого кода, единственное `host_permissions`: `https://vk.com/*`.
- **Перехват drag&drop** через window-capture при координатной проверке (drop попадает на нашу панель — глушим VK-обработчик).
- **Защита от закрытия попапа** при заливке: патчим `boxQueue._hide`, плюс на уровне инстанса каждой `.audio_add_box` мокаем `hide/_hide/destroy/setOptions/setButtons` пока флаг `__vmuBlockAudioBoxHide`.
- **Деобфускатор audio_api_unavailable** (op-chain v/r/s/i/x с XOR-вариантом). Без правильного `window.vk.id` ссылки не разворачиваются.
- **HLS**: master-playlist разбор, AES-CBC через WebCrypto, fallback на vk-IV (`IV+ciphertext`), извлечение AAC/MP3 из MPEG-TS payload PES.
- **ZIP** без зависимостей: store-метод, CRC32 таблица, syncsafe-размеры, central directory + EOCD.
- **Виртуализация**: сбор треков идёт через инкрементный скролл с MutationObserver на `vkitAudioRow__root`; после загрузки скролл-позиция восстанавливается.

---

## Совместимость
- Chromium-based браузеры (Chrome, Edge, Brave, Yandex, Opera).
- vk.com — десктоп. Мобильная версия `m.vk.com` не поддерживается.
- Manifest V3.

---

## English summary

**VK Multi Audio Upload** is a Chromium-only extension for vk.com that bolts a more capable music workflow onto VK's own UI.

**Uploading.** Drop a stack of MP3s onto VK's native audio dialog — the extension intercepts the drop, queues the files, and uploads them one by one. ID3v2 tags are parsed in-browser (text frames plus APIC cover art). Missing artist/title can be auto-filled from filenames (`Artist - Title.mp3`) and patched back into the file with a fresh ID3 header before upload.

**Auto-playlist.** When the queue finishes, the extension can drive VK's "create playlist" dialog automatically: it fills title/description from album tags, injects a cover (user-chosen or pulled from the first track's APIC frame), watermarks it with a diagonal "перезалито" stamp on a canvas, then auto-confirms the crop dialog and the save.

**Playlist analysis.** A button on the playlist popup expands the playlist fully — clicking "Показать все" and incrementally scrolling the page's actual scroll container so VK's virtualization mounts every row, regardless of size. It then detects duplicates (by `artist+title`) and unavailable tracks (read from `entity.data.isBlocked` via React fiber). A side panel docks to the right of the popup: a compact 16×240 px minimap with proportional markers (amber = duplicates, red = blocked) plus an optional scrollable list of blocked tracks with a copy-to-clipboard button styled like a native VK overlay button. Clicking a marker or list row smooth-scrolls the popup to that track and flashes it.

**Downloads.** Single tracks and whole playlists. Direct URLs are resolved through VK's `reload_audio` endpoint with a port of the `audio_api_unavailable` deobfuscator (op-chain over the user's vk id). HLS streams are downloaded segment-by-segment, decrypted with AES-128-CBC via WebCrypto (with a fallback to VK's `IV+ciphertext` layout), then unwrapped from the MPEG-TS container by parsing PAT → PMT → PES and extracting AAC/MP3 payloads. The ZIP mode bundles everything via a small built-in store-method ZIP writer (CRC32 table, syncsafe sizes, no dependencies).

**Architecture.** Two execution contexts: `content.js` in the isolated world (UI, queue, settings, side panel), `injected.js` in the page context (anything that needs `window.vk`, React fiber expandos, XHR/fetch interception, WebCrypto, ID3 reading). They talk via `window.postMessage` through a small `pageCall(sendType, responseType, payload)` request/response helper. Drop interception lives in `injector_early.js` at `document_start` so it beats VK's own listeners. `background.js` handles `chrome.downloads` for blob URLs from the page.

**Manifest V3**, single host permission (`https://vk.com/*`), no remote code, no dependencies.
