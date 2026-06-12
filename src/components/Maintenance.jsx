import { useState, useEffect } from 'react'
import { newId, EMPTY_MAINT } from '../utils'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function calcStatus(item, currentOdo) {
  const history  = item.history || []
  const interval = item.interval || 0
  if (!history.length) return { tag: 'none', text: '—', lastOdo: null, nextDue: null }
  const lastOdo = Math.max(...history.map(h => h.odometer || 0))
  const nextDue = interval ? lastOdo + interval : null
  if (!nextDue) return { tag: 'ok', text: 'No interval', lastOdo, nextDue: null }
  if (currentOdo >= nextDue) return { tag: 'over', text: 'OVERDUE', lastOdo, nextDue }
  if (interval && currentOdo >= nextDue - interval * 0.1) return { tag: 'soon', text: 'Due soon', lastOdo, nextDue }
  return { tag: 'ok', text: 'OK', lastOdo, nextDue }
}

export default function Maintenance({ log, onChange }) {
  const data    = log || EMPTY_MAINT
  const unit    = data.unit || 'km'
  const odoRaw  = data.current_odometer || 0
  const mitems  = data.items || []

  const [odoInput, setOdoInput] = useState(String(odoRaw))
  const [expanded, setExpanded] = useState({})
  const [dialog,   setDialog]   = useState(null)
  // dialog: { type: 'addItem' | 'editItem' | 'logService' | 'editEntry', item?, entry?, parentItem? }

  useEffect(() => { setOdoInput(String(odoRaw)) }, [odoRaw])

  function update(patch) {
    onChange({ ...data, ...patch })
  }

  function commitOdo() {
    const val = Math.max(0, parseInt(odoInput.replace(/,/g, '')) || 0)
    setOdoInput(String(val))
    update({ current_odometer: val })
  }

  function toggleUnit() {
    update({ unit: unit === 'km' ? 'miles' : 'km' })
  }

  function toggleExpand(id) {
    setExpanded(e => ({ ...e, [id]: !e[id] }))
  }

  function saveItem(formData) {
    if (dialog.type === 'addItem') {
      update({ items: [...mitems, { id: newId(), name: formData.name, interval: formData.interval, unit: formData.unit, history: [] }] })
    } else {
      update({ items: mitems.map(it => it.id === dialog.item.id ? { ...it, ...formData } : it) })
    }
    setDialog(null)
  }

  function deleteItem(id) {
    if (!window.confirm('Delete this component and all its service history?')) return
    update({ items: mitems.filter(it => it.id !== id) })
  }

  function logService(mitem, formData) {
    const odo = formData.odometer
    const newHistory = [...(mitem.history || []), { id: newId(), date: formData.date, odometer: odo, notes: formData.notes }]
    const newItems = mitems.map(it => it.id === mitem.id ? { ...it, history: newHistory } : it)
    const newOdo   = odo > odoRaw ? odo : odoRaw
    update({ items: newItems, current_odometer: newOdo })
    setDialog(null)
  }

  function editEntry(mitem, entry, formData) {
    const newHistory = (mitem.history || []).map(h => h.id === entry.id ? { ...h, ...formData } : h)
    update({ items: mitems.map(it => it.id === mitem.id ? { ...it, history: newHistory } : it) })
    setDialog(null)
  }

  function deleteEntry(mitem, entryId) {
    if (!window.confirm('Delete this service entry?')) return
    const newHistory = (mitem.history || []).filter(h => h.id !== entryId)
    update({ items: mitems.map(it => it.id === mitem.id ? { ...it, history: newHistory } : it) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="maint-toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => setDialog({ type: 'addItem' })}>+ Add Item</button>
        <button className="btn btn-ghost btn-sm"   onClick={() => dialog?.type !== 'logService' && setDialog({ type: 'logService', item: null })}>Log Service</button>
        <div className="odo-group">
          <label>Odometer</label>
          <input
            className="input odo-input"
            value={odoInput}
            onChange={e => setOdoInput(e.target.value)}
            onBlur={commitOdo}
            onKeyDown={e => e.key === 'Enter' && commitOdo()}
            inputMode="numeric"
          />
          <button className="unit-toggle" onClick={toggleUnit}>{unit}</button>
        </div>
      </div>

      {mitems.length === 0 ? (
        <div className="empty">
          <h3>No maintenance items</h3>
          <p>Add components to track service intervals (oil, filters, brakes, etc.)</p>
          <button className="btn btn-primary" onClick={() => setDialog({ type: 'addItem' })}>+ Add Item</button>
        </div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table className="maint-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Interval</th>
                <th>Last Service</th>
                <th>Next Due</th>
                <th>Status</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {mitems.map(mitem => {
                const { tag, text, lastOdo, nextDue } = calcStatus(mitem, odoRaw)
                const iunit    = mitem.unit || unit
                const isOpen   = expanded[mitem.id]
                const history  = [...(mitem.history || [])].sort((a, b) => b.odometer - a.odometer)
                return [
                  <tr key={mitem.id} className="maint-item-row" onClick={() => toggleExpand(mitem.id)}>
                    <td>
                      <div className="maint-comp-name">
                        <span style={{ fontSize: 11, color: 'var(--fg2)' }}>{isOpen ? '▼' : '▶'}</span>
                        {mitem.name}
                      </div>
                    </td>
                    <td>{mitem.interval ? `${mitem.interval.toLocaleString()} ${iunit}` : '—'}</td>
                    <td>{lastOdo != null ? `${lastOdo.toLocaleString()} ${iunit}` : '—'}</td>
                    <td>{nextDue != null ? `${nextDue.toLocaleString()} ${iunit}` : '—'}</td>
                    <td><span className={`status-${tag}`}>{text}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn-icon" title="Log service" onClick={() => setDialog({ type: 'logService', item: mitem })}>+</button>
                        <button className="btn-icon" title="Edit" onClick={() => setDialog({ type: 'editItem', item: mitem })}>✎</button>
                        <button className="btn-icon" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => deleteItem(mitem.id)}>✕</button>
                      </div>
                    </td>
                  </tr>,
                  isOpen && history.map(entry => (
                    <tr key={entry.id} className="maint-history-row">
                      <td colSpan={4} style={{ paddingLeft: 32 }}>
                        📅 {entry.date}  ·  {entry.odometer?.toLocaleString()} {iunit}
                        {entry.notes && <span style={{ marginLeft: 8, color: 'var(--fg2)' }}>{entry.notes}</span>}
                      </td>
                      <td />
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn-icon" title="Edit entry" onClick={e => { e.stopPropagation(); setDialog({ type: 'editEntry', item: mitem, entry }) }}>✎</button>
                          <button className="btn-icon" title="Delete entry" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); deleteEntry(mitem, entry.id) }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ]
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.type === 'addItem' && (
        <ItemDialog unit={unit} onSave={saveItem} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'editItem' && (
        <ItemDialog item={dialog.item} unit={unit} onSave={saveItem} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'logService' && (
        <LogServiceDialog
          item={dialog.item}
          items={mitems}
          unit={unit}
          currentOdo={odoRaw}
          onSave={(mitem, data) => logService(mitem, data)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'editEntry' && (
        <EditEntryDialog
          entry={dialog.entry}
          item={dialog.item}
          unit={unit}
          onSave={(data) => editEntry(dialog.item, dialog.entry, data)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

/* ── Add / Edit maintenance item ─────────────────────────────────────────── */
function ItemDialog({ item, unit, onSave, onClose }) {
  const [name,     setName]     = useState(item?.name     || '')
  const [interval, setInterval] = useState(item?.interval != null ? String(item.interval) : '')
  const [iunit,    setIunit]    = useState(item?.unit     || unit)

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name:     name.trim(),
      interval: Math.max(0, parseInt(interval.replace(/,/g, '')) || 0),
      unit:     iunit,
    })
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>{item ? 'Edit Item' : 'Add Maintenance Item'}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>Component Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Engine Oil" autoFocus required />
        </div>
        <div className="field">
          <label>Service Interval</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={interval} onChange={e => setInterval(e.target.value)} placeholder="e.g. 5000" inputMode="numeric" style={{ flex: 1 }} />
            <select className="input" value={iunit} onChange={e => setIunit(e.target.value)} style={{ width: 90 }}>
              <option value="km">km</option>
              <option value="miles">miles</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{item ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ── Log Service ─────────────────────────────────────────────────────────── */
function LogServiceDialog({ item, items, unit, currentOdo, onSave, onClose }) {
  const [selectedItem, setSelectedItem] = useState(item || (items.length === 1 ? items[0] : null))
  const [date,  setDate]  = useState(today())
  const [odo,   setOdo]   = useState(String(currentOdo || ''))
  const [notes, setNotes] = useState('')

  const iunit = selectedItem?.unit || unit

  function submit(e) {
    e.preventDefault()
    if (!selectedItem) return
    const odoVal = Math.max(0, parseInt(odo.replace(/,/g, '')) || 0)
    onSave(selectedItem, { date, odometer: odoVal, notes })
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>Log Service</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.length > 1 && (
          <div className="field">
            <label>Component</label>
            <select className="input" value={selectedItem?.id || ''} onChange={e => setSelectedItem(items.find(it => it.id === e.target.value))} required>
              <option value="">Select component…</option>
              {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
          </div>
        )}
        {selectedItem && <p style={{ fontSize: 13, color: 'var(--fg2)', margin: '-4px 0' }}>Component: <strong>{selectedItem.name}</strong></p>}
        <div className="field">
          <label>Date</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Odometer ({iunit})</label>
          <input className="input" value={odo} onChange={e => setOdo(e.target.value)} placeholder="e.g. 125000" inputMode="numeric" required />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. Used Castrol 5W40" />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!selectedItem}>Log Service</button>
        </div>
      </form>
    </Modal>
  )
}

/* ── Edit history entry ──────────────────────────────────────────────────── */
function EditEntryDialog({ entry, item, unit, onSave, onClose }) {
  const iunit = item?.unit || unit
  const [date,  setDate]  = useState(entry.date  || today())
  const [odo,   setOdo]   = useState(String(entry.odometer || ''))
  const [notes, setNotes] = useState(entry.notes || '')

  function submit(e) {
    e.preventDefault()
    onSave({ date, odometer: Math.max(0, parseInt(odo.replace(/,/g, '')) || 0), notes })
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>Edit Service Entry</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>Date</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Odometer ({iunit})</label>
          <input className="input" value={odo} onChange={e => setOdo(e.target.value)} inputMode="numeric" required />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  )
}

/* ── Modal wrapper ──────────────────────────────────────────────────────── */
function Modal({ children, onClose }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">{children}</div>
    </div>
  )
}
