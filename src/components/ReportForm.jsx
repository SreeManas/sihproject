import React, { useEffect, useState } from 'react'
import storageService from '../services/storageService.js'
import offlineSync from '../utils/offlineSync.js'
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const HAZARDS = ['Tsunami', 'Storm Surge', 'High Waves', 'Flood', 'Earthquake', 'Other']

export default function ReportForm() {
  const [hazardType, setHazardType] = useState('Tsunami')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [thumbPreview, setThumbPreview] = useState(null)
  const [coords, setCoords] = useState({ latitude: null, longitude: null })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setStatus('Location permission denied. You can still submit.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    if (f && /^image\//i.test(f.type)) setThumbPreview(URL.createObjectURL(f))
    else setThumbPreview(null)
  }

  const submitOnline = async () => {
    const db = getFirestore()
    const auth = getAuth()
    const user = auth.currentUser
    let fileUrl = null, thumbUrl = null
    if (file) {
      const up = await storageService.uploadFile(file, 'reports')
      fileUrl = up.fileUrl; thumbUrl = up.thumbUrl
    }
    await addDoc(collection(db, 'reports'), {
      hazardType,
      description,
      location: { latitude: coords.latitude, longitude: coords.longitude },
      fileUrl, thumbUrl,
      userId: user?.uid || null,
      createdAt: serverTimestamp(),
    })
  }

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setStatus('')
    try {
      if (navigator.onLine) {
        await submitOnline()
        setStatus('Report submitted successfully!')
      } else {
        await offlineSync.enqueueReport({ hazardType, description, coords, fileName: file?.name || null })
        setStatus('Offline: report queued, will sync automatically when online.')
      }
      setDescription('')
      setFile(null)
      setThumbPreview(null)
    } catch (e) {
      await offlineSync.enqueueReport({ hazardType, description, coords, fileName: file?.name || null })
      setStatus('Error: queued report for later sync.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold mb-4">Citizen Report</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Hazard Type</label>
          <select className="input" value={hazardType} onChange={(e) => setHazardType(e.target.value)}>
            {HAZARDS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Description</label>
          <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you see…" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Photo/Video (optional)</label>
          <input className="input" type="file" accept="image/*,video/*" onChange={handleFile} />
          {thumbPreview && (<div className="mt-2"><img alt="preview" src={thumbPreview} className="max-w-xs rounded border" /></div>)}
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Location:</span>{' '}
          {coords.latitude && coords.longitude ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : 'Detecting…'}
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit Report'}
        </button>
        {status && <p className="text-sm mt-2 text-gray-700">{status}</p>}
      </form>
    </div>
  )
}
