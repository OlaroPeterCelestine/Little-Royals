import { apiUrl, isApiEnabled } from '@/lib/apiMode'
import { authToken } from '@/data/auth/auth'
import type { SealedEnvelope, VaultIdentity } from '@/lib/e2ee/vaultCrypto'

type ApiOk<T> = { ok: boolean; data?: T; error?: string }

async function vaultFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isApiEnabled()) throw new Error('Private vault needs the school API')
  const token = authToken()
  if (!token) throw new Error('Sign in first to use the private vault')
  const res = await fetch(apiUrl(`/api/v1/vault${path}`), {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  })
  const payload = (await res.json()) as ApiOk<T>
  if (!res.ok || !payload.ok) {
    throw new Error(payload.error || 'Vault request failed')
  }
  return payload.data as T
}

export type VaultDevice = {
  id: string
  deviceLabel: string
  x25519PublicKey: string
  ed25519PublicKey: string
}

export type VaultBlob = SealedEnvelope & {
  id: string
  label: string
  senderDeviceId?: string
  createdAt?: string
}

export function vaultStatus() {
  return vaultFetch<{ mode: string; alg: string; serverReads: boolean; note: string }>(
    '/status',
  )
}

export function listVaultDevices() {
  return vaultFetch<VaultDevice[]>('/devices')
}

export function registerVaultDevice(identity: VaultIdentity) {
  return vaultFetch<VaultDevice>('/devices', {
    method: 'POST',
    body: JSON.stringify({
      deviceLabel: identity.deviceLabel,
      x25519PublicKey: identity.x25519Public,
      ed25519PublicKey: identity.ed25519Public,
    }),
  })
}

export function listVaultBlobs(label?: string) {
  const q = label ? `?label=${encodeURIComponent(label)}` : ''
  return vaultFetch<VaultBlob[]>(`/blobs${q}`)
}

export function putVaultBlob(input: SealedEnvelope & { label: string; senderDeviceId?: string }) {
  return vaultFetch<VaultBlob>('/blobs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function deleteVaultBlob(id: string) {
  return vaultFetch<{ deleted: string }>(`/blobs/${id}`, { method: 'DELETE' })
}
