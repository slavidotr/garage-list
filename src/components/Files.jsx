import { useState, useRef, useEffect } from 'react'
import { useFiles, fileToData } from '../hooks/useFiles'
import { useLang } from '../i18n'

export default function Files({ uid, buildId }) {
  const { t } = useLang()
  const { files, loading, addFile, updateFile, deleteFile } = useFiles(uid, buildId)
  const [uploading, setUploading] = useState(0)
  const [error,     setError]     = useState(null)
  const [dragOver,  setDragOver]  = useState(false)
  const [viewing,   setViewing]   = useState(null)
  const inputRef = useRef()

  async function upload(fileList) {
    const list = Array.from(fileList || [])
    if (!list.length) return
    setError(null)
    setUploading(n => n + list.length)
    const tooBig = []
    for (const file of list) {
      try {
        const res = await fileToData(file)
        if (!res) { tooBig.push(file.name); continue }
        const name = file.name || `pasted-${Date.now()}.jpg`
        await addFile({ name, title: name.replace(/\.[^.]+$/, ''), notes: '', type: res.type, size: res.data.length, data: res.data })
      } catch {
        tooBig.push(file.name)
      } finally {
        setUploading(n => n - 1)
      }
    }
    if (tooBig.length) setError(t('files.errTooBig', { names: tooBig.join(', ') }))
  }

  // Paste screenshots straight into the tab
  useEffect(() => {
    function handler(e) {
      if (e.target.closest?.('input, textarea')) return
      const pasted = Array.from(e.clipboardData?.files || [])
      if (pasted.length) { e.preventDefault(); upload(pasted) }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [uid, buildId])

  async function handleDelete(file) {
    if (!window.confirm(t('files.confirmDelete', { name: file.title || file.name }))) return
    await deleteFile(file.id)
    setViewing(null)
  }

  const current = viewing && files.find(f => f.id === viewing)

  return (
    <div
      className={`files-page ${dragOver ? 'drag-over' : ''}`}
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(false) }}
      onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files) }}
    >
      <div className="maint-toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => inputRef.current.click()}>{t('files.upload')}</button>
        <span style={{ fontSize: 12, color: 'var(--fg2)' }}>
          {uploading > 0 ? t('files.uploading', { n: uploading }) : t('files.hint')}
        </span>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => { upload(e.target.files); e.target.value = '' }} />
      </div>
      {error && <div className="files-error">{error}</div>}

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {!loading && files.length === 0 ? (
          <div className="empty">
            <h3>{t('files.empty')}</h3>
            <p>{t('files.emptyHint')}</p>
            <button className="btn btn-primary" onClick={() => inputRef.current.click()}>{t('files.upload')}</button>
          </div>
        ) : (
          <div className="files-grid">
            {files.map(file => (
              <div key={file.id} className="file-card" onClick={() => setViewing(file.id)}>
                <div className="file-thumb">
                  {file.type?.startsWith('image/')
                    ? <img src={file.data} alt={file.title} loading="lazy" />
                    : <span className="file-icon">📄</span>}
                </div>
                <div className="file-card-title">{file.title || file.name}</div>
                {file.notes && <div className="file-card-notes">{file.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {current && (
        <FileViewer
          file={current}
          onSave={changes => updateFile(current.id, changes)}
          onDelete={() => handleDelete(current)}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

function FileViewer({ file, onSave, onDelete, onClose }) {
  const { t } = useLang()
  const [title, setTitle] = useState(file.title || '')
  const [notes, setNotes] = useState(file.notes || '')
  const isImage = file.type?.startsWith('image/')
  const changed = title !== (file.title || '') || notes !== (file.notes || '')

  async function save() {
    if (changed) await onSave({ title: title.trim(), notes })
    onClose()
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="modal-header">
        <h2>{file.title || file.name}</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      {isImage ? (
        <a href={file.data} target="_blank" rel="noreferrer"><img className="file-viewer-img" src={file.data} alt={file.title} /></a>
      ) : (
        <div className="file-viewer-other">📄 {file.name}</div>
      )}
      <div className="field">
        <label>{t('files.title')}</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('files.notes')}</label>
        <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={t('files.notesPlaceholder')} />
      </div>
      <div className="modal-footer">
        <button className="btn btn-danger btn-sm" onClick={onDelete}>{t('files.delete')}</button>
        <a className="btn btn-ghost btn-sm" href={file.data} download={file.name}>{t('files.download')}</a>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onClose}>{t('files.cancel')}</button>
        <button className="btn btn-primary" onClick={save}>{t('files.save')}</button>
      </div>
    </Modal>
  )
}

function Modal({ children, onClose, wide }) {
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 820, width: '100%' } : undefined}>{children}</div>
    </div>
  )
}
