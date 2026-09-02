import { useState, useRef, useEffect } from 'react'
import {
  STATUS_OPTIONS, STATUS_INFO,
  newId, updateItem, removeItem, moveItem, reorderItem,
  insertIntoFolder, filterItems, getFolderList,
  sortFolder, wrapInFolder, moveToFolder,
  sumPrices, countParts, countInstalled, fmt,
} from '../utils'
import { useLang } from '../i18n'

export default function BuildPlanner({ items, trash, onChange }) {
  const { t } = useLang()
  const [search,    setSearch]    = useState('')
  const [dialog,    setDialog]    = useState(null)
  const [trashOpen, setTrashOpen] = useState(false)

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
    if (!window.confirm(t('part.confirmDelete', { name: item.part || item.name }))) return
    const { newItems, removed, fromFolder } = removeItem(items, item.id)
    const label = item.part || item.name || '?'
    onChange(newItems, [...trash, { item: removed, fromFolder, label }])
  }

  function addFolder() {
    const name = window.prompt(t('folder.newName'))
    if (!name?.trim()) return
    const folder = { id: newId(), type: 'folder', name: name.trim(), children: [] }
    onChange([...items, folder], trash)
  }

  function renameFolder(item) {
    const name = window.prompt(t('folder.renameName'), item.name)
    if (!name?.trim() || name.trim() === item.name) return
    onChange(updateItem(items, item.id, { name: name.trim() }), trash)
  }

  function deleteFolder(item) {
    const n = (item.children || []).length
    if (!window.confirm(t('folder.confirmDelete', { name: item.name, n }))) return
    const { newItems, removed } = removeItem(items, item.id)
    onChange(newItems, [...trash, { item: removed, fromFolder: null, label: `📁 ${item.name}` }])
  }

  function restoreItem(entry, index) {
    let newItems
    if (entry.fromFolder) {
      const folder = items.find(x => x.type === 'folder' && x.name === entry.fromFolder)
      if (folder) {
        newItems = updateItem(items, folder.id, { children: [...(folder.children || []), entry.item] })
      } else {
        newItems = [...items, entry.item]
      }
    } else {
      newItems = [...items, entry.item]
    }
    onChange(newItems, trash.filter((_, i) => i !== index))
  }

  function deleteTrashItem(index) {
    onChange(items, trash.filter((_, i) => i !== index))
  }

  function handleMoveToFolder(item) {
    const folders = getFolderList(items)
    if (!folders.length) { window.alert(t('folder.noFolders')); return }
    const names = folders.map((f, i) => `${i + 1}. ${f.name}`).join('\n')
    const input = window.prompt(t('folder.movePrompt', { list: names }))
    if (input === null) return
    if (!input.trim()) {
      const { newItems: withoutItem, removed } = removeItem(items, item.id)
      if (removed) onChange([...withoutItem, removed], trash)
      return
    }
    const idx = parseInt(input) - 1
    const folder = !isNaN(idx) ? folders[idx] : folders.find(f => f.name.toLowerCase() === input.trim().toLowerCase())
    if (!folder) { window.alert(t('folder.notFound')); return }
    onChange(moveToFolder(items, item.id, folder.id), trash)
  }

  function handleSort(folderId, key) {
    onChange(sortFolder(items, folderId, key), trash)
  }

  function handleWrapInFolder(item) {
    const name = window.prompt(t('folder.renameName'))
    if (!name?.trim()) return
    onChange(wrapInFolder(items, item.id, name.trim()), trash)
  }

  const total  = sumPrices(items)
  const nParts = countParts(items)
  const nInst  = countInstalled(items)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => addPart(null)}>{t('planner.addPart')}</button>
        <button className="btn btn-ghost btn-sm"   onClick={addFolder}>{t('planner.addFolder')}</button>
        <div className="toolbar-sep" />
        <div className="search-wrap">
          <input
            className="input"
            placeholder={t('planner.searchPlaceholder')}
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
            <h3>{search ? t('planner.noResults') : t('planner.noParts')}</h3>
            <p>{search ? t('planner.noResultsHint') : t('planner.noPartsHint')}</p>
            {!search && <button className="btn btn-primary" onClick={() => addPart(null)}>{t('planner.addFirstPart')}</button>}
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
              onReorder={(draggedId, targetId) => onChange(reorderItem(items, draggedId, targetId), trash)}
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
        {t('planner.statusBar', { amount: fmt(total), installed: nInst, total: nParts })}
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

