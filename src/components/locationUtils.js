// Helpers for the 2D map search: load pins exported from Google Maps (KML or CSV),
// split names like "A-12 Some Place" into code + number, search them, measure distance.

// Fallback origin. If your export has a pin named "Main Building", that pin is used instead.
export const DEFAULT_MAIN_BUILDING = { name: 'Main Building', lat: 22.3145644, lng: 87.3116285 }

const WALK_METERS_PER_MIN = 80 // ~4.8 km/h

// ---------- distance ----------

export function haversine(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`
}

export function walkMinutes(m) {
  return Math.max(1, Math.round(m / WALK_METERS_PER_MIN))
}

// ---------- names -> code + number ----------

// "A-12 Computer Lab" -> { code: 'A', no: '12', label: 'Computer Lab' }
// "NR 204"            -> { code: 'NR', no: '204', label: '' }
// "Central Library"   -> { code: '', no: '', label: 'Central Library' }
// Also understands Google-Maps style block labels (a number range = flats/rooms in one block):
//   "B: 73-74"     -> code B,   73-74
//   "C1: 160-157"  -> code C1,  160-157 (any order)
//   "1BR: 1-12"    -> code 1BR, 1-12
//   "RH1-12"       -> code RH,  1-12
//   "A 26"         -> code A,   26
const COLON_FORM = /^([A-Za-z0-9]{1,6})\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?\b[\s\-:–—,]*(.*)$/
const PLAIN_FORM = /^([A-Za-z]{1,6})[\s\-_.]*(\d+[A-Za-z]?)(?:\s*[-–]\s*(\d+))?\b[\s\-:–—,]*(.*)$/

export function parseName(raw) {
  const name = raw.trim()
  const m = name.match(COLON_FORM) || name.match(PLAIN_FORM)
  if (m) return { code: m[1].toUpperCase(), no: m[2].toUpperCase(), noEnd: m[3] || '', label: m[4].trim() }
  return { code: '', no: '', noEnd: '', label: name }
}

function makeLocation(rawName, lat, lng, index) {
  const { code, no, noEnd, label } = parseName(rawName)

  // Every string that should find this place, e.g. block "B: 73-74" -> b73, b74, b7374
  const keys = new Set([normalize(rawName)])
  if (code && no) {
    const c = normalize(code)
    const lo = /^\d+$/.test(no) ? parseInt(no, 10) : NaN
    const hi = noEnd ? parseInt(noEnd, 10) : lo
    if (Number.isFinite(lo) && Number.isFinite(hi)) {
      const a = Math.min(lo, hi)
      const b = Math.max(lo, hi)
      for (let n = a; n <= Math.min(b, a + 300); n++) keys.add(`${c}${n}`)
      keys.add(`${c}${a}${b}`)
    } else {
      keys.add(c + normalize(no))
    }
  }

  return { id: `${index}-${rawName}`, rawName, code, no, noEnd, label, lat, lng, keys: [...keys] }
}

function normalize(s) {
  return s.toLowerCase().replace(/[\s\-–—_.:,]/g, '')
}

export function displayCode(loc) {
  if (!loc.code) return ''
  return loc.noEnd ? `${loc.code} ${loc.no}–${loc.noEnd}` : `${loc.code}-${loc.no}`
}

export function displayTitle(loc) {
  const c = displayCode(loc)
  return c ? (loc.label ? `${c}  ${loc.label}` : c) : loc.label
}

// ---------- KML (Google My Maps -> menu -> Export to KML/KMZ, untick "KMZ") ----------

function decodeXml(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

export function parseKML(text) {
  const out = []
  const placemarks = text.match(/<Placemark[\s\S]*?<\/Placemark>/g) || []
  placemarks.forEach((pm, i) => {
    const nameMatch = pm.match(/<name>([\s\S]*?)<\/name>/)
    const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/)
    if (!nameMatch || !coordMatch) return

    const pts = coordMatch[1]
      .trim()
      .split(/\s+/)
      .map((p) => p.split(',').map(Number))
      .filter((p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    if (!pts.length) return

    // Pins have one point; if a building was drawn as a shape, use its centre.
    const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length
    const name = decodeXml(nameMatch[1]).trim()
    if (name) out.push(makeLocation(name, lat, lng, i))
  })
  return out
}

// ---------- CSV (name,lat,lng  -- or a Google "WKT" column like POINT (87.31 22.32)) ----------

function splitCsvLine(line) {
  const cells = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i++
      } else inQ = !inQ
    } else if (ch === ',' && !inQ) {
      cells.push(cur)
      cur = ''
    } else cur += ch
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

function toDecimal(deg, min, sec, hemi) {
  let v = parseFloat(deg) + (min ? parseFloat(min) / 60 : 0) + (sec ? parseFloat(sec) / 3600 : 0)
  if (hemi === 'S' || hemi === 'W') v = -v
  return v
}

// Reads a coordinate pair the way Google Maps shows/copies it. Accepts both:
//   22°18'41.9"N 87°18'20.8"E   (degrees-minutes-seconds; '' or " for seconds both work)
//   22.3116, 87.3058            (decimal)
export function parseCoordString(str) {
  if (!str) return null
  const dms = [
    ...str.matchAll(
      /(\d+(?:\.\d+)?)\s*°\s*(?:(\d+(?:\.\d+)?)\s*['′’]\s*)?(?:(\d+(?:\.\d+)?)\s*(?:["″”]|''|′′|’’)\s*)?([NSEWnsew])/g,
    ),
  ]
  if (dms.length === 2) {
    let lat = NaN
    let lng = NaN
    for (const m of dms) {
      const hemi = m[4].toUpperCase()
      const v = toDecimal(m[1], m[2], m[3], hemi)
      if (hemi === 'N' || hemi === 'S') lat = v
      else lng = v
    }
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
  }
  const m = str.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/)
  if (m) {
    const lat = parseFloat(m[1])
    const lng = parseFloat(m[2])
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
  }
  return null
}

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const head = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const find = (...names) => head.findIndex((h) => names.includes(h))
  const iName = find('name', 'title', 'label')
  const iLat = find('lat', 'latitude')
  const iLng = find('lng', 'lon', 'long', 'longitude')
  const iWkt = find('wkt')
  // One cell with "22.3158, 87.3066" (exactly what Google Maps copies when you click the coordinates)
  const iCoords = find('coords', 'coordinates', 'latlng', 'latlong', 'location', 'position')

  const out = []
  lines.slice(1).forEach((line, i) => {
    const c = splitCsvLine(line)
    let lat = NaN
    let lng = NaN
    if (iLat >= 0 && iLng >= 0) {
      lat = parseFloat(c[iLat])
      lng = parseFloat(c[iLng])
    } else if (iCoords >= 0) {
      const p = parseCoordString(c[iCoords])
      if (p) {
        lat = p.lat
        lng = p.lng
      }
    } else if (iWkt >= 0) {
      const m = c[iWkt].match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i)
      if (m) {
        lng = parseFloat(m[1])
        lat = parseFloat(m[2])
      }
    }
    const name = (iName >= 0 ? c[iName] : c[0]) || ''
    if (name && Number.isFinite(lat) && Number.isFinite(lng)) out.push(makeLocation(name, lat, lng, i))
  })
  return out
}

// Loads /locations.kml and /locations.csv (both live in the /public folder) and combines them.
// Rows without coordinates are skipped, so a half-filled sheet still works.
export async function loadLocations() {
  const sources = [
    ['/locations.kml', parseKML],
    ['/locations.csv', parseCSV],
  ]
  const all = []
  for (const [url, parse] of sources) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const text = await res.text()
      if (/^\s*<!doctype/i.test(text)) continue // dev-server fallback page = file doesn't exist
      all.push(...parse(text))
    } catch {
      /* skip this source */
    }
  }
  return all.map((loc, i) => ({ ...loc, id: `${i}-${loc.rawName}` }))
}

// ---------- search ----------

// Accepts "A12", "A 12", "a-12", or part of a name ("library").
export function searchLocations(locations, query, limit = 8) {
  const raw = query.trim().toLowerCase()
  if (!raw) return []
  const q = normalize(raw)

  const scored = []
  for (const loc of locations) {
    const name = loc.rawName.toLowerCase()
    let score = 0
    if (loc.keys.includes(q)) score = 100
    else if (loc.keys.some((k) => k.startsWith(q))) score = 80
    else if (name.startsWith(raw)) score = 60
    else if (name.includes(raw)) score = 40
    if (score) scored.push([score, loc])
  }
  scored.sort((a, b) => b[0] - a[0] || a[1].rawName.localeCompare(b[1].rawName, undefined, { numeric: true }))
  return scored.slice(0, limit).map((s) => s[1])
}

export function findMainBuilding(locations) {
  const hit = locations.find((l) => /^main\s*building$/i.test(l.rawName.trim()))
  return hit ? { name: 'Main Building', lat: hit.lat, lng: hit.lng } : DEFAULT_MAIN_BUILDING
}
