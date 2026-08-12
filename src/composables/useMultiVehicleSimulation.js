import { gcj02ToWGS84, wgs84ToGCJ02, haversineDistance } from '../utils/geo.js'

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY

export function useMultiVehicleSimulation() {
  function bearing(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180
    const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180)
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng)
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
  }

  function pickSurroundingCities(cities, epicenter, count = 3) {
    if (cities.length <= count) return [...cities]

    const withBearing = cities.map(c => ({
      ...c,
      _bearing: bearing(epicenter.lat, epicenter.lon, c.lat, c.lon),
    }))
    withBearing.sort((a, b) => a._bearing - b._bearing)

    const idealInterval = 360 / count
    const selected = []
    const used = new Set()

    for (let i = 0; i < count; i++) {
      const targetAngle = i * idealInterval
      let bestIdx = -1
      let bestDiff = Infinity

      for (let j = 0; j < withBearing.length; j++) {
        if (used.has(j)) continue
        const diff = Math.abs(withBearing[j]._bearing - targetAngle)
        const adjustedDiff = Math.min(diff, 360 - diff)
        if (adjustedDiff < bestDiff) {
          bestDiff = adjustedDiff
          bestIdx = j
        }
      }

      if (bestIdx >= 0) {
        used.add(bestIdx)
        selected.push(withBearing[bestIdx])
      }
    }

    return selected.sort((a, b) => a._bearing - b._bearing)
  }

  async function searchNearbyCities(epicenter) {
    if (!epicenter) return []
    if (!AMAP_KEY) {
      console.warn('[multiVehicle] VITE_AMAP_KEY not set')
      return []
    }

    const gcj = wgs84ToGCJ02(epicenter.lat, epicenter.lon)
    const allCities = []

    async function tryFetch(params, label) {
      try {
        const qs = new URLSearchParams({ key: AMAP_KEY, ...params })
        const url = `https://restapi.amap.com/v3/place/around?${qs}`
        const res = await fetch(url)
        const data = await res.json()

        if (data.status !== '1' || !data.pois || !data.pois.length) {
          return
        }

        for (const poi of data.pois) {
          if (!poi.location || typeof poi.location !== 'string') continue
          const [gcjLng, gcjLat] = poi.location.split(',').map(Number)
          if (isNaN(gcjLng) || isNaN(gcjLat)) continue
          const wgs = gcj02ToWGS84(gcjLat, gcjLng)
          const name = poi.name || ''
          if (allCities.find(c => c.name === name)) continue
          allCities.push({
            name,
            district: poi.adname || '',
            address: poi.address || '',
            gcjLat, gcjLng,
            lat: wgs.lat,
            lon: wgs.lng,
            distance: poi.distance ? parseInt(poi.distance) : 0,
          })
        }
      } catch (e) {
        console.warn(`[multiVehicle] ${label} failed:`, e)
      }
    }

    const location = `${gcj.lng},${gcj.lat}`

    await tryFetch({ location, radius: 300000, keywords: '市政府', offset: 25 }, 'keyword:市政府')
    await tryFetch({ location, radius: 300000, keywords: '县政府', offset: 25 }, 'keyword:县政府')
    await tryFetch({ location, radius: 300000, keywords: '市', offset: 25 }, 'keyword:市')

    if (allCities.length < 3) {
      await tryFetch({ location, radius: 500000, keywords: '市政府', offset: 25 }, 'keyword:市政府(500km)')
    }
    if (allCities.length < 3) {
      await tryFetch({ location, radius: 500000, keywords: '县', offset: 25 }, 'keyword:县(500km)')
    }

    if (allCities.length < 3) {
      const provinceCities = await searchByDistrict(epicenter)
      for (const c of provinceCities) {
        if (!allCities.find(x => x.name === c.name)) {
          allCities.push(c)
        }
      }
    }

    allCities.sort((a, b) => a.distance - b.distance)

    const deduped = []
    const seen = new Set()
    for (const c of allCities) {
      if (seen.has(c.name)) continue
      seen.add(c.name)
      deduped.push(c)
    }
    return deduped
  }

  async function searchByDistrict(epicenter) {
    try {
      const gcj = wgs84ToGCJ02(epicenter.lat, epicenter.lon)
      const regeoUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${gcj.lng},${gcj.lat}`
      const regeoRes = await fetch(regeoUrl)
      const regeoData = await regeoRes.json()

      if (regeoData.status !== '1' || !regeoData.regeocode) return []

      const addrComp = regeoData.regeocode.addressComponent
      const province = addrComp.province

      const distUrl = `https://restapi.amap.com/v3/config/district?key=${AMAP_KEY}&keywords=${encodeURIComponent(province)}&subdistrict=1`
      const distRes = await fetch(distUrl)
      const distData = await distRes.json()

      if (distData.status !== '1' || !distData.districts?.length) return []

      const provinceDist = distData.districts[0]
      const cities = provinceDist.districts || []

      const result = []
      for (const city of cities) {
        if (!city.center) continue
        const [gcjLng, gcjLat] = city.center.split(',').map(Number)
        if (isNaN(gcjLng) || isNaN(gcjLat)) continue
        const wgs = gcj02ToWGS84(gcjLat, gcjLng)
        const dist = haversineDistance(epicenter.lat, epicenter.lon, wgs.lat, wgs.lng)
        result.push({
          name: city.name,
          district: city.name,
          address: '',
          lat: wgs.lat,
          lon: wgs.lng,
          distance: Math.round(dist),
        })
      }

      result.sort((a, b) => a.distance - b.distance)
      return result
    } catch (e) {
      console.warn('[multiVehicle] searchByDistrict failed:', e)
      return []
    }
  }

  async function getDrivingRoute(origin, destination) {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes?.length) return null
      const route = data.routes[0]
      return {
        points: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distance: Math.round(route.distance),
        duration: Math.round(route.duration),
      }
    } catch (e) {
      console.error('OSRM 路线获取失败:', e)
      return null
    }
  }

  return { searchNearbyCities, pickSurroundingCities, getDrivingRoute }
}