function FolderRow({ item, onRenameFolder, onDeleteFolder, onSortFolder, onAddToFolder, onReorder, ...rest }) {
  const { t } = useLang()
  const [open, setOpen] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const children = item.children || []
  const total    = sumPrices(children)
  const inst     = children.filter(c => c.status === 'installed').length

  return (
    <div className="tree-folder">
      <div
        className={`folder-header ${dragOver ? 'drag-over' : ''}`}
        onClick={() => setOpen(o => !o)}
        draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.id) }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const draggedId = e.dataTransfer.getData('text/plain'); if (draggedId && draggedId !== item.id) onReorder(draggedId, item.id) }}
      >
        <span className="drag-handle" title={t('planner.dragToReorder')} onClick={e => e.stopPropagation()}>⠿</span>
        <span className="folder-chevron">{open ? '▼' : '▶'}</span>
        <span className="folder-name">📁 {item.name}</span>
        <span className="folder-meta">{inst}/{children.length} · {fmt(total)}</span>
        <Dropdown items={[
          { label: t('folder.addPart'),   onClick: (e) => { e.stopPropagation(); onAddToFolder(item.id) } },
          { label: t('folder.rename'),    onClick: (e) => { e.stopPropagation(); onRenameFolder(item) } },
          { sep: true },
          { label: t('folder.sortName'),   onClick: (e) => { e.stopPropagation(); onSortFolder(item.id, 'name') } },
          { label: t('folder.sortStatus'), onClick: (e) => { e.stopPropagation(); onSortFolder(item.id, 'status') } },
          { label: t('folder.sortPrice'),  onClick: (e) => { e.stopPropagation(); onSortFolder(item.id, 'price') } },
          { sep: true },
          { label: t('folder.delete'), danger: true, onClick: (e) => { e.stopPropagation(); onDeleteFolder(item) } },
        ]} />
      </div>
      {open && children.length > 0 && (
        <div className="folder-children">
          <ItemList items={children} nested={true} onRenameFolder={onRenameFolder} onDeleteFolder={onDeleteFolder} onSortFolder={onSortFolder} onAddToFolder={onAddToFolder} onReorder={onReorder} {...rest} />
        </div>
      )}
      {open && children.length === 0 && (
        <div style={{ padding: '10px 24px', fontSize: 12, color: 'var(--fg2)' }}>
          {t('planner.emptyFolder')}{' '}
          <button style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }} onClick={() => onAddToFolder(item.id)}>
            {t('planner.addPartToFolder')}
          </button>
        </div>
      )}
    </div>
  )
}

