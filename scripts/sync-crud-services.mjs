#!/usr/bin/env node
/**
 * Sync FE catalog CRUD services + BE seeds/ports/CatalogOnlyModules
 * from src/data/catalog.ts + catalogExtra.ts.
 *
 * Usage: node scripts/sync-crud-services.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const write = (p, s) => fs.writeFileSync(path.join(root, p), s)

function keysFromCatalog(src) {
  const out = []
  const re = /key:\s*'([a-z0-9-]+)'\s*,\s*\n\s*title:/g
  let m
  while ((m = re.exec(src))) out.push(m[1])
  return out
}

function keysFromExtra(src) {
  const out = []
  const re = /mod\(\s*'([a-z0-9-]+)'/g
  let m
  while ((m = re.exec(src))) out.push(m[1])
  return out
}

function extractCatalogSeeds(src) {
  const seeds = {}
  const re =
    /key:\s*'([a-z0-9-]+)'\s*,\s*\n\s*title:\s*'([^']*)'[\s\S]*?rows:\s*\[([\s\S]*?)\n\s*\],/g
  let m
  while ((m = re.exec(src))) {
    const key = m[1]
    const rows = []
    const objRe = /\{([^{}]+)\}/g
    let o
    while ((o = objRe.exec(m[3]))) {
      const body = o[1]
      const id = (body.match(/id:\s*'([^']+)'/) || [])[1]
      const name = (body.match(/name:\s*'([^']+)'/) || [])[1]
      const status = (body.match(/status:\s*'([^']+)'/) || [])[1]
      if (id && name) {
        const row = { id, name }
        if (status) row.status = status
        rows.push(row)
      }
    }
    seeds[key] = rows.slice(0, 8)
  }
  return seeds
}

function extractExtraSeeds(src) {
  const seeds = {}
  const re = /mod\(\s*'([a-z0-9-]+)'[\s\S]*?\[\s*([\s\S]*?)\s*\]\s*,?\s*\)/g
  let m
  while ((m = re.exec(src))) {
    const key = m[1]
    const rows = []
    const rowRe =
      /row\(\s*'([^']+)'\s*,\s*'([^']+)'\s*(?:,\s*\{[^}]*\})?\s*(?:,\s*'([^']*)')?/g
    let r
    while ((r = rowRe.exec(m[2]))) {
      const row = { id: r[1], name: r[2] }
      if (r[3]) row.status = r[3]
      rows.push(row)
    }
    seeds[key] = rows
  }
  return seeds
}

const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

const catSrc = read('src/data/catalog.ts')
const extraSrc = read('src/data/catalogExtra.ts')
const feModules = [
  ...new Set([...keysFromCatalog(catSrc), ...keysFromExtra(extraSrc)]),
].sort()

const typed = new Set([
  'students',
  'staff',
  'parents',
  'classes',
  'subjects',
  'attendance',
  'fees',
  'invoices',
  'payments',
  'users',
  'notifications',
  'school',
])
const catalogOnly = feModules.filter((k) => !typed.has(k)).sort()

const existingSeeds = JSON.parse(read('backend/pkg/modules/seeds.json'))
const existingPorts = JSON.parse(read('backend/pkg/modules/ports.json'))
const catSeeds = extractCatalogSeeds(catSrc)
const extraSeeds = extractExtraSeeds(extraSrc)

const mergedSeeds = { ...existingSeeds }
for (const key of feModules) {
  if (!mergedSeeds[key] || mergedSeeds[key].length === 0) {
    const from = catSeeds[key] || extraSeeds[key] || []
    mergedSeeds[key] =
      from.length > 0
        ? from
        : [
            {
              id: `${key.slice(0, 3).toUpperCase()}-001`,
              name: `Sample ${key}`,
              status: 'Active',
            },
          ]
  }
}

const mergedPorts = { ...existingPorts }
let nextPort = 8104
const used = new Set(Object.values(mergedPorts))
for (const key of [...feModules, 'staff', 'parents', 'subjects', 'invoices', 'users']) {
  if (mergedPorts[key]) continue
  while (used.has(nextPort)) nextPort++
  mergedPorts[key] = nextPort
  used.add(nextPort)
  nextPort++
  if (!mergedSeeds[key]) {
    mergedSeeds[key] = [
      {
        id: `${key.slice(0, 3).toUpperCase()}-001`,
        name: `Sample ${key}`,
        status: 'Active',
      },
    ]
  }
}

write('backend/pkg/modules/seeds.json', JSON.stringify(mergedSeeds, null, 2) + '\n')
write('backend/pkg/modules/ports.json', JSON.stringify(mergedPorts, null, 2) + '\n')

const catalogTs = `import { apiRequest, type ApiMeta } from './http'

export type CatalogRow = {
  id: string
  name: string
  status?: string
  [key: string]: string | number | boolean | null | undefined
}

export type ListResult<T> = {
  items: T[]
  meta?: ApiMeta
}

/** All frontend desk catalog modules with list/get/create/update/delete API services. */
export const FRONTEND_MODULES = [
${feModules.map((m) => `  '${m}',`).join('\n')}
] as const

