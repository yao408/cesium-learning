// useEarthquakeScenario.js
import { gcj02ToWGS84, haversineDistance } from '../utils/geo.js'

export function useEarthquakeScenario() {
  async function fetchDistrict(centerLat, centerLon) {
    const key = import.meta.env.VITE_AMAP_KEY
    if (!key) return []

    let adcode = ''
    try {
      const regeoUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${centerLon},${centerLat}&extensions=base`
      const regeoRes = await fetch(regeoUrl)
      const regeoData = await regeoRes.json()
      if (regeoData.status === '1' && regeoData.regeocode) {
        adcode = regeoData.regeocode.addressComponent.adcode
      }
    } catch (e) {
      console.warn('逆地理编码失败:', e.message)
    }

    if (!adcode) return []

    let townships = []
    try {
      const distUrl = `https://restapi.amap.com/v3/config/district?key=${key}&keywords=${adcode}&subdistrict=2&extensions=base`
      const distRes = await fetch(distUrl)
      const distData = await distRes.json()
      if (distData.status === '1' && distData.districts.length > 0) {
        const county = distData.districts[0]
        if (county.districts) {
          townships = county.districts
        }
      }
    } catch (e) {
      console.warn('行政区划查询失败:', e.message)
    }

    const results = []
    townships.forEach(t => {
      if (!t.center) return
      const [gcjLng, gcjLat] = t.center.split(',').map(Number)
      const wgs = gcj02ToWGS84(gcjLat, gcjLng)
      const dist = haversineDistance(centerLat, centerLon, wgs.lat, wgs.lng) / 1000
      results.push({
        name: t.name,
        lat: wgs.lat,
        lon: wgs.lng,
        dist,
        type: t.level === 'street' ? 'town' : 'village',
        displayName: t.name,
      })
    })

    return results.sort((a, b) => a.dist - b.dist)
  }

  async function generateScenarioFromEarthquake(
    centerLon,
    centerLat,
    options
  ) {
    const {
      viewer,
      villageRadius,
      store,
      addVillageDot,
      addWatchtower,
      clearAll,
      clearGeoJSON,
      setLoading,
      setWarning,
      setGeoJSONCount
    } = options

    if (!viewer) return

    clearGeoJSON()
    setLoading(true)
    setWarning('')

    const places = await fetchDistrict(centerLat, centerLon)
    const villages = []
    const watchtowers = []

    const dam = { name: '堰塞坝', lng: centerLon + 0.05, lat: centerLat - 0.1, height: 45 }
    const dispatchCenter = { name: '指挥中心', lng: centerLon, lat: centerLat, population: 80000 }

    // 按半径筛选村庄
    const radiusKm = villageRadius
    const nearby = places.filter(p => p.dist <= radiusKm)

    if (nearby.length === 0) {
      setWarning(`⚠️ ${radiusKm}km 内未找到乡镇数据，请扩大半径`)
    } else {
      setWarning('')
    }

    clearAll()
    nearby.forEach((p, idx) => {
      addVillageDot(p.lon, p.lat, p.displayName || p.name)
      villages.push({ name: p.displayName || p.name, lng: p.lon, lat: p.lat, population: 1000 + idx * 500, elevation: 1200 + idx * 100 })
    })

    // 指挥中心设在最近的乡镇
    const townPlaces = nearby.filter(p => p.type === 'town')
    if (townPlaces.length > 0) {
      dispatchCenter.name = townPlaces[0].name
      dispatchCenter.lng = townPlaces[0].lon
      dispatchCenter.lat = townPlaces[0].lat
    }

    const towerDefs = [
      { name: '瞭望塔1号', lng: centerLon - 0.05, lat: centerLat + 0.12, height: 25, elevation: 2400 },
      { name: '瞭望塔2号', lng: centerLon + 0.1, lat: centerLat - 0.08, height: 30, elevation: 2600 },
    ]
    towerDefs.forEach(t => {
      addWatchtower(t.lng, t.lat, t.name)
      watchtowers.push({ name: t.name, lng: t.lng, lat: t.lat, height: t.height, elevation: t.elevation })
    })

    setGeoJSONCount(nearby.length)
    store.setHazards(villages)
    store.setWatchtowers(watchtowers)
    store.setFloodLevel(0, dam)
    store.setDispatchCenter(dispatchCenter)

    setLoading(false)
  }

  return { fetchDistrict, generateScenarioFromEarthquake }
}