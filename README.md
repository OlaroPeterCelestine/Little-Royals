# Little Royals (frontend)

Vue/Vite school desk UI. Runs **offline by default** — local catalog data and demo login. Not linked to the Go API until you explicitly enable it.

**API repo (separate):** [Little-Royals-API](https://github.com/OlaroPeterCelestine/Little-Royals-API)

```bash
cp .env.example .env
npm install
npm run dev
```

**Local sign-in** (with `VITE_USE_API=false`):

- `admin@littleroyals.school` / `demo`
- `teacher@littleroyals.school` / `demo`
- `accountant@littleroyals.school` / `demo`
- `parent@littleroyals.school` / `demo`

To wire the API later, set in `.env`:

```bash
VITE_USE_API=true
VITE_API_BASE_URL=http://127.0.0.1:18080
VITE_WS_URL=ws://127.0.0.1:18080
```

Local `backend/` folder (if present) is ignored by this git repo — it has its own remotes.
