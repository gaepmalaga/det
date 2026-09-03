import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Loader2, MapPin, MapPinOff, LocateFixed } from 'lucide-react'
import { haversineMeters } from '@/lib/geo'

// Si el detective va en movimiento (p. ej. en coche) mientras redacta la
// actuación, una sola lectura de GPS al abrir el formulario puede quedar
// varios km desfasada al guardar. En vez de eso, se van registrando
// posiciones mientras escribe (solo si se alejan más de este umbral de la
// última guardada, para no acumular ruido si está parado) y se muestran
// en un mapa donde puede elegir la que corresponde a lo que describe, o
// marcar el punto exacto a mano.
const MIN_WAYPOINT_DISTANCE_M = 1000
const DEFAULT_CENTER: [number, number] = [40.4168, -3.7038] // España, centrado por defecto
const DEFAULT_ZOOM = 6

interface LatLng {
  lat: number
  lng: number
}

interface LocationPickerProps {
  onChange: (pos: LatLng | null) => void
}

function makeDotIcon(color: string, size: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function LocationPicker({ onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const hasCenteredRef = useRef(false)

  const [waypoints, setWaypoints] = useState<LatLng[]>([])
  const [manualPosition, setManualPosition] = useState<LatLng | null>(null)
  const [status, setStatus] = useState<'locating' | 'ok' | 'denied'>('locating')

  const lastWaypoint = waypoints[waypoints.length - 1] ?? null
  const effectivePos = manualPosition ?? lastWaypoint

  // Seguimiento GPS: arranca al montar el formulario, se detiene al
  // cerrarlo (el componente se desmonta con él).
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus('denied')
      return
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('ok')
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setWaypoints((prev) => {
          const last = prev[prev.length - 1]
          if (last && haversineMeters(last.lat, last.lng, next.lat, next.lng) < MIN_WAYPOINT_DISTANCE_M) {
            return prev
          }
          return [...prev, next]
        })
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Mapa: se crea al montar, se destruye al desmontar.
  useEffect(() => {
    if (!containerRef.current) return
    const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false }).setView(
      DEFAULT_CENTER,
      DEFAULT_ZOOM
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => {
      setManualPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
    })
    markersLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    // El contenedor puede no tener aún su tamaño final en el primer
    // render (el formulario acaba de aparecer) — Leaflet necesita que se
    // le avise para recalcular los tiles.
    const t = setTimeout(() => map.invalidateSize(), 100)

    return () => {
      clearTimeout(t)
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
    }
  }, [])

  // Centrar el mapa la primera vez que llega una posición (y no volver a
  // moverlo solo, para no pelearse con el usuario si ya lo ha movido).
  useEffect(() => {
    if (!mapRef.current || hasCenteredRef.current || !effectivePos) return
    mapRef.current.setView([effectivePos.lat, effectivePos.lng], 15)
    hasCenteredRef.current = true
  }, [effectivePos])

  // Redibujar los marcadores: puntos grises para las ubicaciones
  // detectadas, uno verde más grande para la seleccionada por defecto
  // (la última), o uno azul si se ha elegido a mano en el mapa.
  useEffect(() => {
    const layer = markersLayerRef.current
    if (!layer) return
    layer.clearLayers()

    waypoints.forEach((wp) => {
      const isAutoSelected = !manualPosition && wp === lastWaypoint
      L.marker([wp.lat, wp.lng], {
        icon: makeDotIcon(isAutoSelected ? '#16a34a' : '#94a3b8', isAutoSelected ? 20 : 14),
      })
        .addTo(layer)
        .on('click', () => setManualPosition(wp))
    })

    if (manualPosition) {
      L.marker([manualPosition.lat, manualPosition.lng], {
        icon: makeDotIcon('#2563eb', 22),
      }).addTo(layer)
    }
  }, [waypoints, manualPosition, lastWaypoint])

  // Avisar al formulario de cuál es la posición efectiva a guardar.
  useEffect(() => {
    onChange(effectivePos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePos?.lat, effectivePos?.lng])

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs mb-2">
        {status === 'locating' && waypoints.length === 0 && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Obteniendo ubicación...
          </span>
        )}
        {effectivePos && (
          <span className="inline-flex items-center gap-1.5 text-green-700">
            <MapPin className="w-3.5 h-3.5" />
            {manualPosition
              ? 'Ubicación elegida en el mapa'
              : waypoints.length > 1
                ? `${waypoints.length} ubicaciones detectadas — toca el mapa para elegir`
                : 'Ubicación capturada'}
          </span>
        )}
        {status === 'denied' && !effectivePos && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <MapPinOff className="w-3.5 h-3.5" />
            Ubicación no disponible — puedes marcarla a mano en el mapa
          </span>
        )}
      </div>

      <div ref={containerRef} className="w-full h-48 rounded-lg border border-border overflow-hidden" />

      {manualPosition && (
        <button
          type="button"
          onClick={() => setManualPosition(null)}
          className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <LocateFixed className="w-3 h-3" />
          Volver a la última ubicación detectada automáticamente
        </button>
      )}
    </div>
  )
}
