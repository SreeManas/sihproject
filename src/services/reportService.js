import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage, ts } from '../firebase/client.js'

const reportsCol = collection(db, 'reports')

export async function uploadPhoto(file) {
  if (!file) return null
  const fileRef = ref(storage, `reports/${Date.now()}-${file.name}`)
  const snap = await uploadBytes(fileRef, file)
  return await getDownloadURL(snap.ref)
}

export async function submitReport({ hazardType, description, photoFile, lat, lon }) {
  const photoUrl = await uploadPhoto(photoFile)
  const data = {
    hazardType,
    description,
    photoUrl: photoUrl || null,
    lat,
    lon,
    timestamp: ts(),
  }
  await addDoc(reportsCol, data)
  return data
}

export function listenReports(callback) {
  const q = query(reportsCol, orderBy('timestamp', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    callback(list)
  })
}
