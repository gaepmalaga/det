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

export function registerAppUpdates(): void {
  const applyUpdate = registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return

      // Puede haber quedado una versión instalada y en espera de una
      // sesión anterior: se ofrece igualmente, no se pierde.
      if (registration.waiting) showUpdateBar(() => applyUpdate(true))

      setInterval(() => {
        // Sin conexión, pedir la actualización solo ensucia la consola;
        // se reintenta en la siguiente vuelta.
        if (navigator.onLine) registration.update().catch(() => {})
      }, CHECK_INTERVAL_MS)
    },
    onNeedRefresh() {
      showUpdateBar(() => applyUpdate(true))
    },
  })
}
