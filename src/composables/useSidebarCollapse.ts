import { onMounted, ref, watch } from 'vue'

const STORAGE_KEY = 'pearl-sidebar-collapsed'

/** Shared across topbar toggle and Sidebar `v-model:collapsed`. */
const collapsed = ref<boolean | null>(null)
let hydrated = false

function hydrate() {
  if (hydrated) return
  hydrated = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === '1') collapsed.value = true
    else if (raw === '0') collapsed.value = false
  } catch {
    /* ignore */
  }
}

watch(collapsed, (value) => {
  if (value === null) return
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
})

export function useSidebarCollapse() {
  onMounted(hydrate)

  function toggle() {
    hydrate()
    collapsed.value = !(collapsed.value ?? false)
  }

  return { collapsed, toggle }
}
