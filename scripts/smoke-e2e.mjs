import { ed25519, x25519 } from '@noble/curves/ed25519.js'
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { utf8ToBytes } from '@noble/hashes/utils.js'

function b64(bytes) {
  let s = ''
  for (const x of bytes) s += String.fromCharCode(x)
  return btoa(s).replace(/=+$/, '')
}

function concat(...parts) {
  const n = parts.reduce((a, p) => a + p.length, 0)
  const o = new Uint8Array(n)
  let i = 0
  for (const p of parts) {
    o.set(p, i)
    i += p.length
  }
  return o
}

const ALG = 'xchacha20poly1305+x25519+hkdf-sha256+ed25519'
const xPriv = x25519.utils.randomSecretKey()
const xPub = x25519.getPublicKey(xPriv)
const edPriv = ed25519.utils.randomSecretKey()
const edPub = ed25519.getPublicKey(edPriv)
const ephPriv = x25519.utils.randomSecretKey()
const ephPub = x25519.getPublicKey(ephPriv)
const shared = x25519.getSharedSecret(ephPriv, xPub)
const key = hkdf(sha256, shared, ephPub, utf8ToBytes('little-royals/vault/v1/enc'), 32)
const nonce = crypto.getRandomValues(new Uint8Array(24))
const aad = utf8ToBytes('vault:private-note')
const aead = xchacha20poly1305(key, nonce, aad)
const ct = aead.encrypt(utf8ToBytes('smoke vault note'))
const signBytes = sha256(concat(utf8ToBytes(ALG), xPub, ephPub, nonce, aad, ct))
const sig = ed25519.sign(signBytes, edPriv)

console.log(
  JSON.stringify({
    device: {
      deviceLabel: 'smoke-compat',
      x25519PublicKey: b64(xPub),
      ed25519PublicKey: b64(edPub),
    },
    blob: {
      label: 'private-note',
      alg: ALG,
      ephemeralPublicKey: b64(ephPub),
      nonce: b64(nonce),
      ciphertext: b64(ct),
      aad: b64(aad),
      signature: b64(sig),
      recipientPublicKey: b64(xPub),
    },
  }),
)
