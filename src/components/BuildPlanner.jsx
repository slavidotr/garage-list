import { useState, useRef, useEffect } from 'react'
import {
  STATUS_OPTIONS, STATUS_INFO,
  newId, updateItem, removeItem, moveItem,
  insertIntoFolder, filterItems, getFolderList,
  sortFolder, wrapInFolder, moveToFolder,
  sumPrices, countParts, countInstalled, fmt,
} from '../utils'

export default function BuildPlanner({ items, trash, onChange }) {
  const [search,    setSearch]    = useState('')
  const [dialog,    setDialog]    = useState(null)   // null | { mode, item?, folderId? }
  const [trashOpen, setTrashOpen] = useState(false)
  const [altDialog, setAltDialog] = useState(null)   // null | { item, opts, selectedIdx }

  const display = search ? filterItems(items, search) : items

  function addPart(folderId) {
    setDialog({ mode: 'add', folderId: folderId || null })
  }
  function editPart(item) {
    setDialog({ mode: 'edit', item })
  }

  function savePart(formData, mode, originalItem, folderId) {
    const part = {
      ...(mode === 'edit' ? originalItem : {}),
      id:       mode === 'edit' ? originalItem.id : newId(),
      type:     'part',
      part:     formData.part,
      info:     formData.info,
      price:    parseFloat(formData.price.replace(',', '.')) || 0,
      qty:      parseInt(formData.qty) || 1,
      status:   formData.status,
      notes:    formData.notes,
      link:     formData.link,
      options:  formData.options || [],
      selected: formData.selected || { name: formData.info || formData.part, link: formData.link },
    }
    let newItems
    if (mode === 'edit') {
      newItems = updateItem(items, originalItem.id, part)
    } else {
      newItems = insertIntoFolder(items, part, folderId)
    }
    onChange(newItems, trash)
    setDialog(null)
  }

  function deletePart(item) {
    if (!window.confirm(`Move "${item.part || item.name}" to trash?`)) return
    const { newItems, removed, fromFolder } = removeItem(items, item.id)
    const label = item.part || item.name || '?'
    const newTrash = [...trash, { item: removed, fromFolder, label }]
    onChange(newItems, newTrash)
  }

  function addFolder() {
    const name = window.prompt('Folder name (e.g. Exhaust Setup):')
    if (!name?.trim()) return
    const folder = { id: newId(), type: 'folder', name: name.trim(), children: [] }
    onChange([...items, folder], trash)
  }

  function renameFolder(item) {
    const name = window.prompt('Rename folder:', item.name)
    if (!name?.trim() || name.trim() === item.name) return
    onChange(updateItem(items, item.id, { name: name.trim() }), trash)
  }

  function deleteFolder(item) {
    const n = (item.children || []).length
    const msg = `Delete folder "${item.name}"${n ? ` and its ${n} item(s)` : ''}? Items go to trash.`
    if (!window.confirm(msg)) return
    const { newItems, removed, fromFolder } = removeItem(items, item.id)
    const newTrash = [...trash, { item: removed, fromFolder, label: `📁 ${item.name}` }]
    onChange(newItems, newTrash)
  }

  function restoreItem(entry, index) {
    let newItems
    if (entry.fromFolder) {
      // Find folder by name and append
      const folder = items.find(x => x.type === 'folder' && x.name === entry.fromFolder)
      if (folder) {
        newItems = updateItem(items, folder.id, { children: [...(folder.children || []), entry.item] })
      } else {
        newItems = [...items, entry.item]
      }
    } else {
      newItems = [...items, entry.item]
    }
    const newTrash = trash.filter((_, i) => i !== index)
    onChange(newItems, newTrash)
  }

  function deleteTrashItem(index) {
    onChange(items, trash.filter((_, i) => i !== index))
  }

  function handleMoveToFolder(item) {
    const folders = getFolderList(items)
    if (!folders.length) { window.alert('No folders exist. Create one first.'); return }
    const names = folders.map((f, i) => `${i + 1}. ${f.name}`).join('\n')
    const input = window.prompt(`Move to folder:\n${names}\n\n(Enter number or folder name, or leave blank for root)`)
    if (input === null) return
    if (!input.trim()) {
      const { newItems: withoutItem, removed } = removeItem(items, item.id)
      if (removed) onChange([...withoutItem, removed], trash)
      return
    }
    const idx = parseInt(input) - 1
    const folder = !isNaN(idx) ? folders[idx] : folders.find(f => f.name.toLowerCase() === input.trim().toLowerCase())
    if (!folder) { window.alert('Folder not found.'); return }
    onChange(moveToFolder(items, item.id, folder.id), trash)
  }

  function handleSort(folderId, key) {
    onChange(sortFolder(items, folderId, key), trash)
  }

  function handleWrapInFolder(item) {
    const name = window.prompt('New folder name:')
    if (!name?.trim()) return
    onChange(wrapInFolder(items, item.id, name.trim()), trash)
  }

  const total  = sumPrices(items)
  const nParts = countParts(items)
  const nInst  = countInstalled(items)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => addPart(null)}>+ Part</button>
        <button className="btn btn-ghost btn-sm"   onClick={addFolder}>+ Folder</button>
        <div className="toolbar-sep" />
        <div className="search-wrap">
          <input
            className="input"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setTrashOpen(true)}>
          🗑 {trash.length > 0 ? `(${trash.length})` : ''}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {display.length === 0 ? (
          <div className="empty">
            <h3>{search ? 'No results' : 'No parts yet'}</h3>
            <p>{search ? 'Try a different search.' : 'Add your first part to get started.'}</p>
            {!search && <button className="btn btn-primary" onClick={() => addPart(null)}>+ Add Part</button>}
          </div>
        ) : (
          <div className="tree">
            <ItemList
              items={display}
              nested={false}
              onEditPart={editPart}
              onDeletePart={deletePart}
              onMoveUp={(id) => onChange(moveItem(items, id, -1), trash)}
              onMoveDown={(id) => onChange(moveItem(items, id, 1), trash)}
              onMoveToFolder={handleMoveToFolder}
              onWrapInFolder={handleWrapInFolder}
              onRenameFolder={renameFolder}
              onDeleteFolder={deleteFolder}
              onSortFolder={handleSort}
              onAddToFolder={(folderId) => addPart(folderId)}
            />
          </div>
        )}
      </div>

      <div className="status-bar">
        Total: {fmt(total)}  ·  {nInst}/{nParts} installed
      </div>

      {dialog && (
        <PartDialog
          mode={dialog.mode}
          item={dialog.item}
          onSave={(data) => savePart(data, dialog.mode, dialog.item, dialog.folderId)}
          onClose={() => setDialog(null)}
        />
      )}

      {trashOpen && (
        <TrashModal
          trash={trash}
          onRestore={restoreItem}
          onDelete={deleteTrashItem}
          onDeleteAll={() => onChange(items, [])}
          onClose={() => setTrashOpen(false)}
        />
      )}
    </div>
  )
}

