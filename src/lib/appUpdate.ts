import { registerSW } from 'virtual:pwa-register'

// Un despacho abre la aplicación por la mañana y la deja abierta todo el
// día. Sin esto, el service worker solo busca versiones nuevas al cargar
// la página, así que un arreglo desplegado hoy podía no llegarle hasta el
// día siguiente. Se comprueba cada media hora y, cuando hay versión nueva,
// entra sola: no hay estado en memoria que perder — todo vive en Firestore.
const CHECK_INTERVAL_MS = 30 * 60 * 1000

export function registerAppUpdates(): void {
  const update = registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => {
        // Sin conexión, pedir la actualización solo produce un error en
        // consola; se reintenta en la siguiente vuelta.
        if (navigator.onLine) registration.update().catch(() => {})
      }, CHECK_INTERVAL_MS)
    },
    onNeedRefresh() {
      update(true)
    },
  })
}
