# Практические работы №4 и №4.1 — рефакторинг Cassiopeia

**Дисциплина:** оптимизация программного кода.  
**Вариант:** 1 (последняя цифра студенческого билета `0441`).  
**Исходный проект:** [GitVerse: stasnorman/he-path-of-the-samurai](https://gitverse.ru/stasnorman/he-path-of-the-samurai).  
**Результат:** [university-practices/practice-04-cassiopeia](https://github.com/hollowgxd/university-practices/tree/main/practice-04-cassiopeia).

В отдельной ветке [`practice-04-go-legacy`](https://github.com/hollowgxd/university-practices/tree/practice-04-go-legacy/practice-04-cassiopeia)
Pascal-модуль переписан на Go. Go-версия сохраняет исходный контракт: периодическую
генерацию CSV `recorded_at,voltage,temp,source_file` и импорт в таблицу
`telemetry_legacy` через `psql`, а Compose в этой ветке собирает и запускает уже
новый контейнер `pascal-legacy-go`.

## 1. Что было в исходнике

Cassiopeia — распределённый монолит из Rust-сервиса сбора космических данных,
Laravel-панели, PostgreSQL, Nginx и Pascal-утилиты. В исходном Rust `main.rs`
одновременно находились HTTP-маршруты, SQL, клиенты внешних API, фоновые циклы и
конфигурация. Laravel-контроллеры делали HTTP-запросы напрямую, а Pascal-программа
была запускаема только как одноразовый процесс. В Compose были значения секретов и
пароли по умолчанию.

## 2. Архитектура после рефакторинга

```text
practice-04-cassiopeia/
├── docker-compose.yml              # единая сборка db/rust/php/nginx/legacy
├── .env.example                    # только шаблон, секреты не коммитятся
├── db/init.sql                     # telemetry_legacy и совместимая схема
├── services/
│   ├── rust-iss/
│   │   ├── src/{config,domain,error,clients,repo,state,handlers,routes,jobs,main}.rs
│   │   ├── migrations/001_init.sql
│   │   ├── Cargo.toml / Cargo.lock
│   │   └── Dockerfile
│   ├── php-web/
│   │   ├── app/Services/{RustApiClient,SpaceDataService}.php
│   │   ├── app/Support/ApiResponse.php
│   │   └── laravel-patches/            # совместимые страницы/маршруты
│   └── pascal-legacy/
│       ├── legacy.pas
│       ├── Dockerfile
│       └── entrypoint.sh
├── diagrams/{architecture,request-flow,legacy-migration}.mmd
├── tests/acceptance.sh
└── evidence/                         # матрица, образец логов
```

| Модуль | Проблема | Решение | Паттерн | Эффект |
|---|---|---|---|---|
| Rust handlers | SQL и HTTP в endpoint-функциях | handlers вызывают только сервисы/repo | Layered architecture | тестируемые маршруты без БД-деталей |
| Rust repo | слепые INSERT и дубли | `ON CONFLICT(dataset_id) DO UPDATE` | Repository + Upsert | повторный OSDR sync идемпотентен |
| Rust clients | разные timeout/retry | единый `reqwest::Client` и backoff | Adapter / Retry | предсказуемый upstream-контракт |
| Rust jobs | наложение фоновых запусков | `pg_try_advisory_lock` на job key | Distributed lock | один запуск на кластер |
| PostgreSQL | нет явного времени/индексов | `TIMESTAMPTZ`, UTC, индексы source/time | Durable storage | корректное сравнение и быстрый latest |
| Laravel | HTTP-логика в контроллере | `RustApiClient` + `SpaceDataService` | Ports & Adapters | источник можно заменить без Blade |
| API errors | разные коды и статусы | `{ok,error{code,message,trace_id}}` и HTTP 200 | Error envelope | предсказуемый клиентский контракт |
| Pascal CLI | неявный lifecycle контейнера | entrypoint, период, stdout/stderr | Strangler Fig | постепенная замена без смены контракта |

## 3. Rust Axum + SQLx

`AppState` внедряет `Repositories`, `ExternalClients` и `Settings` через
`State<AppState>`. Роуты соответствуют исходным ручкам: `/health`, `/last`,
`/fetch`, `/iss/trend`, `/osdr/sync`, `/osdr/list`, `/space/:src/latest`,
`/space/refresh`, `/space/summary`. Хендлеры имеют форму `Result<Json<T>, ApiError>`
и не содержат SQL.

Слой `repo` отвечает за параметризованные SQL-запросы. Поля `fetched_at`,
`updated_at`, `inserted_at` хранятся в PostgreSQL как `TIMESTAMPTZ` и извлекаются
как `chrono::DateTime<Utc>`. `ON CONFLICT(dataset_id)` — это upsert по бизнес-ключу:
повторная синхронизация обновляет уже известный набор. Слепой `INSERT` создавал бы
дубликаты и ломал бы актуальность данных.

`ExternalClients` задаёт User-Agent, timeout из env, повторяет 408/429/5xx с
экспоненциальной задержкой и преобразует неуспешный upstream в `UPSTREAM_403`,
`UPSTREAM_429` или `UPSTREAM_UNAVAILABLE`. `ApiError::IntoResponse` всегда отдаёт
HTTP 200, а результат определяется полем `ok`:

```json
{"ok":false,"error":{"code":"UPSTREAM_403","message":"...","trace_id":"trace-..."}}
```

ISS-тренд использует Haversine и UTC-интервал между двумя последними записями.
Кэш витрины `space_cache` применяется к редко меняющимся APOD/NEO/DONKI/SpaceX;
частые запросы dashboard читают последнюю запись по индексу `(source, fetched_at)`.

## 4. Laravel и интерфейс

`RustApiClient` — адаптер внешнего HTTP-источника с retry/timeout и нормализацией
ошибок. `SpaceDataService` собирает ViewModel для dashboard. Blade получает уже
подготовленные данные: SQL и HTTP в представлениях отсутствуют. Вводимые параметры
для JWST ограничиваются allow-list и длиной/диапазоном; Laravel escaping и CSRF
middleware остаются включёнными. Этот подход позволяет заменить JWST на AstronomyAPI
реализацией другого адаптера, не меняя контроллер и Blade.

## 5. Pascal legacy и план замены

Исходный блок распознан как Pascal batch CLI: он генерирует CSV с контрактом
`recorded_at,voltage,temp,source_file` и импортирует его в `telemetry_legacy` через
`COPY`. Итоговый контейнер компилирует программу на этапе build, а `entrypoint.sh`
явно запускает её с `GEN_PERIOD_SEC`, пишет события в stdout, ошибки в stderr и
перезапускает по расписанию.

План Strangler Fig: (1) зафиксировать CSV/табличный контракт и acceptance-тест;
(2) написать эквивалентный малый CLI на Rust/Go/Python; (3) запускать оба процесса
в shadow-режиме и сравнивать хеш строк; (4) переключить Compose на новый CLI;
(5) удалить Pascal после периода наблюдения. Ни имя метода, ни формат данных не
меняются.

## 6. Compose и безопасность

Все образы собираются из `docker-compose.yml`: PostgreSQL, Rust, PHP-FPM, Nginx и
legacy. Пароли/API-ключи берутся из `.env`; в Git оставлен только `.env.example`.
SQLx использует bind-параметры, путь `/space/:src/latest` принимает только пять
разрешённых источников, OSDR upsert ограничен бизнес-ключом, а PHP-клиент не
показывает upstream body в ошибке. Production должен хранить `.env` в secret store,
не публиковать порт PostgreSQL и включать TLS на внешнем reverse proxy.

## 7. Проверка

Локально выполнено `cargo check` для Rust-сервиса на Rust 1.85; зависимости в
`Cargo.lock` зафиксированы на версиях, совместимых с этим toolchain. Добавлены
unit-тесты Haversine/RFC3339 и `tests/acceptance.sh` для всех совместимых endpoint.
Интеграционный `docker compose up --build` на текущем хосте не запускался: Docker
CLI/daemon отсутствует. Это явно отражено в [матрице приёмки](evidence/acceptance-matrix.md),
а образец формата логов помечен как образец, не как фактический запуск.
