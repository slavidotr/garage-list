import { useState, useEffect } from 'react'
import { newId, EMPTY_MAINT, STATUS_OPTIONS, STATUS_INFO, fmt, sumPrices } from '../utils'
import { useLang } from '../i18n'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function addInterval(dateStr, amount, unit) {
  const d = new Date(dateStr + 'T00:00:00')
  if (unit === 'years') d.setFullYear(d.getFullYear() + amount)
  else if (unit === 'days') d.setDate(d.getDate() + amount)
  else d.setMonth(d.getMonth() + amount)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000)
}

function isDistanceTracked(item) {
  return !item.intervalType || item.intervalType === 'distance'
}

function lastHistoryDate(history) {
  if (!history.length) return null
  return history.reduce((max, h) => (h.date && h.date > max ? h.date : max), history[0].date || '')
}

function calcStatus(item, currentOdo, todayStr, t) {
  const history = item.history || []
  const interval = item.interval || 0
  const type = item.intervalType

  if (type === 'fixedDate') {
    const lastDate = lastHistoryDate(history)
    if (!item.dueDate) return { tag: 'ok', text: t('maint.statusNoInterval'), lastValue: lastDate, nextValue: null }
    const daysLeft = daysBetween(todayStr, item.dueDate)
    if (todayStr >= item.dueDate) return { tag: 'over', text: t('maint.statusOverdue'), lastValue: lastDate, nextValue: item.dueDate }
    if (daysLeft <= 30) return { tag: 'soon', text: t('maint.statusSoon'), lastValue: lastDate, nextValue: item.dueDate }
    return { tag: 'ok', text: t('maint.statusOk'), lastValue: lastDate, nextValue: item.dueDate }
  }

  if (!history.length) return { tag: 'none', text: t('maint.statusNone'), lastValue: null, nextValue: null }

  if (type === 'time' || type === 'date') {
    const lastDate = lastHistoryDate(history)
    if (!interval) return { tag: 'ok', text: t('maint.statusNoInterval'), lastValue: lastDate, nextValue: null }
    const nextDate  = addInterval(lastDate, interval, item.unit)
    const totalDays = daysBetween(lastDate, nextDate)
    const daysLeft  = daysBetween(todayStr, nextDate)
    if (todayStr >= nextDate) return { tag: 'over', text: t('maint.statusOverdue'), lastValue: lastDate, nextValue: nextDate }
    if (daysLeft <= totalDays * 0.1) return { tag: 'soon', text: t('maint.statusSoon'), lastValue: lastDate, nextValue: nextDate }
    return { tag: 'ok', text: t('maint.statusOk'), lastValue: lastDate, nextValue: nextDate }
  }

  const lastOdo = Math.max(...history.map(h => h.odometer || 0))
  const nextDue = interval ? lastOdo + interval : null
  if (!nextDue) return { tag: 'ok', text: t('maint.statusNoInterval'), lastValue: lastOdo, nextValue: null }
  if (currentOdo >= nextDue) return { tag: 'over', text: t('maint.statusOverdue'), lastValue: lastOdo, nextValue: nextDue }
  if (currentOdo >= nextDue - interval * 0.1) return { tag: 'soon', text: t('maint.statusSoon'), lastValue: lastOdo, nextValue: nextDue }
  return { tag: 'ok', text: t('maint.statusOk'), lastValue: lastOdo, nextValue: nextDue }
}

