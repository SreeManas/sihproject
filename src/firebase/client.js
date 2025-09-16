import { initializeApp } from 'firebase/app'
import { getFirestore, serverTimestamp } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { firebaseConfig } from './firebaseConfig.js'

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const ts = serverTimestamp