/* ── Item List (recursive) ──────────────────────────────────────────────── */
function ItemList({ items, nested, ...handlers }) {
  return items.map(item =>
    item.type === 'folder'
      ? <FolderRow key={item.id} item={item} {...handlers} />
      : <PartRow   key={item.id} item={item} nested={nested} {...handlers} />
  )
}

function FolderRow({ item, onRenameFolder, onDeleteFolder, onSortFolder, onAddToFolder, ...rest }) {
  const [open, setOpen] = useState(true)
  const children = item.children || []
  const total    = sumPrices(children)
  const inst     = children.filter(c => c.status === 'installed').length

  return (
    <div className="tree-folder">
      <div className="folder-header" onClick={() => setOpen(o => !o)}>
        <span className="folder-chevron">{open ? '▼' : '▶'}</span>
        <span className="folder-name">📁 {item.name}</span>
        <span className="folder-meta">{inst}/{children.length} installed · {fmt(total)}</span>
        <Dropdown items={[
          { label: '+ Add Part',    onClick: (e) => { e.stopPropagation(); onAddToFolder(item.id) } },
          { label: 'Rename',        onClick: (e) => { e.stopPropagation(); onRenameFolder(item) } },
          { sep: true },
          { label: 'Sort by name',   onClick: (e) => { e.stopPropagation(); onSortFolder(item.id, 'name') } },
          { label: 'Sort by status', onClick: (e) => { e.stopPropagation(); onSortFolder(item.id, 'status') } },
          { label: 'Sort by price',  onClick: (e) => { e.stopPropagation(); onSortFolder(item.id, 'price') } },
          { sep: true },
          { label: 'Delete folder', danger: true, onClick: (e) => { e.stopPropagation(); onDeleteFolder(item) } },
        ]} />
      </div>
      {open && children.length > 0 && (
        <div className="folder-children">
          <ItemList items={children} nested={true} onRenameFolder={onRenameFolder} onDeleteFolder={onDeleteFolder} onSortFolder={onSortFolder} onAddToFolder={onAddToFolder} {...rest} />
        </div>
      )}
      {open && children.length === 0 && (
        <div style={{ padding: '10px 24px', fontSize: 12, color: 'var(--fg2)' }}>
          Empty — <button style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }} onClick={() => onAddToFolder(item.id)}>add a part</button>
        </div>
      )}
    </div>
  )
}

