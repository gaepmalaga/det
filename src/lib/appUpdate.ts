import { registerSW } from 'virtual:pwa-register'

// Un despacho abre la aplicación por la mañana y la deja abierta todo el
// día. Sin esto, el service worker solo busca versiones nuevas al cargar
// la página, así que un arreglo desplegado hoy podía no llegarle hasta el
// día siguiente.
const CHECK_INTERVAL_MS = 30 * 60 * 1000

// Recargar sin avisar le arrancaría a alguien un parte de actuación a
// medio escribir. Así que la versión nueva se aplica cuando no puede
// molestar: al volver a la pestaña, o si lo pide el propio detective.
function showUpdateBar(apply: () => void) {
  if (document.getElementById('app-update-bar')) return

  const bar = document.createElement('div')
  bar.id = 'app-update-bar'
  bar.setAttribute('role', 'status')
  bar.style.cssText = [
    'position:fixed',
    'left:50%',
    'transform:translateX(-50%)',
    'bottom:16px',
    'z-index:2147483647',
    'display:flex',
    'align-items:center',
    'gap:12px',
    'padding:10px 14px',
    'border-radius:10px',
    'background:#111827',
    'color:#f9fafb',
    'font:500 13px/1.3 system-ui,-apple-system,Segoe UI,sans-serif',
    'box-shadow:0 8px 24px rgba(0,0,0,.28)',
    'max-width:calc(100vw - 32px)',
  ].join(';')

  const text = document.createElement('span')
  text.textContent = 'Hay una versión nueva de DetectiveOS.'

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Actualizar'
  button.style.cssText = [
    'border:0',
    'border-radius:7px',
    'padding:6px 12px',
    'background:#f9fafb',
    'color:#111827',
    'font:600 13px system-ui,-apple-system,Segoe UI,sans-serif',
    'cursor:pointer',
  ].join(';')
  button.addEventListener('click', apply)

  bar.append(text, button)
  document.body.appendChild(bar)

  // Si se va a otra pestaña o a otra aplicación, se aprovecha para
  // actualizar: ahí no hay nada que interrumpir.
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'hidden') apply()
    },
    { once: true }
  )
}

// Cuánto se espera a que el service worker en espera conteste antes de
// dar por hecho que no va a hacerlo.
const HANDOVER_TIMEOUT_MS = 4000

// Aplicar la versión nueva es pedirle al worker en espera que tome el
// control y recargar cuando lo haga. Pero un worker instalado por una
// versión anterior de la aplicación puede no tener el receptor de ese
// mensaje —los generados en modo autoUpdate no lo tienen— y entonces no
// contesta nunca y la aplicación se queda congelada en la versión vieja
// para siempre. Por eso hay salida de emergencia: si no contesta, se
// borra el service worker y sus cachés y se recarga en frío. Cuesta una
// recarga lenta y solo pasa una vez, al salir de esa situación.
function applyUpdate(registration: ServiceWorkerRegistration): void {
  let done = false
  const reload = () => {
    if (done) return
    done = true
    window.location.reload()
  }

  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true })
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' })

  window.setTimeout(async () => {
    if (done) return
    done = true
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {
      // Da igual por qué falle la limpieza: recargar es lo que importa.
    }
    window.location.reload()
  }, HANDOVER_TIMEOUT_MS)
}

export function registerAppUpdates(): void {
  let current: ServiceWorkerRegistration | null = null

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      current = registration

      // Puede haber quedado una versión instalada y en espera de una
      // sesión anterior: se ofrece igualmente, no se pierde.
      if (registration.waiting) showUpdateBar(() => applyUpdate(registration))

      setInterval(() => {
        // Sin conexión, pedir la actualización solo ensucia la consola;
        // se reintenta en la siguiente vuelta.
        if (navigator.onLine) registration.update().catch(() => {})
      }, CHECK_INTERVAL_MS)
    },
    onNeedRefresh() {
      if (current) showUpdateBar(() => applyUpdate(current!))
    },
  })
}
