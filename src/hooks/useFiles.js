import { useState, useEffect, useCallback } from 'react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'

// Files live in their own subcollection (one doc per file) so that the build
// doc itself stays well under Firestore's 1 MiB document limit.
export function filesRef(uid, buildId) {
  return collection(db, 'users', uid, 'builds', buildId, 'files')
}

// Firestore docs max out at 1 MiB; leave headroom for the other fields.
export const MAX_DATA_LEN = 900_000

export function useFiles(uid, buildId) {
  const [files,   setFiles]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid || !buildId) return
    setLoading(true)
    const q = query(filesRef(uid, buildId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [uid, buildId])

  const addFile = useCallback(async file => {
    await addDoc(filesRef(uid, buildId), { ...file, createdAt: serverTimestamp() })
  }, [uid, buildId])

  const updateFile = useCallback(async (id, changes) => {
    await updateDoc(doc(filesRef(uid, buildId), id), changes)
  }, [uid, buildId])

  const deleteFile = useCallback(async id => {
    await deleteDoc(doc(filesRef(uid, buildId), id))
  }, [uid, buildId])

  return { files, loading, addFile, updateFile, deleteFile }
}

function readAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
    img.src = url
  })
}

// Turns a picked/pasted/dropped File into a data URL small enough to store.
// Images are downscaled and re-encoded as JPEG until they fit; other files are
// stored as-is and rejected (returns null) if too large.
export async function fileToData(file) {
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
    const img = await loadImage(file)
    for (const maxDim of [1600, 1200, 900, 600]) {
      const scale  = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      for (const q of [0.85, 0.7, 0.55]) {
        const data = canvas.toDataURL('image/jpeg', q)
        if (data.length <= MAX_DATA_LEN) return { data, type: 'image/jpeg' }
      }
    }
    return null
  }
  const data = await readAsDataURL(file)
  if (data.length > MAX_DATA_LEN) return null
  return { data, type: file.type || 'application/octet-stream' }
}
