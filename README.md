# Little Royals (frontend)

Vue/Vite school desk. Production deploy is **Docker on a VPS** (no Railway / Vercel).

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

API in another terminal:

```bash
cd backend && cp .env.example .env && make run
```

## VPS deploy (Dockerized)

Requires Docker Engine + Compose v2 on the server.

```bash
cp .env.docker.example .env.docker
cp backend/.env.example backend/.env
# edit SCHOOL_DB_PASSWORD, JWT_SECRET, CORS_ORIGINS
./scripts/deploy-vps.sh
```

| Container | Role | Port |
|-----------|------|------|
| `web` | Vue desk (nginx) | `8080` |
| `api` | Go API | `18080` |
| `postgres` | Database | localhost only |
| `redis` | Cache / realtime | internal |

Useful commands:

```bash
docker compose --env-file .env.docker --env-file backend/.env ps
docker compose --env-file .env.docker --env-file backend/.env logs -f api
docker compose --env-file .env.docker --env-file backend/.env down
```

Optional TURN for video: `TURN=1 ./scripts/deploy-vps.sh`

Point a reverse proxy (Caddy / Nginx / Traefik) at `:8080` for HTTPS. The desk nginx already proxies `/api`, `/health`, and WebSocket `/api/v1/ws` to the API container when `VITE_API_BASE_URL=same-origin`.

## School cloud

**Dashboard → School cloud** (`/school-cloud`): Drive, Mail, Calendar, Contacts, Talk, Boards, Forms, Docs — native packages, no Nextcloud.
