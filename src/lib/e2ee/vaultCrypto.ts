/**
 * Zero-knowledge vault client — X25519 + HKDF-SHA-256 + XChaCha20-Poly1305 + Ed25519.
 * Private keys stay in the browser. The Go API only stores opaque envelopes.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { ed25519, x25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js'

export const VAULT_ALG = 'xchacha20poly1305+x25519+hkdf-sha256+ed25519'
const INFO_ENC = utf8ToBytes('little-royals/vault/v1/enc')
const STORAGE_KEY = 'lr.vault.identity.v1'

export type VaultIdentity = {
  deviceLabel: string
  x25519Private: string
  x25519Public: string
  ed25519Private: string
  ed25519Public: string
}

export type SealedEnvelope = {
  alg: string
  ephemeralPublicKey: string
  nonce: string
  ciphertext: string
  aad?: string
  signature?: string
  recipientPublicKey: string
}

/** Match Go encoding/base64.RawStdEncoding (no padding, +/). */
function b64RawStd(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin).replace(/=+$/g, '')
}

function fromB64RawStd(raw: string): Uint8Array {
  const pad = raw.length % 4 === 0 ? '' : '='.repeat(4 - (raw.length % 4))
  const bin = atob(raw + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(len)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

function canonicalSignBytes(env: {
  recipientPublicKey: Uint8Array
  ephemeralPublicKey: Uint8Array
  nonce: Uint8Array
  aad: Uint8Array
  ciphertext: Uint8Array
}): Uint8Array {
  return sha256(
    concat(
      utf8ToBytes(VAULT_ALG),
      env.recipientPublicKey,
      env.ephemeralPublicKey,
      env.nonce,
      env.aad,
      env.ciphertext,
    ),
  )
}

export function generateVaultIdentity(deviceLabel = 'Desk browser'): VaultIdentity {
  const xPriv = x25519.utils.randomSecretKey()
  const xPub = x25519.getPublicKey(xPriv)
  const edPriv = ed25519.utils.randomSecretKey()
  const edPub = ed25519.getPublicKey(edPriv)
  return {
    deviceLabel,
    x25519Private: bytesToHex(xPriv),
    x25519Public: b64RawStd(xPub),
    ed25519Private: bytesToHex(edPriv),
    ed25519Public: b64RawStd(edPub),
  }
}

export function loadVaultIdentity(): VaultIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as VaultIdentity
  } catch {
    return null
  }
}

export function saveVaultIdentity(id: VaultIdentity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(id))
}

export function clearVaultIdentity() {
  localStorage.removeItem(STORAGE_KEY)
}

export function ensureVaultIdentity(deviceLabel?: string): VaultIdentity {
  const existing = loadVaultIdentity()
  if (existing?.x25519Private && existing.ed25519Private) return existing
  const next = generateVaultIdentity(deviceLabel)
  saveVaultIdentity(next)
  return next
}

export function sealPrivateNote(
  plaintext: string,
  recipientX25519PublicB64: string,
  identity: VaultIdentity,
  aadText = 'vault:private-note',
): SealedEnvelope {
  const recipientPub = fromB64RawStd(recipientX25519PublicB64)
  const ephPriv = x25519.utils.randomSecretKey()
  const ephPub = x25519.getPublicKey(ephPriv)
  const shared = x25519.getSharedSecret(ephPriv, recipientPub)
  const key = hkdf(sha256, shared, ephPub, INFO_ENC, 32)
  const nonce = crypto.getRandomValues(new Uint8Array(24))
  const aad = utf8ToBytes(aadText)
  const aead = xchacha20poly1305(key, nonce, aad)
  const ciphertext = aead.encrypt(utf8ToBytes(plaintext))
  const edPriv = hexToBytes(identity.ed25519Private)
  const signBytes = canonicalSignBytes({
    recipientPublicKey: recipientPub,
    ephemeralPublicKey: ephPub,
    nonce,
    aad,
    ciphertext,
  })
  const signature = ed25519.sign(signBytes, edPriv)
  return {
    alg: VAULT_ALG,
    ephemeralPublicKey: b64RawStd(ephPub),
    nonce: b64RawStd(nonce),
    ciphertext: b64RawStd(ciphertext),
    aad: b64RawStd(aad),
    signature: b64RawStd(signature),
    recipientPublicKey: b64RawStd(recipientPub),
  }
}

export function openPrivateNote(
  envelope: SealedEnvelope,
  identity: VaultIdentity,
  senderEd25519PublicB64?: string,
): string {
  const ephPub = fromB64RawStd(envelope.ephemeralPublicKey)
  const nonce = fromB64RawStd(envelope.nonce)
  const ciphertext = fromB64RawStd(envelope.ciphertext)
  const aad = envelope.aad ? fromB64RawStd(envelope.aad) : new Uint8Array()
  const recipientPub = fromB64RawStd(envelope.recipientPublicKey)
  if (senderEd25519PublicB64 && envelope.signature) {
    const sig = fromB64RawStd(envelope.signature)
    const ok = ed25519.verify(
      sig,
      canonicalSignBytes({
        recipientPublicKey: recipientPub,
        ephemeralPublicKey: ephPub,
        nonce,
        aad,
        ciphertext,
      }),
      fromB64RawStd(senderEd25519PublicB64),
    )
    if (!ok) throw new Error('Invalid vault signature')
  }
  const xPriv = hexToBytes(identity.x25519Private)
  const shared = x25519.getSharedSecret(xPriv, ephPub)
  const key = hkdf(sha256, shared, ephPub, INFO_ENC, 32)
  const aead = xchacha20poly1305(key, nonce, aad)
  const plain = aead.decrypt(ciphertext)
  return new TextDecoder().decode(plain)
}
