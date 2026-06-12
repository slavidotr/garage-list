import { STATUS_OPTIONS, STATUS_INFO, sumPrices, fmt } from '../utils'

export default function Budget({ items }) {
  const totals = { planned: 0, ordered: 0, installed: 0, sold: 0 }

  function collectRows(items, folderName) {
    const rows = []
    for (const item of items) {
      if (item.type === 'folder') {
        const folderTotal = sumPrices(item.children || [])
        const children    = item.children || []
        const inst        = children.filter(c => c.status === 'installed').length
        rows.push({ kind: 'folder', name: item.name, total: folderTotal, inst, count: children.length })
        for (const child of children) {
          if (child.type !== 'folder') {
            const qty   = parseInt(child.qty) || 1
            const price = (parseFloat(child.price) || 0) * qty
            totals[child.status] = (totals[child.status] || 0) + price
            rows.push({ kind: 'part', item: child, price, qty, folder: item.name })
          }
        }
      } else {
        const qty   = parseInt(item.qty) || 1
        const price = (parseFloat(item.price) || 0) * qty
        totals[item.status] = (totals[item.status] || 0) + price
        rows.push({ kind: 'part', item, price, qty, folder: null })
      }
    }
    return rows
  }

  const rows  = collectRows(items)
  const grand = Object.values(totals).reduce((a, b) => a + b, 0)

  if (items.length === 0) {
    return (
      <div className="empty">
        <h3>No parts yet</h3>
        <p>Add parts in the Planner tab to see the budget breakdown.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      <table className="budget-table">
        <thead>
          <tr>
            <th>Part / Category</th>
            <th style={{ textAlign: 'right' }}>Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.kind === 'folder') {
              return (
                <tr key={i} className="budget-folder">
                  <td>📁 {row.name} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--fg2)' }}>{row.inst}/{row.count} installed</span></td>
                  <td>{fmt(row.total)}</td>
                </tr>
              )
            }
            const si  = STATUS_INFO[row.item.status] || STATUS_INFO.planned
            const qty = row.qty > 1 ? ` ×${row.qty}` : ''
            return (
              <tr key={i}>
                <td style={{ paddingLeft: row.folder ? 28 : 12, color: si.colorVar }}>
                  {si.symbol}{row.item.part}{qty}
                  {row.item.info && <span style={{ color: 'var(--fg2)', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>{row.item.info}</span>}
                </td>
                <td style={{ color: si.colorVar }}>{fmt(row.price)}</td>
              </tr>
            )
          })}

          <tr className="budget-sep"><td colSpan={2} /></tr>

          {STATUS_OPTIONS.filter(s => totals[s] > 0).map(s => {
            const si = STATUS_INFO[s]
            return (
              <tr key={s}>
                <td style={{ color: si.colorVar, paddingLeft: 28 }}>{si.symbol}{si.label}</td>
                <td style={{ color: si.colorVar }}>{fmt(totals[s])}</td>
              </tr>
            )
          })}

          <tr className="budget-sep"><td colSpan={2} /></tr>
          <tr className="budget-total">
            <td>Total</td>
            <td>{fmt(grand)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
