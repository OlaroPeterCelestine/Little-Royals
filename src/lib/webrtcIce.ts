/**
 * Free WebRTC ICE config.
 * Default: public Google STUN (no account).
 * Optional TURN: set VITE_TURN_URL / USER / CRED for coturn or a free TURN provider.
 */
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
  const turn = String(import.meta.env.VITE_TURN_URL || '').trim()
  if (turn) {
    const username = String(import.meta.env.VITE_TURN_USER || '').trim()
    const credential = String(import.meta.env.VITE_TURN_CRED || '').trim()
    servers.push({
      urls: turn,
      ...(username ? { username, credential } : {}),
    })
  }
  return servers
}

export function peerJsHost(): {
  host?: string
  port?: number
  path?: string
  secure?: boolean
  key?: string
} | null {
  const host = String(import.meta.env.VITE_PEER_HOST || '').trim()
  if (!host) return null
  return {
    host,
    port: Number(import.meta.env.VITE_PEER_PORT || 443),
    path: String(import.meta.env.VITE_PEER_PATH || '/peerjs'),
    secure: String(import.meta.env.VITE_PEER_SECURE || 'true') !== 'false',
    key: String(import.meta.env.VITE_PEER_KEY || 'peerjs'),
  }
}
