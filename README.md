# Atomic ASOC — веб-клиент

SPA для платформы оркестрации уязвимостей **Atomic ASOC**: консоль пользователя, админ-панель и маркетинговый лендинг.

Backend (микросервисы, API, развёртывание) — репозиторий [`mephi_vkr_asoc`](https://github.com/tkhananiev/mephi_vkr_asoc).

## Стек

- React 19, TypeScript, Vite
- React Router
- Сборка статики → nginx (Docker)

## Разделы интерфейса

| URL | Назначение |
|-----|------------|
| `/` | Лендинг, вход и регистрация |
| `/app` | Дашборд пользователя |
| `/app/products` | Продукты (репозитории / цели сканирования) |
| `/app/integrations` | Каталог подключённых инструментов |
| `/app/scan/:scannerId` | Запуск сканирования (Semgrep, Gitleaks, SCA, DAST и др.) |
| `/app/groups` | Группы уязвимостей (открытые, false positive, принятый риск) |
| `/app/report` | Отчёт по уязвимостям |
| `/asoc-admin/*` | Админ-консоль: пользователи, каталог сканеров, health, справочники |

## Локальная разработка

**Требования:** Node.js 20+, запущенные сервисы backend на `127.0.0.1` (см. `deploy/compose.yaml` в `mephi_vkr_asoc`).

```bash
npm install
npm run dev
```

Приложение: `http://localhost:5173`.

Vite проксирует запросы к backend (порты заданы в `vite.config.ts`):

| Префикс | Сервис | Порт |
|---------|--------|------|
| `/auth/` | auth-service | 8091 |
| `/api/v1/scans`, `/groups`, `/report`, `/admin/` … | api-service | 8080 |
| `/api/v1/sync` | reference-data-service | 8081 |
| `/api/v1/findings` | processing-service | 8082 |
| `/api/v1/tickets` | jira-integration | 8083 |

Доступ с другой машины в сети: в консоли Vite указан URL **Network** (сервер слушает `0.0.0.0:5173`).

## Сборка

```bash
npm run build    # артефакт в dist/
npm run preview  # проверка production-сборки
npm run lint
```

## Docker-образ

```bash
docker build -t asoc/web:latest .
```

Образ: nginx + статика из `dist/`. Маршрутизация API и SPA — `nginx/default.conf` (прокси на сервисы кластера, fallback на `index.html` без долгого кэша HTML).

## Стенд

Production-сборка выкладывается в Kubernetes вместе с backend:

```bash
# из корня mephi_vkr_asoc
./deploy/scripts/rollout-stand.sh web
```

Подробности — `deploy/k8s/README.md` в репозитории backend.

Описание HTTP API: OpenAPI / Swagger на `api-service`.

## Структура репозитория

```
src/
  api/          клиент REST, типы DTO
  auth/         JWT, контекст сессии
  components/   общие UI-компоненты
  layout/       оболочки консоли и админки
  pages/        экраны по маршрутам
  lib/          справочники, утилиты
nginx/          конфиг для production-образа
public/         статика (иконки, watermark, лендинг)
```
