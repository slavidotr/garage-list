import { useState, useEffect, useRef } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useTheme } from '../App'
import { useBuilds } from '../hooks/useBuilds'
import { ensureIds, EMPTY_MAINT } from '../utils'
import BuildPlanner from './BuildPlanner'
import Budget from './Budget'
import Maintenance from './Maintenance'

const TABS = ['Planner', 'Budget', 'Maintenance']

export default function Layout({ user }) {
  const { theme, toggle: toggleTheme } = useTheme()
  const { buildList, loading, createBuild, saveBuild, deleteBuild, renameBuild, setFavourite } = useBuilds(user.uid)

  const [currentBuild, setCurrentBuild] = useState(null)
  const [dirty,        setDirty]        = useState(false)
  const [tab,          setTab]          = useState(0)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [newBuildName, setNewBuildName] = useState('')
  const [showNewBuild, setShowNewBuild] = useState(false)
  const [importError,  setImportError]  = useState(null)
  const importRef = useRef()

  // Auto-select favourite or first build
  useEffect(() => {
    if (!buildList.length || currentBuild) return
    const fav   = buildList.find(b => b.isFavourite)
    const first = buildList[0]
    const pick  = fav || first
    if (pick) loadBuild(pick)
  }, [buildList])

  function loadBuild(build) {
    setCurrentBuild({
      ...build,
      items:           ensureIds(build.items || []),
      trash:           build.trash || [],
      maintenance_log: build.maintenance_log || EMPTY_MAINT,
    })
    setDirty(false)
  }

  async function handleSave() {
    if (!currentBuild || !dirty) return
    await saveBuild(currentBuild.id, {
      name:            currentBuild.name,
      items:           currentBuild.items,
      trash:           currentBuild.trash,
      maintenance_log: currentBuild.maintenance_log,
      isFavourite:     currentBuild.isFavourite,
    })
    setDirty(false)
  }

  // Ctrl+S
  useEffect(() => {
    const handler = e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentBuild, dirty])

  function updateBuild(patch) {
    setCurrentBuild(prev => ({ ...prev, ...patch }))
    setDirty(true)
  }

  async function handleCreateBuild(e) {
    e.preventDefault()
    const name = newBuildName.trim()
    if (!name) return
    const id = await createBuild(name)
    setNewBuildName(''); setShowNewBuild(false)
    // Load the new build after it appears in buildList
    setTimeout(() => {
      const b = { id, name, items: [], trash: [], maintenance_log: EMPTY_MAINT, isFavourite: false }
      loadBuild(b)
    }, 300)
  }

  async function handleDeleteBuild(id) {
    if (!window.confirm('Delete this build? This cannot be undone.')) return
    if (currentBuild?.id === id) setCurrentBuild(null)
    await deleteBuild(id)
  }

  async function handleRenameBuild(id, currentName) {
    const name = window.prompt('New build name:', currentName)
    if (!name || name.trim() === currentName) return
    await renameBuild(id, name.trim())
    if (currentBuild?.id === id) setCurrentBuild(prev => ({ ...prev, name: name.trim() }))
  }

  async function handleFavourite(id, current) {
    await setFavourite(id, !current)
    if (currentBuild?.id === id) updateBuild({ isFavourite: !current })
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    importRef.current.value = ''
    setImportError(null)

    let parsed
    try {
      const text = await file.text()
      parsed = JSON.parse(text)
    } catch {
      setImportError('Could not parse file — make sure it is a valid Garage .json file.')
      return
    }

    const items  = parsed.items  || []
    const trash  = parsed.trash  || []
    const maint  = parsed.maintenance_log || EMPTY_MAINT
    const name   = file.name.replace(/\.json$/i, '')

    try {
      const id = await createBuild(name)
      await saveBuild(id, { name, items: ensureIds(items), trash, maintenance_log: maint, isFavourite: false })
      setTimeout(() => {
        loadBuild({ id, name, items: ensureIds(items), trash, maintenance_log: maint, isFavourite: false })
        setDrawerOpen(false)
      }, 300)
    } catch {
      setImportError('Failed to save the imported build. Try again.')
    }
  }

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sidebar-header">
        <span>🔧 Garage</span>
        <button className="btn-icon" title="Sign out" onClick={() => signOut(auth)}>↩</button>
      </div>
      <div className="sidebar-builds">
        {loading && <div style={{ padding: '12px', color: 'var(--fg2)', fontSize: 13 }}>Loading…</div>}
        {buildList.map(b => (
          <div
            key={b.id}
            className={`build-item ${currentBuild?.id === b.id ? 'active' : ''}`}
            onClick={() => { loadBuild(b); setDrawerOpen(false) }}
          >
            {b.isFavourite && <span title="Favourite">★</span>}
            <span className="build-item-name">{b.name}</span>
            <span className="build-actions" onClick={e => e.stopPropagation()}>
              <button title="Rename" onClick={() => handleRenameBuild(b.id, b.name)}>✎</button>
              <button title={b.isFavourite ? 'Unmark favourite' : 'Mark favourite'} onClick={() => handleFavourite(b.id, b.isFavourite)}>
                {b.isFavourite ? '★' : '☆'}
              </button>
              <button title="Delete build" onClick={() => handleDeleteBuild(b.id)}>✕</button>
            </span>
          </div>
        ))}

        {showNewBuild ? (
          <form onSubmit={handleCreateBuild} style={{ padding: '6px 4px', display: 'flex', gap: 4 }}>
            <input
              className="input"
              autoFocus
              value={newBuildName}
              onChange={e => setNewBuildName(e.target.value)}
              placeholder="Build name…"
              style={{ flex: 1, fontSize: 12 }}
              onKeyDown={e => e.key === 'Escape' && setShowNewBuild(false)}
            />
            <button className="btn btn-primary btn-sm" type="submit">Add</button>
          </form>
        ) : (
          <button className="build-item" onClick={() => setShowNewBuild(true)} style={{ color: 'var(--accent)', fontWeight: 600 }}>
            + New Build
          </button>
        )}

        <button
          className="build-item"
          onClick={() => importRef.current.click()}
          style={{ color: 'var(--fg2)', fontSize: 12 }}
        >
          ↑ Import .json
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        {importError && (
          <div style={{ padding: '4px 8px', fontSize: 11, color: 'var(--status-over)', lineHeight: 1.4 }}>
            {importError}
          </div>
        )}
      </div>
      <div className="sidebar-footer" style={{ fontSize: 12, color: 'var(--fg2)' }}>
        {user.displayName || user.email}
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <div className="sidebar">{sidebar}</div>

      {/* Mobile drawer */}
      <div className={`sidebar-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`sidebar-drawer ${drawerOpen ? 'open' : ''}`}>{sidebar}</div>

      <div className="main">
        <div className="header">
          <button className="btn-icon menu-btn" onClick={() => setDrawerOpen(true)}>☰</button>
          <div className={`header-title${dirty ? ' dirty' : ''}`}>
            {currentBuild ? currentBuild.name : 'No build selected'}
          </div>
          <div className="header-actions">
            {dirty && (
              <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
            )}
            <button className="btn-icon" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀' : '🌙'}
            </button>
            <div className="user-avatar" title={user.email} onClick={() => signOut(auth)}>
              {(user.displayName || user.email || '?')[0].toUpperCase()}
            </div>
          </div>
        </div>

        {currentBuild ? (
          <>
            <div className="tabs">
              {TABS.map((t, i) => (
                <button key={t} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
              ))}
            </div>
            <div className="tab-content">
              {tab === 0 && (
                <BuildPlanner
                  items={currentBuild.items}
                  trash={currentBuild.trash}
                  onChange={(items, trash) => updateBuild({ items, trash })}
                />
              )}
              {tab === 1 && <Budget items={currentBuild.items} />}
              {tab === 2 && (
                <Maintenance
                  log={currentBuild.maintenance_log}
                  onChange={maintenance_log => updateBuild({ maintenance_log })}
                />
              )}
            </div>
          </>
        ) : (
          <div className="empty">
            <h3>No build selected</h3>
            <p>Pick a build from the sidebar or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  )
}