export type FrontendModule = (typeof FRONTEND_MODULES)[number]

function normalizeList<T>(data: T[] | { items?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.items)) return data.items
  return []
}

export function createCatalogService(module: string) {
  const base = \`/api/v1/\${module}\`

  return {
    module,

    async list(params?: { page?: number; limit?: number }): Promise<ListResult<CatalogRow>> {
      const q = new URLSearchParams()
      if (params?.page) q.set('page', String(params.page))
      if (params?.limit) q.set('limit', String(params.limit))
      const qs = q.toString()
      const { data, meta } = await apiRequest<CatalogRow[] | { items: CatalogRow[] }>(
        \`\${base}\${qs ? \`?\${qs}\` : ''}\`,
      )
      return { items: normalizeList(data), meta }
    },

    async get(id: string): Promise<CatalogRow> {
      const { data } = await apiRequest<CatalogRow>(\`\${base}/\${encodeURIComponent(id)}\`)
      return data
    },

    async create(body: Partial<CatalogRow> & { name: string }): Promise<CatalogRow> {
      const { data } = await apiRequest<CatalogRow>(base, { method: 'POST', body })
      return data
    },

    async update(id: string, body: Partial<CatalogRow>): Promise<CatalogRow> {
      const { data } = await apiRequest<CatalogRow>(\`\${base}/\${encodeURIComponent(id)}\`, {
        method: 'PUT',
        body,
      })
      return data
    },

    async remove(id: string): Promise<void> {
      await apiRequest(\`\${base}/\${encodeURIComponent(id)}\`, { method: 'DELETE' })
    },
  }
}

export type CatalogService = ReturnType<typeof createCatalogService>
`

write('src/services/catalog.ts', catalogTs)

const named = feModules
  .map((m) => `export const ${camel(m)}Service = catalogServices['${m}']`)
  .join('\n')

write(
  'src/services/index.ts',
  `import { apiRequest } from './http'
import {
  createCatalogService,
  FRONTEND_MODULES,
  type CatalogService,
  type FrontendModule,
} from './catalog'

export { API_BASE, ApiError, apiRequest } from './http'
export {
  createCatalogService,
  FRONTEND_MODULES,
  type CatalogRow,
  type CatalogService,
  type FrontendModule,
  type ListResult,
} from './catalog'

/** CRUD service for every desk module (list / get / create / update / remove). */
export const catalogServices = Object.fromEntries(
  FRONTEND_MODULES.map((module) => [module, createCatalogService(module)]),
) as Record<FrontendModule, CatalogService>

${named}

/** Typed API aliases that differ from desk catalog keys. */
export const parentsService = createCatalogService('parents')
export const subjectsService = createCatalogService('subjects')
export const usersService = createCatalogService('users')

export function serviceFor(module: string): CatalogService {
  if ((FRONTEND_MODULES as readonly string[]).includes(module)) {
    return catalogServices[module as FrontendModule]
  }
  return createCatalogService(module)
}

export async function listApiModules(): Promise<string[]> {
  const { data } = await apiRequest<string[]>('/api/v1/modules')
  return Array.isArray(data) ? data : []
}

export async function getSchoolProfile<T = Record<string, unknown>>(): Promise<T> {
  const { data } = await apiRequest<T>('/api/v1/school')
  return data
}

export const notificationsService = {
  async list() {
    const { data } = await apiRequest('/api/v1/notifications')
    return data
  },
  async markRead(id: string) {
    await apiRequest(\`/api/v1/notifications/\${encodeURIComponent(id)}/read\`, {
      method: 'POST',
      body: {},
    })
  },
}
`,
)

const goList = catalogOnly.map((k) => `\t"${k}",`).join('\n')
const registry = read('backend/pkg/modules/registry.go')
const catalogOnlyRe = /var CatalogOnlyModules = \[\]string\{[\s\S]*?\n\}/
if (!catalogOnlyRe.test(registry)) {
  throw new Error(
    'failed to patch CatalogOnlyModules — pattern not found in backend/pkg/modules/registry.go',
  )
}
const updated = registry.replace(
  catalogOnlyRe,
  `var CatalogOnlyModules = []string{\n${goList}\n}`,
)
write('backend/pkg/modules/registry.go', updated)

write(
  'scripts/.generated-modules.json',
  JSON.stringify({ feModules, catalogOnly }, null, 2) + '\n',
)

console.log(
  JSON.stringify(
    {
      feModules: feModules.length,
      catalogOnly: catalogOnly.length,
      seeds: Object.keys(mergedSeeds).length,
      ports: Object.keys(mergedPorts).length,
    },
    null,
    2,
  ),
)
