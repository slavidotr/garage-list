export const STATUS_OPTIONS = ['planned', 'ordered', 'installed', 'sold']

export const STATUS_INFO = {
  planned:   { symbol: '',   label: 'Planned',   colorVar: 'var(--s-planned)'   },
  ordered:   { symbol: '→ ', label: 'Ordered',   colorVar: 'var(--s-ordered)'   },
  installed: { symbol: '✓ ', label: 'Installed', colorVar: 'var(--s-installed)' },
  sold:      { symbol: '✗ ', label: 'Sold',      colorVar: 'var(--s-sold)'      },
}

export function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function ensureIds(items) {
  return (items || []).map(item => {
    const withId = item.id ? item : { ...item, id: newId() }
    if (withId.type === 'folder') {
      return { ...withId, children: ensureIds(withId.children) }
    }
    return withId
  })
}

export function findItem(items, id) {
  for (const item of items) {
    if (item.id === id) return item
    if (item.type === 'folder') {
      const found = findItem(item.children || [], id)
      if (found) return found
    }
  }
  return null
}

export function updateItem(items, id, changes) {
  return items.map(item => {
    if (item.id === id) return { ...item, ...changes }
    if (item.type === 'folder') return { ...item, children: updateItem(item.children || [], id, changes) }
    return item
  })
}

export function removeItem(items, id) {
  let removed = null
  let fromFolder = null
  function recurse(arr, folderName) {
    const out = []
    for (const item of arr) {
      if (item.id === id) {
        removed = item
        fromFolder = folderName
      } else if (item.type === 'folder') {
        out.push({ ...item, children: recurse(item.children || [], item.name) })
      } else {
        out.push(item)
      }
    }
    return out
  }
  const newItems = recurse(items, null)
  return { newItems, removed, fromFolder }
}

export function moveItem(items, id, dir) {
  function recurse(arr) {
    const idx = arr.findIndex(x => x.id === id)
    if (idx !== -1) {
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= arr.length) return arr
      const copy = [...arr]
      const [item] = copy.splice(idx, 1)
      copy.splice(newIdx, 0, item)
      return copy
    }
    return arr.map(item =>
      item.type === 'folder' ? { ...item, children: recurse(item.children || []) } : item
    )
  }
  return recurse(items)
}

export function insertIntoFolder(items, item, folderId) {
  if (!folderId) return [...items, item]
  return items.map(existing => {
    if (existing.id === folderId && existing.type === 'folder') {
      return { ...existing, children: [...(existing.children || []), item] }
    }
    if (existing.type === 'folder') {
      return { ...existing, children: insertIntoFolder(existing.children || [], item, folderId) }
    }
    return existing
  })
}

export function getFolderList(items) {
  const folders = []
  for (const item of items) {
    if (item.type === 'folder') folders.push({ id: item.id, name: item.name })
  }
  return folders
}

export function sumPrices(items) {
  let total = 0
  for (const item of items) {
    if (item.type === 'folder') total += sumPrices(item.children || [])
    else total += (parseFloat(item.price) || 0) * (parseInt(item.qty) || 1)
  }
  return total
}

export function countParts(items) {
  let n = 0
  for (const item of items) {
    if (item.type === 'folder') n += countParts(item.children || [])
    else n++
  }
  return n
}

export function countInstalled(items) {
  let n = 0
  for (const item of items) {
    if (item.type === 'folder') n += countInstalled(item.children || [])
    else if (item.status === 'installed') n++
  }
  return n
}

export function fmt(price) {
  return price ? `€${price.toFixed(2)}` : '—'
}

export function filterItems(items, q) {
  const lq = q.toLowerCase()
  function matchesPart(item) {
    return (item.part || '').toLowerCase().includes(lq) ||
           (item.info || '').toLowerCase().includes(lq) ||
           (item.notes || '').toLowerCase().includes(lq)
  }
  return items.reduce((acc, item) => {
    if (item.type === 'folder') {
      const filteredChildren = filterItems(item.children || [], q)
      if (filteredChildren.length > 0) {
        acc.push({ ...item, children: filteredChildren })
      }
    } else if (matchesPart(item)) {
      acc.push(item)
    }
    return acc
  }, [])
}

export function sortFolder(items, folderId, key) {
  return items.map(item => {
    if (item.id === folderId && item.type === 'folder') {
      const children = [...(item.children || [])]
      if (key === 'name') children.sort((a, b) => (a.part || a.name || '').localeCompare(b.part || b.name || ''))
      else if (key === 'status') {
        const order = Object.fromEntries(STATUS_OPTIONS.map((s, i) => [s, i]))
        children.sort((a, b) => (order[a.status] || 0) - (order[b.status] || 0))
      } else if (key === 'price') {
        children.sort((a, b) => (parseFloat(b.price) || 0) * (parseInt(b.qty) || 1) - (parseFloat(a.price) || 0) * (parseInt(a.qty) || 1))
      }
      return { ...item, children }
    }
    if (item.type === 'folder') return { ...item, children: sortFolder(item.children || [], folderId, key) }
    return item
  })
}

export function wrapInFolder(items, partId, folderName) {
  const folder = { id: newId(), type: 'folder', name: folderName, children: [] }
  let partItem = null
  function recurse(arr) {
    return arr.reduce((acc, item) => {
      if (item.id === partId) {
        partItem = item
        folder.children = [item]
        acc.push(folder)
      } else if (item.type === 'folder') {
        acc.push({ ...item, children: recurse(item.children || []) })
      } else {
        acc.push(item)
      }
      return acc
    }, [])
  }
  return recurse(items)
}

export function moveToFolder(items, partId, targetFolderId) {
  const { newItems: withoutPart, removed } = removeItem(items, partId)
  if (!removed) return items
  return insertIntoFolder(withoutPart, removed, targetFolderId)
}

export const EMPTY_MAINT = { unit: 'km', current_odometer: 0, items: [] }
