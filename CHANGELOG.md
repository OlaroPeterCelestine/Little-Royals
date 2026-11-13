# Changelog

All notable changes to the **Little Royals** Vue desk (frontend) are documented here.

The Go API lives in a **separate** repository: [Little-Royals-API](https://github.com/OlaroPeterCelestine/Little-Royals-API).

## [Unreleased]

### Added

- Frontend API layer in `src/services/`:
  - shared `apiRequest` client (JWT, envelope parsing)
  - per-module services for all 22 catalog keys plus staff/parents/subjects/invoices/users
  - `catalogServices` map and `listApiModules()` helper

### Changed

- Repository split: this repo is **frontend-only**; backend was moved to `Little-Royals-API`.

## [0.1.0] — 2026-03

### Added

- Vite/Vue desk frontend with role-aligned auth session.
- Realtime notifications client and JWT login against the school API.
