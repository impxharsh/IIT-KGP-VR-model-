import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  loadLocations,
  searchLocations,
  findMainBuilding,
  haversine,
  formatDistance,
  walkMinutes,
  displayCode,
  displayTitle,
} from './locationUtils'

// Walking route from a free public OSM-based router (no API key). If it fails we just
// show the straight-line distance.
async function fetchWalkingRoute(from, to, signal) {
  const url =
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('route failed')
  const data = await res.json()
  const r = data.routes?.[0]
  if (!r) throw new Error('no route')
  return {
    meters: r.distance,
    latlngs: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  }
}

const panelStyle = {
  position: 'absolute',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 20,
  width: 'min(440px, calc(100vw - 24px))',
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  color: '#0f172a',
}

const cardStyle = {
  background: 'rgba(255,255,255,0.97)',
  borderRadius: 12,
  boxShadow: '0 6px 24px rgba(15,23,42,0.28)',
  overflow: 'hidden',
}

export default function MapSearch() {
  const [locations, setLocations] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | empty
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [route, setRoute] = useState(null) // { forId, meters }
  const [showList, setShowList] = useState(false)

  const mapDivRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    loadLocations().then((list) => {
      if (cancelled) return
      setLocations(list)
      setStatus(list.length ? 'ready' : 'empty')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const mainBuilding = useMemo(() => findMainBuilding(locations), [locations])
  const results = useMemo(() => searchLocations(locations, query), [locations, query])

  // Build / rebuild the 2D map whenever a place is chosen.
  useEffect(() => {
    if (!selected || !mapDivRef.current) return

    const map = L.map(mapDivRef.current, { zoomControl: true, attributionControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const dest = [selected.lat, selected.lng]
    const origin = [mainBuilding.lat, mainBuilding.lng]

    L.circleMarker(origin, {
      radius: 9, color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 1,
    }).addTo(map).bindTooltip('Main Building', { permanent: true, direction: 'top', offset: [0, -8] })

    L.circleMarker(dest, {
      radius: 10, color: '#ffffff', weight: 2, fillColor: '#dc2626', fillOpacity: 1,
    }).addTo(map).bindTooltip(displayCode(selected) || selected.label, {
      permanent: true, direction: 'top', offset: [0, -8],
    })

    const straight = L.polyline([origin, dest], {
      color: '#64748b', weight: 3, dashArray: '6 8',
    }).addTo(map)
    map.fitBounds(straight.getBounds(), { padding: [40, 40], maxZoom: 18 })

    const ctrl = new AbortController()
    let routeLine = null
    fetchWalkingRoute(mainBuilding, selected, ctrl.signal)
      .then((r) => {
        routeLine = L.polyline(r.latlngs, { color: '#16a34a', weight: 5 }).addTo(map)
        map.fitBounds(routeLine.getBounds(), { padding: [40, 40], maxZoom: 18 })
        setRoute({ forId: selected.id, meters: r.meters })
      })
      .catch(() => {})

    return () => {
      ctrl.abort()
      map.remove()
    }
  }, [selected, mainBuilding])

  const straightMeters = selected ? haversine(mainBuilding, selected) : 0
  const walkMeters = route && selected && route.forId === selected.id ? route.meters : null

  function choose(loc) {
    setSelected(loc)
    setQuery(displayCode(loc) || loc.label)
    setShowList(false)
  }

  function onSubmit(e) {
    e.preventDefault()
    if (results[0]) choose(results[0])
  }

  return (
    <div style={panelStyle}>
      <form onSubmit={onSubmit} style={{ ...cardStyle, display: 'flex', alignItems: 'center' }}>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowList(true)
          }}
          onFocus={() => setShowList(true)}
          placeholder={
            status === 'loading'
              ? 'Loading places…'
              : 'Search code + number, e.g. A 26, B 74, C1 158 (or a name)'
          }
          style={{
            flex: 1, border: 'none', outline: 'none', padding: '13px 14px',
            fontSize: 15, background: 'transparent',
          }}
        />
        {selected && (
          <button
            type="button"
            onClick={() => {
              setSelected(null)
              setRoute(null)
              setQuery('')
            }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, padding: '0 8px', color: '#64748b' }}
            aria-label="Clear"
          >
            ×
          </button>
        )}
        <button
          type="submit"
          style={{
            border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer',
            padding: '13px 18px', fontSize: 15, fontWeight: 600,
          }}
        >
          Search
        </button>
      </form>

      {status === 'empty' && (
        <div style={{ ...cardStyle, marginTop: 8, padding: 12, fontSize: 13, color: '#b45309' }}>
          No places found. Put your Google Maps export at <b>public/locations.kml</b> (or locations.csv).
        </div>
      )}

      {showList && query.trim() && status === 'ready' && (
        <div style={{ ...cardStyle, marginTop: 8 }}>
          {results.length === 0 ? (
            <div style={{ padding: 12, fontSize: 14, color: '#64748b' }}>No match for “{query}”.</div>
          ) : (
            results.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => choose(loc)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'baseline', width: '100%', textAlign: 'left',
                  padding: '10px 14px', border: 'none', borderBottom: '1px solid #e2e8f0',
                  background: 'transparent', cursor: 'pointer', fontSize: 14,
                }}
              >
                <b style={{ minWidth: 84 }}>{displayCode(loc) || '—'}</b>
                <span style={{ flex: 1 }}>{displayCode(loc) ? loc.label : loc.rawName}</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>
                  {formatDistance(haversine(mainBuilding, loc))}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {selected && (
        <div style={{ ...cardStyle, marginTop: 8 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{displayTitle(selected)}</div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>
              {walkMeters != null ? (
                <>
                  <b>{formatDistance(walkMeters)}</b> walking from Main Building · ~{walkMinutes(walkMeters)} min
                  <span style={{ color: '#64748b' }}> ({formatDistance(straightMeters)} straight line)</span>
                </>
              ) : (
                <>
                  <b>{formatDistance(straightMeters)}</b> straight line from Main Building · ~
                  {walkMinutes(straightMeters)} min walk
                </>
              )}
            </div>
          </div>
          <div ref={mapDivRef} style={{ height: 300, width: '100%' }} />
        </div>
      )}
    </div>
  )
}
