# Календарь звонков


[![hexlet-check](https://github.com/Hyper-glitch/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Hyper-glitch/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Сценарий

Владелец календаря один и задан заранее, авторизации нет.

1. Владелец создаёт тип встречи: название, описание, длительность (например, «Знакомство», 30 минут).
2. Гость без регистрации открывает страницу записи и выбирает тип встречи из списка.
3. Гость видит календарь на ближайшие 14 дней со свободными слотами выбранной длительности.
4. Гость выбирает день и время, указывает имя и email, подтверждает запись.
5. Слот становится занятым для всех типов встреч: одно время нельзя забронировать дважды.
6. Владелец открывает список предстоящих встреч и видит новую запись.

Подробный разбор требований: [STEP-ONE-RESULT.md](STEP-ONE-RESULT.md).

## Стек

- Контракт: TypeSpec → OpenAPI → клиентский SDK (`@hey-api/openapi-ts`) и Pydantic-модели (`datamodel-code-generator`)
- Бекенд: Python 3.13, FastAPI, uv, ruff, mypy, pytest
- Фронтенд: TypeScript, React, Vite, Mantine, oxlint, prettier, vitest
- Окружение и задачи: mise, git-хуки: hk, CI: GitHub Actions

## Установка

Нужен только [mise](https://mise.jdx.dev/) — остальные инструменты он ставит сам в версиях из `mise.toml`.

```bash
git clone https://github.com/Hyper-glitch/ai-for-developers-project-386.git
cd ai-for-developers-project-386
mise trust
mise install   # инструменты + зависимости + git-хуки
```

## Использование

```bash
mise daemons start   # бекенд http://localhost:8000 (docs: /docs) и фронтенд http://localhost:5173
mise daemons stop
mise run check       # линтеры, проверка типов, тесты — то же, что в CI
mise run gen         # пересобрать OpenAPI и клиентов после правки typespec/main.tsp
```

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