function PartRow({ item, nested, onEditPart, onDeletePart, onMoveUp, onMoveDown, onMoveToFolder, onWrapInFolder }) {
  const si    = STATUS_INFO[item.status] || STATUS_INFO.planned
  const qty   = parseInt(item.qty) || 1
  const price = (parseFloat(item.price) || 0) * qty
  const link  = item.link || item.selected?.link

  return (
    <div className={`part-row ${nested ? 'nested' : ''}`}>
      <div
        className="status-dot"
        style={{ background: si.colorVar }}
        title={si.label}
      />
      <div className="part-name">
        <div className="part-name-text" style={{ color: si.colorVar }}>
          {si.symbol}{item.part}
          {qty > 1 && <span style={{ color: 'var(--fg2)', fontSize: 11 }}> ×{qty}</span>}
        </div>
        {item.info && <div className="part-info">{item.info}</div>}
      </div>
      {price > 0 && <div className="part-price">{fmt(price)}</div>}
      <div className="part-actions">
        {link && (
          <button className="btn-icon" title="Open link" onClick={() => window.open(link, '_blank')}>🔗</button>
        )}
        <Dropdown items={[
          { label: 'Edit',           onClick: () => onEditPart(item) },
          { label: 'Move up',        onClick: () => onMoveUp(item.id) },
          { label: 'Move down',      onClick: () => onMoveDown(item.id) },
          { label: 'Move to folder', onClick: () => onMoveToFolder(item) },
          { label: 'Wrap in folder', onClick: () => onWrapInFolder(item) },
          { sep: true },
          { label: 'Delete', danger: true, onClick: () => onDeletePart(item) },
        ]} />
      </div>
    </div>
  )
}

