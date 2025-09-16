import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { listenReports } from '../services/reportService.js'
import { aggregateToHeatFeatures, postsToGeoJSON, hexbinAggregate } from '../utils/socialHotspotUtils.js'
import socialMap from '../services/socialMapService.js'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.REACT_APP_MAPBOX_TOKEN || ''

const DEFAULT_CENTER = [78.9629, 20.5937]
const DEFAULT_ZOOM = 4.2

export default function Dashboard() {
  const mapRef = useRef(null)
  const [reports, setReports] = useState([])
  const [showReports, setShowReports] = useState(true)
  const [showSocial, setShowSocial] = useState(true)
  const [dateRange, setDateRange] = useState('24h')
  const [hazardFilter, setHazardFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [socialPosts, setSocialPosts] = useState([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [loadingSocial, setLoadingSocial] = useState(false)

  useEffect(() => listenReports(setReports), [])

  const refreshSocial = useCallback(async () => {
    setLoadingSocial(true)
    try {
      const posts = await socialMap.fetchSocialForMap({ location: 'India', maxResults: 70 })
      setSocialPosts(posts)
    } catch (e) {
      console.error('Social fetch error', e)
    } finally {
      setLoadingSocial(false)
    }
  }, [])

  useEffect(() => {
    if (mapRef.current) return
    const map = new mapboxgl.Map({
      container: 'map-root',
      style: 'mapbox://styles/mapbox/light-v11',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.on('load', () => setMapLoaded(true))
    mapRef.current = map
    return () => map.remove()
  }, [])

  const filteredSocial = useMemo(() => {
    const now = Date.now()
    const ranges = { '1h':3600000,'6h':21600000,'24h':86400000,'7d':604800000,'30d':2592000000 }
    const cutoff = now - (ranges[dateRange] || ranges['24h'])
    return socialPosts.filter(p => {
      const ts = new Date(p.timestamp || p.processedAt || Date.now()).getTime()
      if (ts < cutoff) return false
      if (hazardFilter !== 'all' && (p.hazardLabel || 'Other') !== hazardFilter) return false
      if (sourceFilter !== 'all' && (p.platform || 'unknown') !== sourceFilter) return false
      return Number.isFinite(p.lat) && Number.isFinite(p.lon)
    })
  }, [socialPosts, dateRange, hazardFilter, sourceFilter])

  const heatGeo = useMemo(() => aggregateToHeatFeatures(filteredSocial), [filteredSocial])
  const pointsGeo = useMemo(() => postsToGeoJSON(filteredSocial), [filteredSocial])
  const hexGeo = useMemo(() => hexbinAggregate(filteredSocial, { cellSize: 0.3 }), [filteredSocial])

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    const ensureSrc = (id, data) => {
      if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data })
      else map.getSource(id)?.setData?.(data)
    }

    // Reports points (user uploads)
    const reportsData = {
      type: 'FeatureCollection',
      features: (reports || [])
        .filter(r => Number.isFinite(r?.location?.longitude) && Number.isFinite(r?.location?.latitude))
        .map(r => ({
          type: 'Feature',
          properties: {
            id: r.id || `report_${Math.random()}`,
            hazardType: r.hazardType || 'Other',
            thumbUrl: r.thumbUrl || null,
            fileUrl: r.fileUrl || null,
            weight: Math.max(0.5, Math.min(10, r.priorityScore || 1)),
          },
          geometry: { type: 'Point', coordinates: [r.location.longitude, r.location.latitude] },
        }))
    }
    ensureSrc('reports', reportsData)

    // Reports heat source uses same data but Mapbox heatmap expects GeoJSON with properties.weight
    ensureSrc('reports-heat', reportsData)

    if (!map.getLayer('reports-clusters')) {
      map.addLayer({ id:'reports-clusters', type:'circle', source:'reports', filter:['has','point_count'], paint:{
        'circle-color':['step',['get','point_count'],'#90cdf4',20,'#63b3ed',50,'#4299e1',100,'#3182ce'],
        'circle-radius':['step',['get','point_count'],12,20,20,50,28,100,36],
      }})
      map.addLayer({ id:'reports-cluster-count', type:'symbol', source:'reports', filter:['has','point_count'], layout:{ 'text-field':['get','point_count_abbreviated'], 'text-size':12 }, paint:{ 'text-color':'#1a365d' } })
      map.addLayer({ id:'reports-unclustered', type:'circle', source:'reports', filter:['!',['has','point_count']], paint:{ 'circle-color':'#2b6cb0','circle-radius':6,'circle-stroke-width':1,'circle-stroke-color':'#fff' } })
      // Reports heatmap layer (visualize uploads density)
      map.addLayer({ id:'reports-heat-layer', type:'heatmap', source:'reports-heat', maxzoom:12, layout:{ visibility: showReports?'visible':'none' }, paint:{
        'heatmap-weight':['interpolate',['linear'],['get','weight'],0,0,10,1],
        'heatmap-intensity':0.7,
        'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(0,0,0,0)',0.2,'#c6f6d5',0.4,'#9ae6b4',0.6,'#68d391',0.8,'#48bb78',1,'#2f855a'],
        'heatmap-radius':['interpolate',['linear'],['zoom'],0,2,10,18],
        'heatmap-opacity':0.6,
      }})
    }
    map.setLayoutProperty('reports-clusters','visibility', showReports?'visible':'none')
    map.setLayoutProperty('reports-cluster-count','visibility', showReports?'visible':'none')
    map.setLayoutProperty('reports-unclustered','visibility', showReports?'visible':'none')
    if (map.getLayer('reports-heat-layer')) map.setLayoutProperty('reports-heat-layer','visibility', showReports?'visible':'none')

    // Social
    ensureSrc('social-heat', heatGeo)
    ensureSrc('social-points', pointsGeo)
    ensureSrc('social-hex', hexGeo)

    if (!map.getLayer('social-heat-layer')) {
      map.addLayer({ id:'social-heat-layer', type:'heatmap', source:'social-heat', maxzoom:12, layout:{ visibility: showSocial?'visible':'none' }, paint:{
        'heatmap-weight':['interpolate',['linear'],['get','weight'],0,0,10,1],
        'heatmap-intensity':0.8,
        'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(33,102,172,0)',0.2,'rgb(103,169,207)',0.4,'rgb(209,229,240)',0.6,'rgb(253,219,199)',0.8,'rgb(239,138,98)',1,'rgb(178,24,43)'],
        'heatmap-radius':['interpolate',['linear'],['zoom'],0,2,10,20],
        'heatmap-opacity':0.8,
      }})
    } else {
      map.setLayoutProperty('social-heat-layer','visibility', showSocial?'visible':'none')
    }

    if (!map.getLayer('social-points-layer')) {
      map.addLayer({ id:'social-points-layer', type:'circle', source:'social-points', minzoom:3, layout:{ visibility: showSocial?'visible':'none' }, paint:{ 'circle-radius':4,'circle-color':'#dd6b20','circle-stroke-width':1,'circle-stroke-color':'#fff' } })
    } else {
      map.setLayoutProperty('social-points-layer','visibility', showSocial?'visible':'none')
    }

  }, [reports, heatGeo, pointsGeo, hexGeo, showReports, showSocial, mapLoaded])

  useEffect(() => { refreshSocial() }, [refreshSocial])

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Controls */}
      <div className="p-3 bg-white border-b flex items-center gap-3">
        <div className="font-semibold text-blue-700">Dashboard</div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={showReports} onChange={e=>setShowReports(e.target.checked)} /> Show Reports</label>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={showSocial} onChange={e=>setShowSocial(e.target.checked)} /> Show Social Hotspots</label>
          <select className="text-sm border rounded px-2 py-1" value={dateRange} onChange={e=>setDateRange(e.target.value)}>
            <option value="1h">1h</option><option value="6h">6h</option><option value="24h">24h</option><option value="7d">7d</option><option value="30d">30d</option>
          </select>
          <select className="text-sm border rounded px-2 py-1" value={hazardFilter} onChange={e=>setHazardFilter(e.target.value)}>
            <option value="all">All</option><option value="Tsunami">Tsunami</option><option value="Cyclone">Cyclone</option><option value="Flood">Flood</option><option value="Earthquake">Earthquake</option><option value="Other">Other</option>
          </select>
          <select className="text-sm border rounded px-2 py-1" value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}>
            <option value="all">All sources</option><option value="twitter">Twitter</option><option value="youtube">YouTube</option><option value="facebook">Facebook</option>
          </select>
          <button onClick={refreshSocial} className="px-3 py-1.5 bg-blue-600 text-white rounded">Refresh</button>
        </div>
      </div>
      {/* Map */}
      <div id="map-root" className="flex-1" />
      {loadingSocial && (<div className="absolute top-20 right-4 bg-white shadow px-3 py-2 rounded text-sm">Loading social hotspots...</div>)}
    </div>
  )
}
