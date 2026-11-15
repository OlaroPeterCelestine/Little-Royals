<script setup lang="ts">
import { computed, ref } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions, EventInput } from '@fullcalendar/core'
import { schoolStore } from '@/data/catalog/store'
import { addRecord } from '@/data/catalog/store'
import { toast } from 'frappe-ui'

const props = defineProps<{
  canCreate?: boolean
}>()

const creating = ref(false)

const events = computed<EventInput[]>(() => {
  const out: EventInput[] = []
  for (const row of schoolStore['school-events']?.rows || []) {
    const start = String(row.start || row.date || row.startDate || '')
    if (!start) continue
    out.push({
      id: row.id,
      title: row.name,
      start,
      end: String(row.end || row.endDate || '') || undefined,
      allDay: !String(row.start || '').includes('T'),
    })
  }
  for (const row of schoolStore['academic-terms']?.rows || []) {
    const start = String(row.start || '')
    if (!start) continue
    out.push({
      id: `term-${row.id}`,
      title: `${row.name} · term`,
      start,
      end: String(row.end || '') || undefined,
      allDay: true,
      display: 'background',
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
    })
  }
  return out
})

const options = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,listWeek',
  },
  height: 'auto',
  editable: false,
  selectable: Boolean(props.canCreate),
  events: events.value,
  dateClick: async (info) => {
    if (!props.canCreate || creating.value) return
    const title = window.prompt('Event title', 'School event')
    if (!title?.trim()) return
    creating.value = true
    try {
      await addRecord('school-events', {
        name: title.trim(),
        start: info.dateStr,
        date: info.dateStr,
        status: 'Scheduled',
      })
      toast.success('Event saved on server')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save event')
    } finally {
      creating.value = false
    }
  },
}))
</script>

<template>
  <div class="cloud-calendar overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white p-3">
    <FullCalendar :options="options" />
  </div>
</template>

<style scoped>
.cloud-calendar :deep(.fc) {
  --fc-border-color: #e5e7eb;
  --fc-button-bg-color: #2563eb;
  --fc-button-border-color: #2563eb;
  --fc-button-hover-bg-color: #1d4ed8;
  --fc-today-bg-color: rgba(37, 99, 235, 0.08);
  font-family: inherit;
}
</style>
