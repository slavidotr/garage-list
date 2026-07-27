import { useEffect } from 'react'
import { useLang } from '../i18n'

const FEATURES = {
  en: [
    {
      section: 'Planner',
      items: [
        'Add parts and organise them into folders',
        'Track status: Planned → Ordered → Installed → Sold',
        'Add price, quantity, info, link, and notes per part',
        'Store multiple alternatives for each part (e.g. different brands)',
        'Move parts between folders, reorder, and search',
        'Trash — delete parts and restore them later',
        'Ctrl+S to save at any time',
      ],
    },
    {
      section: 'Budget',
      items: [
        'Automatic cost breakdown by folder and status',
        'Grand total across all parts',
        'Quantity × price calculated automatically',
      ],
    },
    {
      section: 'Maintenance Log',
      items: [
        'Track service intervals for components (oil, brakes, filters, etc.)',
        'Each component has its own km/miles unit',
        'Log service entries with date, odometer, and notes',
        'Status indicators: OK, Due Soon, OVERDUE',
        'Odometer auto-updates when you log a higher reading',
      ],
    },
    {
      section: 'Builds & Cloud',
      items: [
        'Multiple builds per account — one per car or project',
        'Star a build to make it open by default',
        'Import .json files from the desktop GarageApp',
        'All data synced in real time to the cloud',
        'Works on phone and desktop browser',
      ],
    },
    {
      section: 'Other',
      items: [
        'Light and dark theme',
        'English and Spanish interface',
        'Keyboard shortcut: Ctrl+S to save',
      ],
    },
  ],
  es: [
    {
      section: 'Planificador',
      items: [
        'Añade piezas y organízalas en carpetas',
        'Sigue el estado: Planificado → Pedido → Instalado → Vendido',
        'Precio, cantidad, info, enlace y notas por pieza',
        'Guarda alternativas para cada pieza (p. ej. distintas marcas)',
        'Mueve piezas entre carpetas, reordena y busca',
        'Papelera — elimina piezas y recupéralas después',
        'Ctrl+S para guardar en cualquier momento',
      ],
    },
    {
      section: 'Presupuesto',
      items: [
        'Desglose de costes automático por carpeta y estado',
        'Total general de todas las piezas',
        'Cantidad × precio calculado automáticamente',
      ],
    },
    {
      section: 'Registro de mantenimiento',
      items: [
        'Sigue los intervalos de servicio (aceite, frenos, filtros, etc.)',
        'Cada componente tiene su propia unidad km/millas',
        'Registra entradas con fecha, odómetro y notas',
        'Indicadores de estado: OK, Próximamente, VENCIDO',
        'El odómetro se actualiza automáticamente si registras una lectura mayor',
      ],
    },
    {
      section: 'Builds y nube',
      items: [
        'Múltiples builds por cuenta — uno por coche o proyecto',
        'Marca un build como favorito para que se abra por defecto',
        'Importa archivos .json desde la app de escritorio GarageApp',
        'Todos los datos sincronizados en tiempo real en la nube',
        'Funciona en móvil y navegador de escritorio',
      ],
    },
    {
      section: 'Otros',
      items: [
        'Tema claro y oscuro',
        'Interfaz en inglés y español',
        'Atajo de teclado: Ctrl+S para guardar',
      ],
    },
  ],
}

export default function HelpModal({ onClose }) {
  const { lang } = useLang()
  const features = FEATURES[lang] || FEATURES.en

  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>🔧 Garage — {lang === 'es' ? 'Funciones disponibles' : 'Available features'}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 4 }}>
          {features.map(({ section, items }) => (
            <div key={section}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {section}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="modal-footer" style={{ marginTop: 20 }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  )
}
