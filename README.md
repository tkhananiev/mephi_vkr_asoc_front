# Веб-клиент ASOC (`mephi_vkr_asoc_front`)

Отдельный репозиторий от backend (**`mephi_vkr_asoc`**). Стек: **React + TypeScript + Vite**. Запросы к `/api/v1/...` в dev проксируются на порты сервисов см. **`vite.config.ts`** (`8080` — api/scans, `8081` — sync, `8082`/`8083` — processing/jira).

**Страницы:** дашборд (`/`), Semgrep (`/scan`), синхрон справочников (`/reference`), группы (`/groups`).

## Запуск в разработке

Типично **compose и этот фронт на одном VPS** (SSH): сначала backend из `mephi_vkr_asoc/deploy/docker-compose.yml`, затем из **корня этого репозитория**:

```bash
npm install
npm run dev
```

После `npm run dev` — **Local** и **Network**. С ноута открывай **Network**: `http://<IP_VPS>:5173`. Прокси бьёт в `127.0.0.1` на том же VPS. Порт **5173** открой на файрволе при доступе извне.

## Сборка и Docker

```bash
npm run build
```

Артефакт — каталог **`dist/`**. Образ с nginx:

```bash
docker build -t asoc/web:latest .
```

Конфиг reverse proxy для K8s: **`nginx/default.conf`**.

Архитектура backend: [`../mephi_vkr_asoc/docs/ARCHITECTURE.md`](../mephi_vkr_asoc/docs/ARCHITECTURE.md) (путь рядом, если оба репозитория лежат в одной родительской папке).
