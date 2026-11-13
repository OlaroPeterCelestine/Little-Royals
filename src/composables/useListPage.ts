import { computed, ref, unref, watch, type MaybeRef, type Ref } from 'vue'
import type { CatalogRow } from '../data/catalog'

export const PAGE_SIZE = 10

export interface ListStat {
  title: string
  value: number
  caption?: string
}

export function useListPage(
  rows: Ref<CatalogRow[]>,
  options: {
    searchKeys?: string[]
    extraFilterKey?: MaybeRef<string | undefined>
    extraFilterLabel?: MaybeRef<string>
  } = {},
) {
  const query = ref('')
  const statusFilter = ref('All')
  const extraFilter = ref('All')
  const page = ref(1)

  const resolvedExtraKey = computed(() => unref(options.extraFilterKey))
  const resolvedExtraLabel = computed(
    () => unref(options.extraFilterLabel) || 'filter',
  )

  const statusOptions = computed(() => {
    const statuses = Array.from(
      new Set(
        rows.value.map((r) => r.status).filter((s): s is string => Boolean(s)),
      ),
    )
    return [
      { label: 'All statuses', value: 'All' },
      ...statuses.map((s) => ({
        label: `${s} (${rows.value.filter((r) => r.status === s).length})`,
        value: s,
      })),
    ]
  })

  const extraOptions = computed(() => {
    const key = resolvedExtraKey.value
    if (!key) return []
    const values = Array.from(
      new Set(
        rows.value
          .map((r) => r[key])
          .filter(
            (v) => v !== undefined && v !== null && String(v).trim() !== '',
          )
          .map((v) => String(v)),
      ),
    ).sort((a, b) => a.localeCompare(b))
    if (!values.length) return []
    const label = resolvedExtraLabel.value
    return [
      { label: `All ${label}`, value: 'All' },
      ...values.map((v) => ({
        label: `${v} (${rows.value.filter((r) => String(r[key]) === v).length})`,
        value: v,
      })),
    ]
  })

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    const key = resolvedExtraKey.value
    const keys = options.searchKeys
    return rows.value.filter((row) => {
      const statusOk =
        statusFilter.value === 'All' || row.status === statusFilter.value
      if (!statusOk) return false

      if (key && extraFilter.value !== 'All') {
        if (String(row[key] ?? '') !== extraFilter.value) return false
      }

      if (!q) return true
      if (keys?.length) {
        return keys.some((searchKey) =>
          String(row[searchKey] ?? '')
            .toLowerCase()
            .includes(q),
        )
      }
      return Object.values(row).some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q),
      )
    })
  })

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)),
  )

  const pageRows = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return filtered.value.slice(start, start + PAGE_SIZE)
  })

  const rangeLabel = computed(() => {
    if (!filtered.value.length) return '0 of 0'
    const start = (page.value - 1) * PAGE_SIZE + 1
    const end = Math.min(page.value * PAGE_SIZE, filtered.value.length)
    return `${start}–${end} of ${filtered.value.length}`
  })

  const stats = computed<ListStat[]>(() => {
    const all = rows.value
    const items: ListStat[] = [
      { title: 'Total', value: all.length, caption: 'in catalog' },
      {
        title: 'Matching',
        value: filtered.value.length,
        caption:
          query.value ||
          statusFilter.value !== 'All' ||
          extraFilter.value !== 'All'
            ? 'after filters'
            : 'showing all',
      },
    ]

    const statusCounts = new Map<string, number>()
    for (const row of all) {
      if (!row.status) continue
      statusCounts.set(row.status, (statusCounts.get(row.status) || 0) + 1)
    }

    for (const [status, count] of [...statusCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)) {
      items.push({ title: status, value: count, caption: 'by status' })
    }

    return items.slice(0, 4)
  })

  const hasActiveFilters = computed(
    () =>
      Boolean(query.value.trim()) ||
      statusFilter.value !== 'All' ||
      extraFilter.value !== 'All',
  )

  watch([query, statusFilter, extraFilter], () => {
    page.value = 1
  })

  watch(resolvedExtraKey, () => {
    extraFilter.value = 'All'
    page.value = 1
  })

  watch(totalPages, (pages) => {
    if (page.value > pages) page.value = pages
  })

  function resetFilters() {
    query.value = ''
    statusFilter.value = 'All'
    extraFilter.value = 'All'
    page.value = 1
  }

  function goToPage(next: number) {
    page.value = Math.min(Math.max(1, next), totalPages.value)
  }

  return {
    query,
    statusFilter,
    extraFilter,
    page,
    statusOptions,
    extraOptions,
    filtered,
    pageRows,
    totalPages,
    rangeLabel,
    stats,
    hasActiveFilters,
    resetFilters,
    goToPage,
    pageSize: PAGE_SIZE,
  }
}
