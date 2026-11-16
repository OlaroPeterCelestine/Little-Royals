/** Browser geolocation helpers for campus geofence / staff clock. */

export type GeoPosition = {
  lat: number
  lng: number
  accuracyM: number | null
}

export class GeolocationError extends Error {
  code: number
  constructor(message: string, code = 0) {
    super(message)
    this.name = 'GeolocationError'
    this.code = code
  }
}

export function getCurrentPosition(options?: PositionOptions): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(
        new GeolocationError(
          'Geolocation is not available on this device or browser',
          0,
        ),
      )
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM:
            Number.isFinite(pos.coords.accuracy) && pos.coords.accuracy > 0
              ? Math.round(pos.coords.accuracy)
              : null,
        })
      },
      (err) => {
        const code = err?.code ?? 0
        let message = 'Could not read your location'
        if (code === 1) {
          message =
            'Location permission denied — allow location for this site, then retry'
        } else if (code === 2) {
          message = 'Location unavailable — try again outdoors or with GPS on'
        } else if (code === 3) {
          message = 'Location timed out — try again'
        }
        reject(new GeolocationError(message, code))
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10_000,
        ...options,
      },
    )
  })
}

export function formatClockTime(d = new Date()): string {
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function todayIsoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}
