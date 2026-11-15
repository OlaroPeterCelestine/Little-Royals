<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, FormControl } from 'frappe-ui'
import { schoolStore } from '@/data/catalog/store'

const router = useRouter()
const q = ref('')

type Contact = {
  id: string
  name: string
  role: string
  phone: string
  email: string
  path: string
}

const contacts = computed<Contact[]>(() => {
  const out: Contact[] = []
  for (const row of schoolStore.staff?.rows || []) {
    out.push({
      id: row.id,
      name: row.name,
      role: 'Staff',
      phone: String(row.phone || ''),
      email: String(row.email || ''),
      path: `/staff/${row.id}`,
    })
  }
  for (const row of schoolStore.teachers?.rows || []) {
    out.push({
      id: row.id,
      name: row.name,
      role: 'Teacher',
      phone: String(row.phone || ''),
      email: String(row.email || ''),
      path: `/teachers/${row.id}`,
    })
  }
  for (const row of schoolStore.parents?.rows || []) {
    out.push({
      id: row.id,
      name: row.name,
      role: 'Parent',
      phone: String(row.phone || ''),
      email: String(row.email || ''),
      path: `/parents/${row.id}`,
    })
  }
  const needle = q.value.trim().toLowerCase()
  if (!needle) return out
  return out.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      c.email.toLowerCase().includes(needle) ||
      c.phone.includes(needle) ||
      c.role.toLowerCase().includes(needle),
  )
})
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <FormControl
        v-model="q"
        type="text"
        placeholder="Search staff, teachers, parents"
        class="min-w-[220px] flex-1"
      />
      <Button label="People desk" variant="subtle" @click="router.push('/people')" />
    </div>
    <div class="overflow-hidden rounded-6 border border-outline-gray-1">
      <table class="min-w-full text-sm">
        <thead class="bg-surface-gray-1 text-left text-ink-gray-6">
          <tr>
            <th class="p-3">Name</th>
            <th class="p-3">Role</th>
            <th class="p-3">Phone</th>
            <th class="p-3">Email</th>
            <th class="p-3" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in contacts"
            :key="`${c.role}-${c.id}`"
            class="border-t border-outline-gray-1"
          >
            <td class="p-3 text-ink-gray-9">{{ c.name }}</td>
            <td class="p-3">{{ c.role }}</td>
            <td class="p-3">{{ c.phone || '—' }}</td>
            <td class="p-3">{{ c.email || '—' }}</td>
            <td class="p-3 text-right">
              <Button
                label="Open"
                size="sm"
                variant="subtle"
                @click="router.push(c.path)"
              />
            </td>
          </tr>
          <tr v-if="!contacts.length">
            <td colspan="5" class="p-6 text-center text-ink-gray-5">
              No contacts match
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
