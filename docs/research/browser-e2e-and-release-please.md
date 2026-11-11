# Браузерный сценарий (Playwright) и release-please под наш стек

Исследование к задаче [#13](https://github.com/Hyper-glitch/ai-for-developers-project-386/issues/13). Дата: 2026-11-11.

Состояние репозитория на момент исследования: бекенд слушает `127.0.0.1:8000`, фронтенд — `127.0.0.1:5173` (`strictPort`), CORS бекенда разрешает только `http://localhost:5173` и `http://127.0.0.1:5173`, адрес API фронтенд берёт из `VITE_API_URL` (по умолчанию `http://localhost:8000`). Данные бекенда хранятся в памяти процесса. Тегов и релизов в репозитории нет; версии в манифестах — `0.1.0` (`backend/pyproject.toml`) и `0.0.0` (`frontend/package.json`).

Пометки в тексте:

- **[док]** — утверждение взято из официальной документации или исходного кода, ссылка рядом.
- **[проверено]** — проверено командой в этом репозитории.
- **[не проверено]** — моя сборка из задокументированных частей; целиком не запускалась. Все примеры конфигурации ниже относятся к этой категории: Playwright и release-please в репозитории не ставились.

## Краткие рекомендации

1. **Playwright.** Отдельный пакет `e2e/` в корне (как `typespec/`), `@playwright/test` 1.65.0, только Chromium. Оба сервера поднимает сам Playwright через массив `webServer`, на отдельных портах (8100 и 5273) и с `reuseExistingServer: false`. Каждый прогон получает новый процесс бекенда, то есть пустую память; отдельная ручка сброса не нужна. Задача `test:e2e` добавляется последним шагом в `mise run check`, поэтому CI и pre-push хук запускают её без правок workflow, кроме установки системных библиотек браузера.
2. **release-please.** Одна версия на репозиторий: пакет `"."` с `release-type: "simple"` (файлы `version.txt` и `CHANGELOG.md` в корне), тег `vX.Y.Z`. Версии в `pyproject.toml` и `package.json` не трогать: пакеты никуда не публикуются, а правка версии в `pyproject.toml` без пересборки `uv.lock` ломает `uv sync --locked`. Workflow `googleapis/release-please-action@v5` на push в `main` с правами `contents`, `issues`, `pull-requests: write`. Для начала хватит `GITHUB_TOKEN`, но тогда `ci` на релизном PR сам не запустится.

## 1. Браузерный сценарий на Playwright

### 1.1. Где лежит и что ставится

Рекомендация: каталог `e2e/` в корне со своим `package.json` и `package-lock.json`.

- В репозитории уже есть такой образец: `typespec/` — отдельный npm-пакет со своей задачей `install:typespec`.
- Если положить сценарии во `frontend/`, их подхватит vitest: его шаблон по умолчанию включает и `*.test.*`, и `*.spec.*`. Пришлось бы настраивать исключения. **[не проверено]** — шаблон vitest по документации в этом исследовании не сверялся.
- Версия `@playwright/test` на 2026-11-11 — 1.65.0 **[проверено]** (`npm view @playwright/test version`). Закрепить точную версию: каждой версии Playwright нужны свои сборки браузеров, после обновления пакета установку браузеров надо повторять **[док]** ([Browsers](https://playwright.dev/docs/browsers)).

### 1.2. Как поднимать оба сервера

Playwright сам запускает серверы перед тестами и останавливает после: опция `webServer` принимает массив **[док]** ([Web server](https://playwright.dev/docs/test-webserver)). Что важно из документации:

- `url` — сервер считается готовым, когда отвечает кодом 2xx, 3xx, 400, 401, 402 или 403. `port` объявлен устаревшим в пользу `url`.
- `reuseExistingServer` — при `true` использует уже запущенный сервер на этом адресе; при `false` прогон падает, если адрес занят.
- `cwd` — по умолчанию каталог конфига; `env` — по умолчанию окружение процесса плюс `PLAYWRIGHT_TEST=1`; `timeout` — 60 000 мс.
- `stdout` по умолчанию `ignore`, `stderr` — `pipe`.
- `gracefulShutdown` — по умолчанию группе процессов шлётся `SIGKILL`.

Развилка — на каких портах поднимать серверы.

| | А. Отдельные порты 8100 / 5273 (рекомендую) | Б. Рабочие порты 8000 / 5173 |
|---|---|---|
| Запущены `mise daemons` | Прогон не мешает и не зависит от них | При `reuseExistingServer: false` прогон падает; при `true` тест идёт по бекенду с данными от ручной работы |
| Правки приложения | Одна: список разрешённых origin в CORS читать из переменной окружения | Не нужны |
| Чистота данных | Всегда новый процесс | Только если серверы разработки остановлены |

Вариант Б проще, но pre-push хук запускает `mise run check`, а `AGENTS.md` предлагает держать серверы в фоне через `mise daemons start`. Значит, пуш при запущенных серверах — обычная ситуация, и в варианте Б она либо падает, либо проверяет грязные данные. Поэтому рекомендую А.

Пример `e2e/playwright.config.ts` **[не проверено]**:

```ts
import { defineConfig, devices } from '@playwright/test';

const API_URL = 'http://127.0.0.1:8100';
const WEB_URL = 'http://127.0.0.1:5273';

export default defineConfig({
  testDir: './tests',
  // Один бекенд с общей памятью: тесты идут по очереди.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'api',
      // `fastapi run` — без автоперезагрузки, в отличие от `fastapi dev`.
      command: 'uv run fastapi run --host 127.0.0.1 --port 8100',
      cwd: '../backend',
      url: `${API_URL}/health`,
      env: { CORS_ORIGINS: WEB_URL }, // переменной пока нет, см. оговорки
      reuseExistingServer: false,
    },
    {
      name: 'web',
      command: 'npm run dev -- --port 5273 --strictPort',
      cwd: '../frontend',
      url: WEB_URL,
      env: { VITE_API_URL: API_URL },
      reuseExistingServer: false,
    },
  ],
});
```

Оговорки к примеру:

- `CORS_ORIGINS` — условное имя. Сейчас список origin зашит в `backend/app/main.py`; чтение из окружения — правка кода приложения, её делает тикет реализации. Без неё браузер заблокирует запросы со страницы на порту 5273.
- Адреса везде заданы как `127.0.0.1`, а не `localhost`: Vite привязан к IPv4 явно (см. комментарий в `frontend/vite.config.ts`), а `localhost` на части систем разрешается в `::1`.
- Фронтенд запускается сервером разработки Vite. Вариант со сборкой (`npm run build` и `vite preview`) ближе к боевому, но медленнее на старте; для одного сценария не нужен.
- Рекомендация `workers: 1` на CI есть в документации Playwright **[док]** ([CI](https://playwright.dev/docs/ci)); здесь она нужна и локально, из-за общей памяти бекенда.

### 1.3. Как ставить браузеры

**[док]** ([Browsers](https://playwright.dev/docs/browsers), [CI](https://playwright.dev/docs/ci)):

- `npx playwright install chromium` — скачать только Chromium. Кеш: `~/Library/Caches/ms-playwright` (macOS), `~/.cache/ms-playwright` (Linux).
- `npx playwright install --with-deps chromium` — то же плюс системные библиотеки Linux. Нужно на CI; локально на Linux требует прав на установку пакетов.
- `--only-shell` — ставить только headless-сборку Chromium, без полной. Меньше скачивать, но не работают режимы с окном (`--headed`, `--ui`).
- Кешировать браузеры в CI документация не советует: восстановление кеша занимает примерно столько же, сколько скачивание, а системные библиотеки Linux не кешируются.

`jdx/mise-action` кеширует только каталог данных mise (`~/.local/share/mise`) **[док]** ([README mise-action](https://github.com/jdx/mise-action)), браузеры Playwright в него не попадают, и это согласуется с советом выше.

### 1.4. Встраивание в `mise run check` и CI

Добавки в `mise.toml` **[не проверено]**:

```toml
[tasks."install:e2e"]
description = "Install Playwright and its Chromium build"
dir = "e2e"
# На CI (CI=true) добавляются системные библиотеки Linux.
run = ["npm ci", "npx playwright install ${CI:+--with-deps} chromium"]

[tasks.install]
depends = ["install:backend", "install:frontend", "install:typespec", "install:e2e", "install:hooks"]

[tasks."test:e2e"]
description = "Run the browser scenario against real backend and frontend"
dir = "e2e"
run = "npx playwright test"

[tasks.check]
depends = ["gen:verify"]
run = [{ task = "lint" }, { task = "typecheck" }, { task = "test" }, { task = "test:e2e" }]
```

- Запись `run = [{ task = "..." }]` выполняет шаги по порядку и останавливается на первом упавшем **[док]** ([mise: task configuration](https://mise.jdx.dev/tasks/task-configuration.html)). `test:e2e` стоит последним и отдельно от `test`: задачи из `depends` идут параллельно, а браузерному прогону лучше не делить машину с pytest и vitest.
- `${CI:+--with-deps}` — подстановка оболочки: флаг появляется, только если переменная `CI` задана. GitHub Actions задаёт `CI=true`.
- `.github/workflows/ci.yml` менять почти не нужно: он уже запускает `mise run install` и `mise run check`. Стоит добавить выгрузку отчёта при падении:

```yaml
      - run: mise run check
      - uses: actions/upload-artifact@v7
        if: ${{ failure() }}
        with:
          name: playwright-report
          path: e2e/playwright-report/
          retention-days: 7
```

  `actions/upload-artifact` на 2026-11-11 — v7.0.2 **[проверено]** (`gh api repos/actions/upload-artifact/releases/latest`). В примере из документации Playwright стоит v5 и условие `!cancelled()` ([CI GitHub Actions](https://playwright.dev/docs/ci-intro)).

- В `.gitignore` добавить `e2e/node_modules/`, `e2e/playwright-report/`, `e2e/test-results/`.

Цена решения: `mise run check` и pre-push станут дольше на время старта двух серверов и браузера, а первый `mise install` скачает Chromium. Если это начнёт мешать, запасной вариант — убрать `test:e2e` из `check` и вызывать отдельным шагом только в CI; тогда локально сценарий запускается вручную.

Текущий `timeout-minutes: 15` в `ci.yml` менять не предлагаю; сколько займёт прогон с браузером, станет видно после первого запуска.

### 1.5. Сброс данных в памяти

- **Между прогонами.** `reuseExistingServer: false` и отдельные порты дают новый процесс бекенда на каждый `playwright test`. Память пустая без дополнительного кода.
- **Между тестами одного прогона.** Процесс один, данные накапливаются. Пока сценарий один (каталог → слот → бронирование), сбрасывать нечего. Когда тестов станет несколько, варианты такие:
  1. Тесты не зависят от чужих данных: каждый берёт свой тип встречи или свой слот. Кода приложения не требует. Рекомендую начать с этого.
  2. Тестовая ручка сброса, включаемая переменной окружения. Она окажется вне контракта `typespec/main.tsp`, что спорит с правилом «контракт — единственный источник правды». Заводить только если вариант 1 перестанет хватать.
  3. Подготовка данных через проект-зависимость (`projects` с `dependencies`) — рекомендуемый в документации способ общей подготовки, в отличие от `globalSetup` он попадает в отчёт и трассировку **[док]** ([Global setup and teardown](https://playwright.dev/docs/test-global-setup-teardown)). Сам по себе память бекенда не чистит, но годится, чтобы через API создать исходные данные.
- **Время.** Слоты зависят от текущего времени сервера. Сценарий должен выбирать первый свободный слот со страницы, а не дату, зашитую в тест. Подмена часов Playwright действует только в браузере, на бекенд не влияет.
- **Стартовые данные.** В карте (#4) открыт вопрос, есть ли предзаданные типы встреч при запуске. Если нет, сценарию нужно сначала создать тип встречи — через интерфейс владельца или запросом к API.

## 2. release-please

### 2.1. Одна версия или по пакету

Рекомендация: одна версия на репозиторий.

- Бекенд и фронтенд связаны одним контрактом и выкатываются вместе; ни один пакет не публикуется (`private: true` во фронтенде, `package = false` в `[tool.uv]` бекенда). Раздельные версии отвечали бы на вопрос, которого никто не задаёт.
- Раздельные версии возможны: два пакета в конфиге (`backend` с `release-type: python`, `frontend` с `node`), теги вида `<component>-v<version>`, по умолчанию один общий релизный PR, с `separate-pull-requests: true` — по PR на пакет **[док]** ([Manifest releaser](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)). Плагин `linked-versions` умеет держать версии группы равными, но это уже сложнее, чем один пакет в корне.
- Путь `"."` — особый случай: релиз создаётся при любых изменениях в репозитории **[док]** (там же).

### 2.2. Какой `release-type`

Рекомендация: `simple`.

| Тип | Что обновляет | Подходит ли |
|---|---|---|
| `simple` | `version.txt` и `CHANGELOG.md` | Да: не зависит от языка, файлы лежат в корне |
| `python` | `CHANGELOG.md`, `setup.py`, `setup.cfg`, `pyproject.toml` (если есть таблица `project`), `<пакет>/__init__.py`, найденные `version.py` | Нет для корня: `pyproject.toml` лежит в `backend/`. И не обновляет `uv.lock` |
| `node` | `package.json`, `package-lock.json`, `CHANGELOG.md` | Нет для корня: в корне нет `package.json` |

Источники: таблица типов в [customizing.md](https://github.com/googleapis/release-please/blob/main/docs/customizing.md); исходники стратегий [python.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/python.ts), [node.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/node.ts), [simple.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/simple.ts).

Почему не синхронизировать версию в `pyproject.toml`: в `uv.lock` записана версия самого проекта (`name = "booking-backend"`, `version = "0.1.0"`). Я поменял версию в копии `backend/pyproject.toml` на `0.2.0` и запустил `uv sync --locked --dry-run` — команда упала с «The lockfile at `uv.lock` needs to be updated» **[проверено]**. `mise run install` вызывает именно `uv sync --locked`, то есть релизный PR, тронувший только `pyproject.toml`, сломал бы CI. В коде стратегии `python` упоминаний `uv.lock` нет **[док]** (python.ts).

Если версия в манифестах всё же понадобится (например, показывать её в `/health`), путь такой: `extra-files` с типами `toml` и `json` и адресом поля через `jsonpath` **[док]** (customizing.md, раздел «Updating arbitrary files»). Пути в `extra-files` считаются от каталога пакета; для пакета `"."` — от корня (метод `addPath` в [base.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/base.ts)). Для `backend/pyproject.toml` это `$.project.version`; для `backend/uv.lock` нужен `jsonpath` с фильтром по имени пакета, и такой вариант я **не проверял**.

### 2.3. Файлы конфигурации

`release-please-config.json` в корне **[не проверено]**:

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "simple",
  "bump-minor-pre-major": true,
  "include-component-in-tag": false,
  "packages": {
    ".": {}
  }
}
```

`.release-please-manifest.json` в корне:

```json
{
  ".": "0.1.0"
}
```

- Оба файла должны лежать в основной ветке; манифест хранит текущую версию каждого пакета, release-please сам переписывает его в релизном PR **[док]** (manifest-releaser.md).
- Запись в манифесте — способ задать исходную версию: следующая считается от неё по коммитам **[док]** (там же). С `"0.1.0"` и коммитами `feat:` первый релиз будет `0.2.0`. Если первым релизом нужен именно `0.1.0`, оставить манифест пустым (`{}`) и задать `initial-version` — ключ есть в [схеме конфига](https://github.com/googleapis/release-please/blob/main/schemas/config.json), но в документации не описан, поведение **не проверено**.
- `bump-minor-pre-major: true` — пока версия ниже 1.0.0, ломающее изменение поднимает минорную версию, а не мажорную **[док]** (там же).
- `include-component-in-tag: false` — тег `v0.2.0` вместо `<component>-v0.2.0` **[док]** (там же).
- `bootstrap-sha` (полный SHA в корне конфига) ограничивает историю для первого списка изменений; после первого слитого релизного PR игнорируется **[док]** (там же). Нужен, только если не хочется видеть в первом `CHANGELOG.md` все коммиты с начала проекта.
- В корне появятся `version.txt` и `CHANGELOG.md`; создаёт их сам release-please в релизном PR (`CHANGELOG.md` — точно, `createIfMissing: true` в simple.ts; `version.txt` надёжнее закоммитить заранее с содержимым `0.1.0`).

Conventional Commits уже проверяются commit-msg хуком hk, так что входные данные для release-please есть. На версию влияют `feat:` (минорная), `fix:` (патч) и ломающие изменения; `chore:`, `docs:`, `test:`, `ci:`, `refactor:` сами релиз не вызывают. При squash-слиянии PR значение имеет заголовок итогового коммита, а хук его не проверяет: он работает только локально.

### 2.4. Workflow, права и токен

`.github/workflows/release-please.yml` **[не проверено]**:

```yaml
name: release-please

on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

- Версия action на 2026-11-11 — v5.0.0 **[проверено]** (`gh api repos/googleapis/release-please-action/releases/latest`). В README ветки `main` примеры пока написаны с `@v4`.
- Набор прав (`contents`, `issues`, `pull-requests` на запись) — из README action **[док]** ([release-please-action](https://github.com/googleapis/release-please-action)).
- `release-type` во входах action не задаётся: без него action работает по файлам конфига и манифеста. Начиная с v4 расширенные настройки живут только в конфиге **[док]** (там же). Входы `config-file` и `manifest-file` нужны, только если файлы лежат не в корне.
- В настройках репозитория (Settings → Actions → General) может понадобиться включить «Allow GitHub Actions to create and approve pull requests» **[док]** (там же).
- Как это работает: на каждый push в `main` action создаёт или обновляет релизный PR с новой версией и списком изменений. Слияние этого PR — и есть релиз: следующий запуск ставит тег и создаёт GitHub Release.

Ограничение `GITHUB_TOKEN`: события, вызванные этим токеном, не запускают новые workflow (кроме `workflow_dispatch` и `repository_dispatch`); по документации GitHub, запуски для PR, созданного таким токеном, ждут ручного одобрения пользователем с правом записи **[док]** ([GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token), README action). Для нас это значит: `ci` на релизном PR сам не пройдёт. Варианты:

1. Оставить `GITHUB_TOKEN`. Релизный PR меняет только `version.txt`, `CHANGELOG.md` и манифест, код не трогает; запуск `ci` при необходимости одобряется вручную в интерфейсе PR. Достаточно, пока на `main` нет обязательных проверок. Рекомендую начать с этого.
2. Fine-grained personal access token (права на этот репозиторий: Contents и Pull requests — запись) в секрете, например `RELEASE_PLEASE_TOKEN`, и `token: ${{ secrets.RELEASE_PLEASE_TOKEN }}`. Нужен, если проверка `ci` станет обязательной для слияния или если на создание релиза будет завязан другой workflow (деплой). Точный минимальный набор прав токена **не проверен**.
3. Токен GitHub App — то же, что вариант 2, без привязки к личной учётной записи; для учебного проекта избыточно.

`.github/workflows/hexlet-check.yml` это не затрагивает: новый workflow лежит в отдельном файле.

## Что осталось непроверенным

- Все примеры конфигурации: ни Playwright, ни release-please в репозитории не запускались.
- Что vitest по умолчанию подхватывает `*.spec.ts` (довод в пользу отдельного `e2e/`).
- Что флаги `--port` и `--strictPort` в командной строке Vite перекрывают значения из `vite.config.ts`.
- Поведение `initial-version` и `jsonpath` с фильтром для `uv.lock`.
- Минимальные права fine-grained токена для release-please.
- Время прогона `mise run check` с браузерным шагом.

## Источники

- Playwright: [Web server](https://playwright.dev/docs/test-webserver), [Browsers](https://playwright.dev/docs/browsers), [Continuous Integration](https://playwright.dev/docs/ci), [Setting up CI](https://playwright.dev/docs/ci-intro), [Global setup and teardown](https://playwright.dev/docs/test-global-setup-teardown).
- release-please: [manifest-releaser.md](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md), [customizing.md](https://github.com/googleapis/release-please/blob/main/docs/customizing.md), [schemas/config.json](https://github.com/googleapis/release-please/blob/main/schemas/config.json), исходники [python.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/python.ts), [node.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/node.ts), [simple.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/simple.ts), [base.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/base.ts).
- release-please-action: [README](https://github.com/googleapis/release-please-action), [action.yml](https://github.com/googleapis/release-please-action/blob/main/action.yml).
- GitHub: [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token).
- mise: [Task configuration](https://mise.jdx.dev/tasks/task-configuration.html), [mise-action README](https://github.com/jdx/mise-action).
- uv: поведение `uv sync --locked` при изменённой версии проекта проверено локально на uv 0.13.7.