export default function Maintenance({ log, onChange }) {
  const { t } = useLang()
  const data    = log || EMPTY_MAINT
  const unit    = data.unit || 'km'
  const odoRaw  = data.current_odometer || 0
  const mitems  = data.items || []
  const mparts  = data.parts || []
  const toBuy   = mparts.filter(p => p.status !== 'installed' && p.status !== 'sold')

  const [odoInput, setOdoInput] = useState(String(odoRaw))
  const [expanded, setExpanded] = useState({})
  const [dialog,   setDialog]   = useState(null)

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
      update({ items: [...mitems, { id: newId(), name: formData.name, interval: formData.interval, intervalType: formData.intervalType, unit: formData.unit, history: [] }] })
    } else {
      update({ items: mitems.map(it => it.id === dialog.item.id ? { ...it, ...formData } : it) })
    }
    setDialog(null)
  }

  function deleteItem(id) {
    if (!window.confirm(t('maint.confirmDeleteItem'))) return
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
    if (!window.confirm(t('maint.confirmDeleteEntry'))) return
    const newHistory = (mitem.history || []).filter(h => h.id !== entryId)
    update({ items: mitems.map(it => it.id === mitem.id ? { ...it, history: newHistory } : it) })
  }

  function savePart(formData, mode, originalItem) {
    const part = {
      ...(mode === 'edit' ? originalItem : {}),
      id:        mode === 'edit' ? originalItem.id : newId(),
      name:      formData.name,
      info:      formData.info,
      link:      formData.link,
      price:     parseFloat(formData.price.replace(',', '.')) || 0,
      qty:       parseInt(formData.qty) || 1,
      status:    formData.status,
      notes:     formData.notes,
      forItemId: formData.forItemId || null,
    }
    const newParts = mode === 'edit'
      ? mparts.map(p => p.id === originalItem.id ? part : p)
      : [...mparts, part]
    update({ parts: newParts })
    setDialog(null)
  }

  function deletePart(id) {
    if (!window.confirm(t('maint.parts.confirmDelete'))) return
    update({ parts: mparts.filter(p => p.id !== id) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="maint-toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => setDialog({ type: 'addItem' })}>{t('maint.addItem')}</button>
        <button className="btn btn-ghost btn-sm"   onClick={() => dialog?.type !== 'logService' && setDialog({ type: 'logService', item: null })}>{t('maint.logService')}</button>
        <div className="odo-group">
          <label>{t('maint.odometer')}</label>
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

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {mitems.length === 0 ? (
          <div className="empty">
            <h3>{t('maint.noItems')}</h3>
            <p>{t('maint.noItemsHint')}</p>
            <button className="btn btn-primary" onClick={() => setDialog({ type: 'addItem' })}>{t('maint.addItem')}</button>
          </div>
        ) : (
          <table className="maint-table">
            <thead>
              <tr>
                <th>{t('maint.colComponent')}</th>
                <th>{t('maint.colInterval')}</th>
                <th>{t('maint.colLastService')}</th>
                <th>{t('maint.colNextDue')}</th>
                <th>{t('maint.colStatus')}</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {mitems.map(mitem => {
                const isTimeBased  = mitem.intervalType === 'time' || mitem.intervalType === 'date'
                const isFixedDate  = mitem.intervalType === 'fixedDate'
                const isDateDisplay = isTimeBased || isFixedDate
                const { tag, text, lastValue, nextValue } = calcStatus(mitem, odoRaw, today(), t)
                const intervalUnit = mitem.unit || (isTimeBased ? 'months' : unit)
                const distUnit     = isDateDisplay ? unit : intervalUnit
                const isOpen       = expanded[mitem.id]
                const history      = [...(mitem.history || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                const linkedParts  = mparts.filter(p => p.forItemId === mitem.id)
                return [
                  <tr key={mitem.id} className="maint-item-row" onClick={() => toggleExpand(mitem.id)}>
                    <td>
                      <div className="maint-comp-name">
                        <span style={{ fontSize: 11, color: 'var(--fg2)' }}>{isOpen ? '▼' : '▶'}</span>
                        {mitem.name}
                      </div>
                    </td>
                    <td>{isFixedDate ? '—' : (mitem.interval ? `${mitem.interval.toLocaleString()} ${isTimeBased ? t(`maintItem.unit.${intervalUnit}`) : intervalUnit}` : '—')}</td>
                    <td>{lastValue != null ? (isDateDisplay ? lastValue : `${lastValue.toLocaleString()} ${intervalUnit}`) : '—'}</td>
                    <td>{nextValue != null ? (isDateDisplay ? nextValue : `${nextValue.toLocaleString()} ${intervalUnit}`) : '—'}</td>
                    <td><span className={`status-${tag}`}>{text}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn-icon" title={t('maint.logServiceTitle')} onClick={() => setDialog({ type: 'logService', item: mitem })}>+</button>
                        <button className="btn-icon" title={t('maint.editTitle')} onClick={() => setDialog({ type: 'editItem', item: mitem })}>✎</button>
                        <button className="btn-icon" title={t('maint.deleteTitle')} style={{ color: 'var(--danger)' }} onClick={() => deleteItem(mitem.id)}>✕</button>
                      </div>
                    </td>
                  </tr>,
                  isOpen && history.map(entry => (
                    <tr key={entry.id} className="maint-history-row">
                      <td colSpan={4} style={{ paddingLeft: 32 }}>
                        📅 {entry.date}  ·  {entry.odometer?.toLocaleString()} {distUnit}
                        {entry.notes && <span style={{ marginLeft: 8, color: 'var(--fg2)' }}>{entry.notes}</span>}
                      </td>
                      <td />
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn-icon" title={t('maint.editEntryTitle')} onClick={e => { e.stopPropagation(); setDialog({ type: 'editEntry', item: mitem, entry }) }}>✎</button>
                          <button className="btn-icon" title={t('maint.deleteEntryTitle')} style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); deleteEntry(mitem, entry.id) }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )),
                  isOpen && (
                    <tr key={`${mitem.id}-parts`} className="maint-history-row">
                      <td colSpan={6} style={{ padding: 0 }} onClick={e => e.stopPropagation()}>
                        <div className="maint-inline-parts">
                          <div className="maint-inline-parts-header">
                            <span>{t('maint.parts.title')}</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setDialog({ type: 'addPart', forItemId: mitem.id })}>{t('maint.parts.add')}</button>
                          </div>
                          {linkedParts.length === 0 ? (
                            <p className="maint-inline-parts-empty">{t('maint.parts.noneForItem')}</p>
                          ) : (
                            linkedParts.map(part => (
                              <MaintPartRow
                                key={part.id}
                                part={part}
                                items={mitems}
                                hideForLabel
                                onEdit={() => setDialog({ type: 'editPart', item: part })}
                                onDelete={() => deletePart(part.id)}
                              />
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ]
              })}
            </tbody>
          </table>
        )}

        <div className="maint-section-header">
          <h3>{t('maint.parts.title')}</h3>
          <span className="maint-section-meta">
            {toBuy.length > 0 ? t('maint.parts.toBuy', { amount: fmt(sumPrices(toBuy)), n: toBuy.length }) : t('maint.parts.allDone')}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setDialog({ type: 'addPart' })}>{t('maint.parts.add')}</button>
        </div>
        {mparts.length === 0 ? (
          <p className="maint-section-empty">{t('maint.parts.empty')}</p>
        ) : (
          <div className="tree">
            {mparts.map(part => (
              <MaintPartRow
                key={part.id}
                part={part}
                items={mitems}
                onEdit={() => setDialog({ type: 'editPart', item: part })}
                onDelete={() => deletePart(part.id)}
              />
            ))}
          </div>
        )}
      </div>

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
      {dialog?.type === 'addPart' && (
        <MaintPartDialog mode="add" items={mitems} initialForItemId={dialog.forItemId} onSave={(data) => savePart(data, 'add', null)} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'editPart' && (
        <MaintPartDialog mode="edit" item={dialog.item} items={mitems} onSave={(data) => savePart(data, 'edit', dialog.item)} onClose={() => setDialog(null)} />
      )}
    </div>
  )
}

/* ── Parts Needed ───────────────────────────────────────────────────────── */
function MaintPartRow({ part, items, onEdit, onDelete, hideForLabel }) {
  const { t } = useLang()
  const si    = STATUS_INFO[part.status] || STATUS_INFO.planned
  const qty   = parseInt(part.qty) || 1
  const price = (parseFloat(part.price) || 0) * qty
  const linkedItem = hideForLabel ? null : items.find(it => it.id === part.forItemId)

  return (
    <div className="part-row">
      <div className="status-dot" style={{ background: si.colorVar }} title={t(`status.${part.status}`)} />
      <div className="part-name">
        <div className="part-name-text" style={{ color: si.colorVar }}>
          {si.symbol}{part.name}
          {qty > 1 && <span style={{ color: 'var(--fg2)', fontSize: 11 }}> ×{qty}</span>}
        </div>
        {(part.info || linkedItem) && (
          <div className="part-info">
            {part.info}
            {part.info && linkedItem && ' · '}
            {linkedItem && t('maint.parts.for', { name: linkedItem.name })}
          </div>
        )}
      </div>
      {price > 0 && <div className="part-price">{fmt(price)}</div>}
      <div className="part-actions">
        {part.link && (
          <button className="btn-icon" title={t('planner.openLink')} onClick={() => window.open(part.link, '_blank')}>🔗</button>
        )}
        <button className="btn-icon" title={t('maint.editTitle')} onClick={onEdit}>✎</button>
        <button className="btn-icon" title={t('maint.deleteTitle')} style={{ color: 'var(--danger)' }} onClick={onDelete}>✕</button>
      </div>
    </div>
  )
}

function MaintPartDialog({ mode, item, items, initialForItemId, onSave, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState({
    name:      item?.name  || '',
    info:      item?.info  || '',
    link:      item?.link  || '',
    price:     item?.price != null ? String(item.price) : '',
    qty:       item?.qty   != null ? String(item.qty)   : '1',
    status:    item?.status || 'planned',
    notes:     item?.notes || '',
    forItemId: item?.forItemId || initialForItemId || '',
  })
  const [error, setError] = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError(t('partDialog.required')); return }
    onSave(form)
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>{mode === 'edit' ? t('maint.parts.editTitle') : t('maint.parts.addTitle')}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>{t('partDialog.name')}</label>
          <input className={`input ${error ? 'input-error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('partDialog.namePlaceholder')} autoFocus />
          {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
        </div>
        <div className="field">
          <label>{t('partDialog.info')}</label>
          <input className="input" value={form.info} onChange={e => set('info', e.target.value)} placeholder={t('partDialog.infoPlaceholder')} />
        </div>
        {items.length > 0 && (
          <div className="field">
            <label>{t('maint.parts.forComponent')}</label>
            <select className="input" value={form.forItemId} onChange={e => set('forItemId', e.target.value)}>
              <option value="">{t('maint.parts.noComponent')}</option>
              {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
          </div>
        )}
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
          <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder={t('partDialog.notesPlaceholder')} />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('partDialog.cancel')}</button>
          <button type="submit" className="btn btn-primary">{mode === 'edit' ? t('partDialog.saveSubmit') : t('partDialog.addSubmit')}</button>
        </div>
      </form>
    </Modal>
  )
}

function ItemDialog({ item, unit, onSave, onClose }) {
  const { t } = useLang()
  const initialType = item?.intervalType === 'date' ? 'time' : (item?.intervalType || 'distance')
  const [name,         setName]         = useState(item?.name         || '')
  const [interval,     setInterval]     = useState(item?.interval != null ? String(item.interval) : '')
  const [intervalType, setIntervalType] = useState(initialType)
  const [iunit,        setIunit]        = useState(item?.unit || (initialType === 'time' ? 'months' : unit))
  const [dueDate,      setDueDate]      = useState(item?.dueDate || today())

  function switchType(type) {
    setIntervalType(type)
    if (type === 'time') setIunit('months')
    else if (type === 'distance') setIunit(unit)
  }

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (intervalType === 'fixedDate') {
      onSave({ name: name.trim(), intervalType, dueDate, interval: 0, unit: null })
    } else {
      onSave({ name: name.trim(), intervalType, interval: Math.max(0, parseInt(interval.replace(/,/g, '')) || 0), unit: iunit, dueDate: null })
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>{item ? t('maintItem.editTitle') : t('maintItem.addTitle')}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>{t('maintItem.name')}</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={t('maintItem.namePlaceholder')} autoFocus required />
        </div>
        <div className="field">
          <label>{t('maintItem.trackBy')}</label>
          <select className="input" value={intervalType} onChange={e => switchType(e.target.value)}>
            <option value="distance">{t('maintItem.byDistance')}</option>
            <option value="time">{t('maintItem.byTime')}</option>
            <option value="fixedDate">{t('maintItem.byFixedDate')}</option>
          </select>
        </div>
        {intervalType === 'fixedDate' ? (
          <div className="field">
            <label>{t('maintItem.dueDate')}</label>
            <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        ) : (
          <div className="field">
            <label>{t('maintItem.interval')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={interval} onChange={e => setInterval(e.target.value)} placeholder={intervalType === 'time' ? t('maintItem.intervalPlaceholderDate') : t('maintItem.intervalPlaceholder')} inputMode="numeric" style={{ flex: 1 }} />
              <select className="input" value={iunit} onChange={e => setIunit(e.target.value)} style={{ width: 100 }}>
                {intervalType === 'distance' ? (
                  <>
                    <option value="km">km</option>
                    <option value="miles">miles</option>
                  </>
                ) : (
                  <>
                    <option value="days">{t('maintItem.unit.days')}</option>
                    <option value="months">{t('maintItem.unit.months')}</option>
                    <option value="years">{t('maintItem.unit.years')}</option>
                  </>
                )}
              </select>
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('maintItem.cancel')}</button>
          <button type="submit" className="btn btn-primary">{item ? t('maintItem.save') : t('maintItem.add')}</button>
        </div>
      </form>
    </Modal>
  )
}

function LogServiceDialog({ item, items, unit, currentOdo, onSave, onClose }) {
  const { t } = useLang()
  const [selectedItem, setSelectedItem] = useState(item || (items.length === 1 ? items[0] : null))
  const [date,  setDate]  = useState(today())
  const [odo,   setOdo]   = useState(String(currentOdo || ''))
  const [notes, setNotes] = useState('')

  const iunit = (selectedItem && isDistanceTracked(selectedItem) && selectedItem.unit) || unit

  function submit(e) {
    e.preventDefault()
    if (!selectedItem) return
    onSave(selectedItem, { date, odometer: Math.max(0, parseInt(odo.replace(/,/g, '')) || 0), notes })
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>{t('logService.title')}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.length > 1 && (
          <div className="field">
            <label>{t('logService.component')}</label>
            <select className="input" value={selectedItem?.id || ''} onChange={e => setSelectedItem(items.find(it => it.id === e.target.value))} required>
              <option value="">{t('logService.selectComponent')}</option>
              {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
          </div>
        )}
        {selectedItem && <p style={{ fontSize: 13, color: 'var(--fg2)', margin: '-4px 0' }}>{t('logService.component')}: <strong>{selectedItem.name}</strong></p>}
        <div className="field">
          <label>{t('logService.date')}</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('logService.odometer', { unit: iunit })}</label>
          <input className="input" value={odo} onChange={e => setOdo(e.target.value)} placeholder={t('logService.odoPlaceholder')} inputMode="numeric" required />
        </div>
        <div className="field">
          <label>{t('logService.notes')}</label>
          <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={t('logService.notesPlaceholder')} />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('logService.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={!selectedItem}>{t('logService.submit')}</button>
        </div>
      </form>
    </Modal>
  )
}

function EditEntryDialog({ entry, item, unit, onSave, onClose }) {
  const { t } = useLang()
  const iunit = (item && isDistanceTracked(item) && item.unit) || unit
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
        <h2>{t('editEntry.title')}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>{t('editEntry.date')}</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('editEntry.odometer', { unit: iunit })}</label>
          <input className="input" value={odo} onChange={e => setOdo(e.target.value)} inputMode="numeric" required />
        </div>
        <div className="field">
          <label>{t('editEntry.notes')}</label>
          <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('editEntry.cancel')}</button>
          <button type="submit" className="btn btn-primary">{t('editEntry.save')}</button>
        </div>
      </form>
    </Modal>
  )
}

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
