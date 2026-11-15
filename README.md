# Little Royals (frontend)

Vue/Vite school desk UI. Talks to the Go API by default (`VITE_USE_API=true`). If the API is down, login and catalog fall back to local demo data.

**API:** local `backend/` (`make -C backend run` → `:18080`) or [Little-Royals-API](https://github.com/OlaroPeterCelestine/Little-Royals-API).

```bash
cp .env.example .env
npm install
npm run dev
```

In another terminal:

```bash
cd backend && make run
```

**Sign-in**
- With API up: use seeded API users.
- API down / offline: any email + password works (demo roles for known emails).

`.env` keys:

```bash
VITE_USE_API=true
VITE_API_BASE_URL=http://127.0.0.1:18080
VITE_WS_URL=ws://127.0.0.1:18080
```

Force offline-only: `VITE_USE_API=false`.
