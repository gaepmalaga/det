import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAI, GoogleAIBackend } from 'firebase/ai'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

// App Check protege la API de Gemini (AI Logic) contra uso no autorizado.
// La clave de sitio de reCAPTCHA v3 es pública por diseño (va en el bundle
// del navegador a propósito) — Google la valida junto con el dominio de
// origen, y no concede ningún acceso por sí sola. Registrada en
// google.com/recaptcha/admin para detectivesprivadosesp.web.app y
// detectivesprivadosesp.firebaseapp.com — ver PROJECT_DESCRIPTION.md.
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LexHaQtAAAAAGekN77BSEj60zlSwq5K90jcYScP'),
  isTokenAutoRefreshEnabled: true,
})

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export const storage = getStorage(app)

// Firebase AI Logic (Gemini) — backend "Gemini Developer API": capa
// gratuita, sin tarjeta de facturación. Se activa en Firebase Console →
// Build → AI Logic → Get started (un par de clics, nada que pegar aquí:
// la clave la gestiona Firebase, no vive en el código del cliente).
export const ai = getAI(app, { backend: new GoogleAIBackend() })

export default app