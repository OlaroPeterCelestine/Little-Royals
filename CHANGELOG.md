# Changelog

All notable changes to the **Little Royals** Vue desk (frontend) are documented here.

The Go API lives in a **separate** repository: [Little-Royals-API](https://github.com/OlaroPeterCelestine/Little-Royals-API).

## [Unreleased]

### Added

- Frontend API layer in `src/services/`:
  - shared `apiRequest` client (JWT, envelope parsing)
  - CRUD services (`list` / `get` / `create` / `update` / `remove`) for all desk modules
  - `catalogServices` map, named exports, `serviceFor()`, and `listApiModules()`
  - `scripts/sync-crud-services.mjs` to regenerate FE services + BE seeds/ports from the catalog

### Changed

- Repository split: this repo is **frontend-only**; backend was moved to `Little-Royals-API`.

## [0.1.0] — 2026-03

### Added

- Vite/Vue desk frontend with role-aligned auth session.
- Realtime notifications client and JWT login against the school API.
