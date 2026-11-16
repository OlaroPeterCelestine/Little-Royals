#!/usr/bin/env node
/**
 * Smoke-test API health + WebSocket realtime.
 *
 *   node scripts/smoke-realtime.mjs
 *   API_BASE=http://127.0.0.1:18080 EMAIL=... PASSWORD=... node scripts/smoke-realtime.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const apiBase = (process.env.API_BASE || 'http://127.0.0.1:18080').replace(/\/$/, '')

function loadAdminCreds() {
  if (process.env.EMAIL && process.env.PASSWORD) {
    return { email: process.env.EMAIL, password: process.env.PASSWORD }
  }
  const path = resolve(root, 'backend/.admin-credentials')
  if (!existsSync(path)) {
    throw new Error('Set EMAIL+PASSWORD or create backend/.admin-credentials')
  }
  const text = readFileSync(path, 'utf8')
  const email =
    (text.match(/^email[=:]\s*(\S+)/im) || [])[1] ||
    (text.match(/email[=:]\s*(\S+)/i) || [])[1]
  const password =
    (text.match(/^password[=:]\s*(\S+)/im) || [])[1] ||
    (text.match(/password[=:]\s*(\S+)/i) || [])[1]
  if (!email || !password) throw new Error('Could not parse .admin-credentials')
  return { email, password }
}

async function main() {
  const healthRes = await fetch(`${apiBase}/health`)
  const health = await healthRes.json()
  if (!healthRes.ok || health?.data?.status !== 'up') {
    throw new Error(`health failed: ${JSON.stringify(health)}`)
  }
  console.log('health ok', {
    redis: health.data.redis,
    realtime: health.data.realtime,
  })

  const { email, password } = loadAdminCreds()
  const loginRes = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const login = await loginRes.json()
  const token = login?.data?.token || login?.data?.accessToken
  if (!loginRes.ok || !token) {
    throw new Error(`login failed: ${JSON.stringify(login)}`)
  }
  console.log('login ok')

  const wsURL = apiBase.replace(/^http/, 'ws') + `/api/v1/ws?token=${encodeURIComponent(token)}`
  await new Promise((resolvePromise, reject) => {
    const ws = new WebSocket(wsURL)
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('websocket timeout waiting for connected event'))
    }, 8000)
    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(String(ev.data))
        if (msg.type === 'connected') {
          clearTimeout(timer)
          console.log('websocket connected', msg.payload)
          ws.close()
          resolvePromise()
        }
      } catch (err) {
        clearTimeout(timer)
        reject(err)
      }
    })
    ws.addEventListener('error', () => {
      clearTimeout(timer)
      reject(new Error('websocket error'))
    })
  })

  console.log('smoke-realtime: PASS')
}

main().catch((err) => {
  console.error('smoke-realtime: FAIL', err.message || err)
  process.exit(1)
})
