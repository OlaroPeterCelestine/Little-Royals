# Source layout

Import with the `@/` alias (`@` → `src/`).

```
src/
  app/                 App shell — bootstrap, router, global CSS
    App.vue
    main.ts
    router/
    styles/
  pages/               Route screens, grouped by domain
    auth/
    desk/              Dashboard, term overview, parent portal
    students/
    people/
    academics/
    attendance/
    admissions/
    exams/
    finance/
    communications/
    campus/            Library, transport, meals, health, discipline, calendar
    documents/
    reports/
    inventory/
    admin/             Users, school setup, activity
    shared/            MasterList, RecordDetail, RecordForm, NotFound
  components/          Shared UI
    layout/            Top bar, sidebar, back, logo, shimmer
    list/              Tables, toolbars, tab desks, stats
    forms/             SchoolForm + fields
    common/            Avatar, access gate, record modal
  composables/         Vue composition helpers
  data/                Domain state & seed data
    catalog/           Modules catalog, store, form schemas
    students/
    people/
    school/            Setup, workspace, grades, calendars
    documents/
    auth/
    activity/
    inventory/
  lib/                 Pure helpers (sanitize, CSV, routes, prefetch…)
  services/            HTTP / API clients
  types/               Shared TS types
```

## Conventions

- **Pages** own a route; put domain-specific UI next to the page when it is not reused.
- **Components** are shared across domains.
- **data/** holds reactive store + seed/catalog — not Vue components.
- Prefer `@/…` imports over deep relative paths (`../../../`).
