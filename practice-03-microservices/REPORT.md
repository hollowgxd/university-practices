# Практическое занятие 3 — структурное улучшение кода микросервиса

**Дисциплина:** Оптимизация программного кода
**Вариант:** 1 — сервис платежей  
**Результат:** рефакторенный проект из `api_gateway`, `service_users`, `service_orders`, `service_payments`, PostgreSQL и Redis.

## 1. Что было в исходном проекте

Исходный проект сохранён в [`original/`](original/). Каждый компонент представлял собой один файл Express.js и хранил данные в обычном объекте памяти. Из-за этого:

- данные исчезали после перезапуска контейнеров;
- маршруты, бизнес-логика и хранилище были смешаны;
- отсутствовало разделение моделей, схем, сервисов и маршрутизаторов;
- не было отдельной базы данных, миграций и кэширования;
- API Gateway не умел маршрутизировать запросы к платежам.

## 2. Итоговая структура

```text
practice-03-microservices/
├── docker-compose.yml
├── api_gateway/
│   ├── Dockerfile
│   ├── package.json
│   └── app/
│       ├── index.js
│       ├── config.js
│       ├── cache.js
│       ├── routes.js
│       └── clients/circuit_breaker.js
├── service_users/
│   ├── Dockerfile
│   ├── package.json
│   └── app/
│       ├── index.js
│       ├── config.js
│       ├── database.js
│       ├── models.js
│       ├── schemas.js
│       ├── cache.js
│       ├── routes/users.js
│       ├── services/user_service.js
│       └── migrations/001_create_users.sql
├── service_orders/
│   └── ... аналогичная модульная структура
├── service_payments/
│   └── ... модели, схемы, routes, services и migrations
├── benchmark/ и tests/ в сервисах задания
├── postman/Microservices-Refactoring.postman_collection.json
└── REPORT.md
```

`REPORT.md` является основным документом практики; отдельный README внутри папки не добавлялся.

## 3. Дополнительный сервис платежей

Вариант 1 требует сервис платежей. Он размещён в [`service_payments/`](service_payments/).

### Бизнес-логика

1. Перед созданием платежа сервис обращается к `service_orders` и проверяет существование заказа.
2. Сумма передаётся в запросе; если её нет в расширенном вызове, допускается взять сумму заказа.
3. Имитация оплаты выбирает `completed` или `failed`. Вероятность отказа задаётся `PAYMENT_FAILURE_RATE` и по умолчанию равна `0.2`.
4. Платёж сохраняется в PostgreSQL с привязкой `order_id`.
5. Детальные запросы платежа кэшируются в Redis на `CACHE_TTL_SECONDS` секунд.

### Эндпоинты

| Метод | URL | Назначение |
|---|---|---|
| `POST` | `/payments` | Создать платёж; обязательны `order_id`, `amount` |
| `GET` | `/payments` | Получить список платежей |
| `GET` | `/payments/:id` | Получить платёж; ответ кэшируется |
| `PUT` | `/payments/:id` | Обновить платёж или его статус |
| `DELETE` | `/payments/:id` | Удалить платёж |
| `GET` | `/payments/health` | Health-check сервиса |
| `GET` | `/payments/status` | Статус сервиса |

Пример создания:

```http
POST http://localhost:8000/payments
Content-Type: application/json

{"order_id": 1, "amount": 19.99}
```

Пример ответа:

```json
{"id":1,"order_id":1,"amount":"19.99","status":"completed","provider_reference":null}
```

## 4. PostgreSQL и миграции

Используются отдельные базы данных и именованные Docker volumes:

- `db_users` → `users_db`, таблица `users`;
- `db_orders` → `orders_db`, таблица `orders`;
- `db_payments` → `payments_db`, таблица `payments`.

Сервисы используют Sequelize и PostgreSQL-драйвер `pg`. При старте `database.js` выполняет SQL-миграции из `app/migrations/`; миграции идемпотентны (`CREATE TABLE IF NOT EXISTS`).

Основные поля:

- `users(id, email, full_name, created_at, updated_at)`;
- `orders(id, user_id, product, amount, status, created_at, updated_at)`;
- `payments(id, order_id, amount, status, provider_reference, created_at, updated_at)`.

Связи между отдельными базами проверяются на уровне сервисов: orders проверяет пользователя через HTTP, payments проверяет заказ через HTTP. Это соответствует границам микросервисов и не создаёт межбазовый foreign key.

## 5. Redis и кэширование

Стратегия — Cache-Aside:

- `GET /users/:id` кэшируется в `service_users`;
- `GET /orders/:id` кэшируется в `service_orders`;
- `GET /payments/:id` кэшируется в `service_payments`;
- `GET /users/:id/details` кэшируется в API Gateway как агрегированный ответ.

При изменении или удалении сущности соответствующий ключ удаляется. TTL задаётся переменной `CACHE_TTL_SECONDS` и равен 300 секундам по умолчанию. Если Redis временно недоступен, сервисы продолжают работать с PostgreSQL без кэша и записывают ошибку в лог.

## 6. API Gateway и Circuit Breaker

`api_gateway` — единственная внешняя точка входа на порту `8000`. Он проксирует CRUD-запросы к Users, Orders и Payments. Для каждого сервиса используется отдельный `opossum` Circuit Breaker:

- timeout — 3 секунды;
- открытие после 50% ошибок;
- попытка восстановления через 3 секунды;
- fallback возвращает HTTP 503 и понятное сообщение о недоступности сервиса.

Маршрут `GET /users/:id/details` выполняет параллельную агрегацию пользователя и его заказов через `Promise.all`.

## 7. Postman и тестирование

Готовая коллекция: [`postman/Microservices-Refactoring.postman_collection.json`](postman/Microservices-Refactoring.postman_collection.json).

В коллекции есть папки Users, Orders, Payments, Aggregation and health и Cleanup. Покрыты:

- создание, получение, изменение и удаление пользователей;
- создание, получение, изменение и удаление заказов;
- создание, получение, изменение и удаление платежей;
- проверка HTTP-кодов и обязательных полей;
- проверка агрегированного ответа;
- проверка состояния Gateway и всех circuit breaker.

Порядок запуска: сначала Users → Orders → Payments → Aggregation and health; Cleanup запускается последним вручную.

## 8. Проверки, выполненные локально

- `node --check` пройден для всех JavaScript-файлов;
- встроенные тесты `node --test tests/domain.test.js`: 2 теста, 2 успешных;
- Postman JSON успешно разбирается стандартным `JSON.parse`;
- `docker-compose.yml` проверен YAML-парсером: 8 сервисов;
- `npm ci --ignore-scripts --no-audit --no-fund` выполнен для всех четырёх Node-проектов.

Docker Engine на рабочем хосте отсутствует (`docker: command not found`), поэтому фактический `docker compose up --build` здесь не запускался. На машине с Docker запуск выполняется из этой папки:

```bash
docker compose up --build
```

После запуска API Gateway доступен на `http://localhost:8000`, а коллекция Postman использует переменную `base_url=http://localhost:8000`.

## 9. Вывод

Монолитная структура исходного проекта разделена на независимые сервисы и слои. Данные теперь сохраняются в PostgreSQL, часто запрашиваемые записи кэшируются в Redis, Gateway имеет маршрутизацию платежей, агрегацию и Circuit Breaker, а CRUD и интеграция платежей покрыты Postman-коллекцией.