/* ── Dropdown ───────────────────────────────────────────────────────────── */
function Dropdown({ items: menuItems }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    function handler(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="dropdown-wrap" ref={ref} onClick={e => e.stopPropagation()}>
      <button className="btn-icon" onClick={() => setOpen(o => !o)}>⋯</button>
      {open && (
        <div className="dropdown-menu" onClick={() => setOpen(false)}>
          {menuItems.map((it, i) =>
            it.sep
              ? <div key={i} className="dropdown-sep" />
              : <button key={i} className={`dropdown-item ${it.danger ? 'danger' : ''}`} onClick={it.onClick}>{it.label}</button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Part Dialog ────────────────────────────────────────────────────────── */
function PartDialog({ mode, item, onSave, onClose }) {
  const [form, setForm] = useState({
    part:    item?.part    || '',
    info:    item?.info    || '',
    price:   item?.price   != null ? String(item.price) : '',
    qty:     item?.qty     != null ? String(item.qty)   : '1',
    status:  item?.status  || 'planned',
    notes:   item?.notes   || '',
    link:    item?.link || item?.selected?.link || '',
    options: item?.options ? JSON.parse(JSON.stringify(item.options)) : [],
    selected: item?.selected || null,
  })
  const [errors, setErrors] = useState({})
  const [altOpen, setAltOpen] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function submit(e) {
    e.preventDefault()
    if (!form.part.trim()) { setErrors({ part: 'Required' }); return }
    onSave(form)
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>{mode === 'edit' ? 'Edit Part' : 'Add Part'}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>Part Name *</label>
          <input className={`input ${errors.part ? 'input-error' : ''}`} value={form.part} onChange={e => set('part', e.target.value)} placeholder="e.g. Coilovers" autoFocus />
          {errors.part && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.part}</span>}
        </div>
        <div className="field">
          <label>Info / Variant</label>
          <input className="input" value={form.info} onChange={e => set('info', e.target.value)} placeholder="e.g. BC Racing BR Series" />
        </div>
        <div className="field">
          <label>Link</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input" value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://…" style={{ flex: 1 }} />
            {form.link && <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.open(form.link, '_blank')}>Open</button>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Price (€)</label>
            <input className="input" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" inputMode="decimal" />
          </div>
          <div className="field" style={{ width: 80 }}>
            <label>Qty</label>
            <input className="input" type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Status</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_INFO[s].label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes…" rows={3} />
        </div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAltOpen(true)}>
          Alternatives {form.options.length > 0 ? `(${form.options.length})` : ''}
        </button>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{mode === 'edit' ? 'Save' : 'Add Part'}</button>
        </div>
      </form>
      {altOpen && (
        <AlternativesDialog
          options={form.options}
          selected={form.selected}
          onUpdate={(opts, sel) => { set('options', opts); set('selected', sel); set('info', sel?.name || form.info); set('link', sel?.link || form.link) }}
          onClose={() => setAltOpen(false)}
        />
      )}
    </Modal>
  )
}

/* ── Alternatives Dialog ────────────────────────────────────────────────── */
function AlternativesDialog({ options, selected, onUpdate, onClose }) {
  const [opts, setOpts]  = useState(options)
  const [selIdx, setSelIdx] = useState(() => options.findIndex(o => o.name === selected?.name))

  function addOpt() {
    const name = window.prompt('Product name:')
    if (!name?.trim()) return
    const link = window.prompt('Product link (optional):') || ''
    const newOpts = [...opts, { name: name.trim(), link }]
    setOpts(newOpts)
    if (selIdx === -1) setSelIdx(newOpts.length - 1)
  }

  function save() {
    const sel = selIdx >= 0 ? opts[selIdx] : null
    onUpdate(opts, sel)
    onClose()
  }

  return (
    <Modal onClose={onClose} style={{ zIndex: 110 }}>
      <div className="modal-header">
        <h2>Alternatives</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--fg2)' }}>★ = currently selected</p>
      <div className="alt-list">
        {opts.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg2)', padding: '8px 0' }}>No alternatives added yet.</p>}
        {opts.map((o, i) => (
          <div key={i} className={`alt-item ${i === selIdx ? 'selected' : ''}`} onClick={() => setSelIdx(i)}>
            <span>{i === selIdx ? '★ ' : ''}</span>
            <span className="alt-item-name">{o.name}</span>
            {o.link && <a href={o.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11 }}>🔗</a>}
            <button style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); const n=[...opts]; n.splice(i,1); setOpts(n); if(selIdx===i) setSelIdx(n.length?0:-1); else if(selIdx>i) setSelIdx(selIdx-1) }}>✕</button>
          </div>
        ))}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={addOpt}>+ Add</button>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={save}>Apply</button>
      </div>
    </Modal>
  )
}

/* ── Trash Modal ────────────────────────────────────────────────────────── */
function TrashModal({ trash, onRestore, onDelete, onDeleteAll, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>Trash ({trash.length})</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      {trash.length === 0 ? (
        <p style={{ color: 'var(--fg2)', fontSize: 13 }}>Trash is empty.</p>
      ) : (
        <div className="trash-list">
          {trash.map((entry, i) => (
            <div key={i} className="trash-item">
              <div className="trash-item-label">
                {entry.label}
                {entry.fromFolder && <span className="trash-item-from"> ← {entry.fromFolder}</span>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onRestore(entry, i)}>Restore</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => { if(window.confirm('Delete permanently?')) onDelete(i) }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="modal-footer">
        {trash.length > 0 && <button className="btn btn-danger btn-sm" onClick={() => { if(window.confirm(`Delete all ${trash.length} items permanently?`)) { onDeleteAll(); onClose() } }}>Delete All</button>}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}

/* ── Modal wrapper ──────────────────────────────────────────────────────── */
function Modal({ children, onClose, style }) {
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }} style={style}>
      <div className="modal">{children}</div>
    </div>
  )
}
