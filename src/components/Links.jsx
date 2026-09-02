import { useState } from 'react'
import { newId } from '../utils'
import { useLang } from '../i18n'

export default function Links({ links, onChange }) {
  const { t } = useLang()
  const list = links || []
  const [dialog, setDialog] = useState(null)

  function saveLink(formData) {
    if (dialog.mode === 'add') {
      onChange([...list, { id: newId(), name: formData.name, url: formData.url, notes: formData.notes }])
    } else {
      onChange(list.map(l => l.id === dialog.link.id ? { ...l, ...formData } : l))
    }
    setDialog(null)
  }

  function deleteLink(id) {
    if (!window.confirm(t('links.confirmDelete'))) return
    onChange(list.filter(l => l.id !== id))
  }

  function openLink(url) {
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="maint-toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => setDialog({ mode: 'add' })}>{t('links.add')}</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {list.length === 0 ? (
          <div className="empty">
            <h3>{t('links.empty')}</h3>
            <p>{t('links.emptyHint')}</p>
            <button className="btn btn-primary" onClick={() => setDialog({ mode: 'add' })}>{t('links.add')}</button>
          </div>
        ) : (
          <div className="tree">
            {list.map(link => (
              <div key={link.id} className="part-row" onClick={() => openLink(link.url)} style={{ cursor: 'pointer' }}>
                <div className="part-name">
                  <div className="part-name-text">{link.name}</div>
                  <div className="part-info">{link.url}{link.notes && ` · ${link.notes}`}</div>
                </div>
                <div className="part-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" title={t('links.openTitle')} onClick={() => openLink(link.url)}>🔗</button>
                  <button className="btn-icon" title={t('links.editTitle')} onClick={() => setDialog({ mode: 'edit', link })}>✎</button>
                  <button className="btn-icon" title={t('links.deleteTitle')} style={{ color: 'var(--danger)' }} onClick={() => deleteLink(link.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialog && (
        <LinkDialog
          mode={dialog.mode}
          link={dialog.link}
          onSave={saveLink}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

function LinkDialog({ mode, link, onSave, onClose }) {
  const { t } = useLang()
  const [name,  setName]  = useState(link?.name  || '')
  const [url,   setUrl]   = useState(link?.url   || '')
  const [notes, setNotes] = useState(link?.notes || '')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) { setError(t('links.required')); return }
    onSave({ name: name.trim(), url: url.trim(), notes: notes.trim() })
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2>{mode === 'edit' ? t('links.editTitleModal') : t('links.addTitleModal')}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>{t('links.name')}</label>
          <input className={`input ${error ? 'input-error' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder={t('links.namePlaceholder')} autoFocus />
        </div>
        <div className="field">
          <label>{t('links.url')}</label>
          <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder={t('links.urlPlaceholder')} />
          {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
        </div>
        <div className="field">
          <label>{t('links.notes')}</label>
          <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={t('links.notesPlaceholder')} />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('links.cancel')}</button>
          <button type="submit" className="btn btn-primary">{mode === 'edit' ? t('links.save') : t('links.addSubmit')}</button>
        </div>
      </form>
    </Modal>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">{children}</div>
    </div>
  )
}
