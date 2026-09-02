import { useState, useEffect, useCallback } from 'react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { ensureIds, EMPTY_MAINT } from '../utils'

function buildsRef(uid) {
  return collection(db, 'users', uid, 'builds')
}

export function useBuilds(uid) {
  const [buildList, setBuildList] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!uid) return
    const q = query(buildsRef(uid), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setBuildList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [uid])

  const createBuild = useCallback(async name => {
    const ref = await addDoc(buildsRef(uid), {
      name,
      items:           [],
      trash:           [],
      maintenance_log: EMPTY_MAINT,
      links:           [],
      isFavourite:     false,
      createdAt:       serverTimestamp(),
      updatedAt:       serverTimestamp(),
    })
    return ref.id
  }, [uid])

  const saveBuild = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'users', uid, 'builds', id), {
      ...data,
      items:           data.items || [],
      trash:           data.trash || [],
      maintenance_log: data.maintenance_log || EMPTY_MAINT,
      links:           data.links || [],
      updatedAt:       serverTimestamp(),
    })
  }, [uid])

  const deleteBuild = useCallback(async id => {
    await deleteDoc(doc(db, 'users', uid, 'builds', id))
  }, [uid])

  const renameBuild = useCallback(async (id, name) => {
    await updateDoc(doc(db, 'users', uid, 'builds', id), { name, updatedAt: serverTimestamp() })
  }, [uid])

  const setFavourite = useCallback(async (id, isFavourite) => {
    await updateDoc(doc(db, 'users', uid, 'builds', id), { isFavourite })
  }, [uid])

  return { buildList, loading, createBuild, saveBuild, deleteBuild, renameBuild, setFavourite }
}
