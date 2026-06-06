# Веб-клиент Atomic ASOC

Отдельный репозиторий от backend API. Стек: **React + TypeScript + Vite**. Запросы к `/api/v1/...` в dev проксируются на порты сервисов см. **`vite.config.ts`** (`8080` — api/scans, `8081` — sync, `8082`/`8083` — processing/jira).

**Страницы:** дашборд (`/app`), сканеры (`/app/scan/...`), группы (`/app/groups`), отчёт (`/app/report`).

## Запуск в разработке

Типично **backend из репозитория API и этот фронт на одном VPS** (SSH): перед dev поднимаете описание служб из каталога `deploy/` (в проекте API — **`deploy/compose.yaml`**), затем из **корня этого репозитория**:

```bash
npm install
npm run dev
```

После `npm run dev` — **Local** и **Network**. С ноута открывай **Network**: `http://<IP_VPS>:5173`. Прокси бьёт в `127.0.0.1` на том же VPS. Порт **5173** открой на файрволе при доступе извне.

## Сборка и контейнерный образ web

```bash
npm run build
```

Артефакт — каталог **`dist/`**. Образ с nginx:

```bash
docker build -t asoc/web:latest .
```

Конфиг reverse proxy для статики в полигоне: **`nginx/default.conf`**.

Backend API: README и развёртывание — `deploy/k8s/README.md` в репозитории `mephi_vkr_asoc`; описание HTTP API — OpenAPI и `/swagger` на `api-service`.
