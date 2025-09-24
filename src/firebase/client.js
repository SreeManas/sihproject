import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import 'firebase/compat/storage'
import { firebaseConfig } from './firebaseConfig.js'

const app = firebase.initializeApp(firebaseConfig)
export const db = app.firestore()
export const storage = app.storage()
export const ts = firebase.firestore.FieldValue.serverTimestamp()
