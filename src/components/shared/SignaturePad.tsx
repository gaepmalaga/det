import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Eraser } from 'lucide-react'

export interface SignaturePadHandle {
  // null si el lienzo está vacío (nadie ha dibujado nada todavía).
  getDataUrl: () => string | null
  clear: () => void
}

function getPoint(
  canvas: HTMLCanvasElement,
  e: MouseEvent | TouchEvent
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const point = 'touches' in e ? e.touches[0] ?? (e as TouchEvent).changedTouches[0] : e
  return {
    x: (point.clientX - rect.left) * scaleX,
    y: (point.clientY - rect.top) * scaleY,
  }
}

export const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const hasDrawnRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [hasDrawn, setHasDrawn] = useState(false)

  useImperativeHandle(ref, () => ({
    getDataUrl: () => {
      if (!hasDrawnRef.current || !canvasRef.current) return null
      return canvasRef.current.toDataURL('image/png')
    },
    clear: () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      hasDrawnRef.current = false
      setHasDrawn(false)
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // El canvas se dibuja a resolución fija interna (más nítido en
    // pantallas de alta densidad) e independiente del tamaño CSS
    // mostrado — getPoint() ya reescala las coordenadas de entrada.
    const ratio = window.devicePixelRatio || 1
    const cssWidth = canvas.clientWidth
    const cssHeight = canvas.clientHeight
    canvas.width = cssWidth * ratio
    canvas.height = cssHeight * ratio
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.25
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1e293b'

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawingRef.current = true
      const p = getPoint(canvas, e)
      lastPointRef.current = { x: p.x / ratio, y: p.y / ratio }
    }
    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawingRef.current) return
      e.preventDefault()
      const p = getPoint(canvas, e)
      const point = { x: p.x / ratio, y: p.y / ratio }
      const last = lastPointRef.current
      if (last) {
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
      }
      lastPointRef.current = point
      if (!hasDrawnRef.current) {
        hasDrawnRef.current = true
        setHasDrawn(true)
      }
    }
    const end = () => {
      drawingRef.current = false
      lastPointRef.current = null
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
    }
  }, [])

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
    setHasDrawn(false)
  }

  return (
    <div>
      <div className="relative border border-border rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-32 touch-none cursor-crosshair"
        />
        {!hasDrawn && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
            Firma aquí con el ratón o el dedo
          </p>
        )}
      </div>
      {hasDrawn && (
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Eraser className="w-3 h-3" />
          Borrar y firmar de nuevo
        </button>
      )}
    </div>
  )
})
