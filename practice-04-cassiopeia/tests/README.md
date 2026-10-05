# Проверка

`acceptance.sh` проверяет совместимые с исходником ручки Rust-сервиса: health, ISS,
OSDR и space-cache. Для запуска нужен поднятый Compose-стенд и `curl`/`jq`:

```bash
cp .env.example .env
# заменить change-me и сгенерировать APP_KEY
docker compose up --build -d
./tests/acceptance.sh
```

Во время проверки каждый endpoint должен отвечать HTTP 200. При ошибке тело
содержит единый envelope `ok=false` с `code`, `message`, `trace_id`.