function PartRow({ item, nested, onEditPart, onDeletePart, onMoveUp, onMoveDown, onMoveToFolder, onWrapInFolder, onReorder }) {
  const { t } = useLang()
  const [dragOver, setDragOver] = useState(false)
  const si    = STATUS_INFO[item.status] || STATUS_INFO.planned
  const qty   = parseInt(item.qty) || 1
  const price = (parseFloat(item.price) || 0) * qty
  const link  = item.link || item.selected?.link

  return (
    <div
      className={`part-row ${nested ? 'nested' : ''} ${dragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.id) }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const draggedId = e.dataTransfer.getData('text/plain'); if (draggedId && draggedId !== item.id) onReorder(draggedId, item.id) }}
    >
      <span className="drag-handle" title={t('planner.dragToReorder')}>⠿</span>
      <div className="status-dot" style={{ background: si.colorVar }} title={t(`status.${item.status}`)} />
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
          <button className="btn-icon" title={t('planner.openLink')} onClick={() => window.open(link, '_blank')}>🔗</button>
        )}
        <Dropdown items={[
          { label: t('part.edit'),          onClick: () => onEditPart(item) },
          { label: t('part.moveUp'),        onClick: () => onMoveUp(item.id) },
          { label: t('part.moveDown'),      onClick: () => onMoveDown(item.id) },
          { label: t('part.moveToFolder'),  onClick: () => onMoveToFolder(item) },
          { label: t('part.wrapInFolder'),  onClick: () => onWrapInFolder(item) },
          { sep: true },
          { label: t('part.delete'), danger: true, onClick: () => onDeletePart(item) },
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
  const { t } = useLang()
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
    if (!form.part.trim()) { setErrors({ part: t('partDialog.required') }); return }
    onSave(form)
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>{mode === 'edit' ? t('partDialog.editTitle') : t('partDialog.addTitle')}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>{t('partDialog.name')}</label>
          <input className={`input ${errors.part ? 'input-error' : ''}`} value={form.part} onChange={e => set('part', e.target.value)} placeholder={t('partDialog.namePlaceholder')} autoFocus />
          {errors.part && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.part}</span>}
        </div>
        <div className="field">
          <label>{t('partDialog.info')}</label>
          <input className="input" value={form.info} onChange={e => set('info', e.target.value)} placeholder={t('partDialog.infoPlaceholder')} />
        </div>
        <div className="field">
          <label>{t('partDialog.link')}</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input" value={form.link} onChange={e => set('link', e.target.value)} placeholder={t('partDialog.linkPlaceholder')} style={{ flex: 1 }} />
            {form.link && <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.open(form.link, '_blank')}>{t('partDialog.open')}</button>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('partDialog.price')}</label>
            <input className="input" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" inputMode="decimal" />
          </div>
          <div className="field" style={{ width: 80 }}>
            <label>{t('partDialog.qty')}</label>
            <input className="input" type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>{t('partDialog.status')}</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t('partDialog.notes')}</label>
          <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={t('partDialog.notesPlaceholder')} rows={3} />
        </div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAltOpen(true)}>
          {t('partDialog.alternatives')} {form.options.length > 0 ? `(${form.options.length})` : ''}
        </button>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('partDialog.cancel')}</button>
          <button type="submit" className="btn btn-primary">{mode === 'edit' ? t('partDialog.saveSubmit') : t('partDialog.addSubmit')}</button>
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
  const { t } = useLang()
  const [opts, setOpts]  = useState(options)
  const [selIdx, setSelIdx] = useState(() => options.findIndex(o => o.name === selected?.name))

  function addOpt() {
    const name = window.prompt(t('alt.productName'))
    if (!name?.trim()) return
    const link = window.prompt(t('alt.productLink')) || ''
    const newOpts = [...opts, { name: name.trim(), link }]
    setOpts(newOpts)
    if (selIdx === -1) setSelIdx(newOpts.length - 1)
  }

  function save() {
    onUpdate(opts, selIdx >= 0 ? opts[selIdx] : null)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>{t('alt.title')}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--fg2)' }}>{t('alt.hint')}</p>
      <div className="alt-list">
        {opts.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg2)', padding: '8px 0' }}>{t('alt.empty')}</p>}
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
        <button type="button" className="btn btn-ghost" onClick={addOpt}>{t('alt.add')}</button>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('alt.cancel')}</button>
        <button type="button" className="btn btn-primary" onClick={save}>{t('alt.apply')}</button>
      </div>
    </Modal>
  )
}

/* ── Trash Modal ────────────────────────────────────────────────────────── */
function TrashModal({ trash, onRestore, onDelete, onDeleteAll, onClose }) {
  const { t } = useLang()
  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>{t('trash.title', { count: trash.length })}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      {trash.length === 0 ? (
        <p style={{ color: 'var(--fg2)', fontSize: 13 }}>{t('trash.empty')}</p>
      ) : (
        <div className="trash-list">
          {trash.map((entry, i) => (
            <div key={i} className="trash-item">
              <div className="trash-item-label">
                {entry.label}
                {entry.fromFolder && <span className="trash-item-from"> ← {entry.fromFolder}</span>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onRestore(entry, i)}>{t('trash.restore')}</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => { if(window.confirm(t('trash.confirmDeleteOne'))) onDelete(i) }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="modal-footer">
        {trash.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={() => { if(window.confirm(t('trash.confirmDeleteAll', { n: trash.length }))) { onDeleteAll(); onClose() } }}>
            {t('trash.deleteAll')}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onClose}>{t('trash.close')}</button>
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
