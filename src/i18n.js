import { createContext, useContext, useState } from 'react'

const en = {
  // Auth
  'auth.title': '🔧 Garage',
  'auth.subtitle': 'Build Planner & Maintenance Log',
  'auth.google': 'Continue with Google',
  'auth.login': 'Log in',
  'auth.signup': 'Sign up',
  'auth.createAccount': 'Create account',
  'auth.or': 'or',
  'auth.name': 'Name',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.namePlaceholder': 'Your name',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.passwordPlaceholder': '••••••••',
  'auth.noAccount': 'No account?',
  'auth.haveAccount': 'Already have an account?',
  'auth.err.noUser': 'No account with that email.',
  'auth.err.wrongPassword': 'Incorrect password.',
  'auth.err.emailInUse': 'Email already registered.',
  'auth.err.weakPassword': 'Password must be at least 6 characters.',
  'auth.err.invalidEmail': 'Invalid email address.',
  'auth.err.cancelled': 'Sign-in cancelled.',
  'auth.err.invalidCredential': 'Invalid email or password.',
  'auth.err.default': 'Something went wrong. Try again.',
  'auth.err.resetNoEmail': 'Enter your email address first.',
  'auth.rememberMe': 'Remember me',
  'auth.forgotPassword': 'Forgot password?',
  'auth.resetSent': 'Check your inbox for a reset link.',

  // Layout / Sidebar
  'layout.signOut': 'Sign out',
  'layout.loading': 'Loading…',
  'layout.newBuild': '+ New Build',
  'layout.importJson': '↑ Import .json',
  'layout.buildNamePlaceholder': 'Build name…',
  'layout.add': 'Add',
  'layout.save': 'Save',
  'layout.toggleTheme': 'Toggle theme',
  'layout.noBuildSelected': 'No build selected',
  'layout.noBuildHint': 'Pick a build from the sidebar or create a new one.',
  'layout.rename': 'Rename',
  'layout.markFav': 'Mark favourite',
  'layout.unmarkFav': 'Unmark favourite',
  'layout.deleteBuild': 'Delete build',
  'layout.confirmDelete': 'Delete this build? This cannot be undone.',
  'layout.renameBuild': 'New build name:',
  'layout.importErrParse': 'Could not parse file — make sure it is a valid Garage .json file.',
  'layout.importErrSave': 'Failed to save the imported build. Try again.',

  // Tabs
  'tabs.planner': 'Planner',
  'tabs.budget': 'Budget',
  'tabs.maintenance': 'Maintenance',
  'tabs.links': 'Links',

  // Build Planner
  'planner.addPart': '+ Part',
  'planner.addFolder': '+ Folder',
  'planner.searchPlaceholder': 'Search…',
  'planner.noResults': 'No results',
  'planner.noResultsHint': 'Try a different search.',
  'planner.noParts': 'No parts yet',
  'planner.noPartsHint': 'Add your first part to get started.',
  'planner.addFirstPart': '+ Add Part',
  'planner.statusBar': 'Total: {{amount}} · {{installed}}/{{total}} installed',
  'planner.emptyFolder': 'Empty —',
  'planner.addPartToFolder': 'add a part',
  'planner.openLink': 'Open link',
  'planner.dragToReorder': 'Drag to reorder',

  // Part context menu
  'part.edit': 'Edit',
  'part.moveUp': 'Move up',
  'part.moveDown': 'Move down',
  'part.moveToFolder': 'Move to folder',
  'part.wrapInFolder': 'Wrap in folder',
  'part.delete': 'Delete',

  // Folder context menu
  'folder.addPart': '+ Add Part',
  'folder.rename': 'Rename',
  'folder.sortName': 'Sort by name',
  'folder.sortStatus': 'Sort by status',
  'folder.sortPrice': 'Sort by price',
  'folder.delete': 'Delete folder',

  // Part dialog
  'partDialog.editTitle': 'Edit Part',
  'partDialog.addTitle': 'Add Part',
  'partDialog.name': 'Part Name *',
  'partDialog.namePlaceholder': 'e.g. Coilovers',
  'partDialog.info': 'Info / Variant',
  'partDialog.infoPlaceholder': 'e.g. BC Racing BR Series',
  'partDialog.link': 'Link',
  'partDialog.linkPlaceholder': 'https://…',
  'partDialog.open': 'Open',
  'partDialog.price': 'Price (€)',
  'partDialog.qty': 'Qty',
  'partDialog.status': 'Status',
  'partDialog.notes': 'Notes',
  'partDialog.notesPlaceholder': 'Any notes…',
  'partDialog.alternatives': 'Alternatives',
  'partDialog.cancel': 'Cancel',
  'partDialog.addSubmit': 'Add Part',
  'partDialog.saveSubmit': 'Save',
  'partDialog.required': 'Required',

  // Alternatives dialog
  'alt.title': 'Alternatives',
  'alt.hint': '★ = currently selected',
  'alt.empty': 'No alternatives added yet.',
  'alt.add': '+ Add',
  'alt.cancel': 'Cancel',
  'alt.apply': 'Apply',
  'alt.productName': 'Product name:',
  'alt.productLink': 'Product link (optional):',

  // Folder prompts
  'folder.newName': 'Folder name (e.g. Exhaust Setup):',
  'folder.renameName': 'Rename folder:',
  'folder.confirmDelete': 'Delete folder "{{name}}" and its {{n}} item(s)? Items go to trash.',
  'folder.noFolders': 'No folders exist. Create one first.',
  'folder.movePrompt': 'Move to folder:\n{{list}}\n(Enter number or folder name, or leave blank for root)',
  'folder.notFound': 'Folder not found.',

  // Part prompts
  'part.confirmDelete': 'Move "{{name}}" to trash?',

  // Trash
  'trash.title': 'Trash ({{count}})',
  'trash.empty': 'Trash is empty.',
  'trash.restore': 'Restore',
  'trash.deleteAll': 'Delete All',
  'trash.confirmDeleteAll': 'Delete all {{n}} items permanently?',
  'trash.confirmDeleteOne': 'Delete permanently?',
  'trash.close': 'Close',

  // Budget
  'budget.noParts': 'No parts yet',
  'budget.noPartsHint': 'Add parts in the Planner tab to see the budget breakdown.',
  'budget.colPart': 'Part / Category',
  'budget.colCost': 'Cost',
  'budget.total': 'Total',
  'budget.installed': '{{n}} installed',

  // Status labels
  'status.planned': 'Planned',
  'status.ordered': 'Ordered',
  'status.installed': 'Installed',
  'status.sold': 'Sold',

  // Maintenance
  'maint.addItem': '+ Add Item',
  'maint.logService': 'Log Service',
  'maint.odometer': 'Odometer',
  'maint.noItems': 'No maintenance items',
  'maint.noItemsHint': 'Add components to track service intervals (oil, filters, brakes, etc.)',
  'maint.colComponent': 'Component',
  'maint.colInterval': 'Interval',
  'maint.colLastService': 'Last Service',
  'maint.colNextDue': 'Next Due',
  'maint.colStatus': 'Status',
  'maint.statusNone': '—',
  'maint.statusNoInterval': 'No interval',
  'maint.statusOverdue': 'OVERDUE',
  'maint.statusSoon': 'Due soon',
  'maint.statusOk': 'OK',
  'maint.logServiceTitle': 'Log service',
  'maint.editTitle': 'Edit',
  'maint.deleteTitle': 'Delete',
  'maint.editEntryTitle': 'Edit entry',
  'maint.deleteEntryTitle': 'Delete entry',
  'maint.confirmDeleteItem': 'Delete this component and all its service history?',
  'maint.confirmDeleteEntry': 'Delete this service entry?',

  // Maintenance — parts needed
  'maint.parts.title': 'Parts Needed',
  'maint.parts.add': '+ Part',
  'maint.parts.empty': 'No parts added yet. Track what you need to buy or use for maintenance here.',
  'maint.parts.toBuy': '{{amount}} to buy · {{n}} pending',
  'maint.parts.allDone': 'Nothing pending',
  'maint.parts.addTitle': 'Add Part',
  'maint.parts.editTitle': 'Edit Part',
  'maint.parts.forComponent': 'For Component',
  'maint.parts.noComponent': 'None',
  'maint.parts.for': 'for {{name}}',
  'maint.parts.noneForItem': 'No parts linked to this component yet.',
  'maint.parts.confirmDelete': 'Delete this part?',

  // Item dialog
  'maintItem.editTitle': 'Edit Item',
  'maintItem.addTitle': 'Add Maintenance Item',
  'maintItem.name': 'Component Name',
  'maintItem.namePlaceholder': 'e.g. Engine Oil',
  'maintItem.trackBy': 'Track By',
  'maintItem.byDistance': 'Distance',
  'maintItem.byTime': 'Time',
  'maintItem.byFixedDate': 'Specific Date',
  'maintItem.dueDate': 'Due Date',
  'maintItem.interval': 'Service Interval',
  'maintItem.intervalPlaceholder': 'e.g. 5000',
  'maintItem.intervalPlaceholderDate': 'e.g. 12',
  'maintItem.unit.days': 'days',
  'maintItem.unit.months': 'months',
  'maintItem.unit.years': 'years',
  'maintItem.cancel': 'Cancel',
  'maintItem.add': 'Add',
  'maintItem.save': 'Save',

  // Log service dialog
  'logService.title': 'Log Service',
  'logService.component': 'Component',
  'logService.selectComponent': 'Select component…',
  'logService.date': 'Date',
  'logService.odometer': 'Odometer ({{unit}})',
  'logService.odoPlaceholder': 'e.g. 125000',
  'logService.notes': 'Notes',
  'logService.notesPlaceholder': 'e.g. Used Castrol 5W40',
  'logService.cancel': 'Cancel',
  'logService.submit': 'Log Service',

  // Edit entry dialog
  'editEntry.title': 'Edit Service Entry',
  'editEntry.date': 'Date',
  'editEntry.odometer': 'Odometer ({{unit}})',
  'editEntry.notes': 'Notes',
  'editEntry.cancel': 'Cancel',
  'editEntry.save': 'Save',

  // Links
  'links.add': '+ Link',
  'links.empty': 'No links yet',
  'links.emptyHint': 'Save websites, forums, or product pages you want to keep track of.',
  'links.openTitle': 'Open link',
  'links.editTitle': 'Edit',
  'links.deleteTitle': 'Delete',
  'links.confirmDelete': 'Delete this link?',
  'links.addTitleModal': 'Add Link',
  'links.editTitleModal': 'Edit Link',
  'links.name': 'Name *',
  'links.namePlaceholder': 'e.g. Official forum',
  'links.url': 'URL *',
  'links.urlPlaceholder': 'https://…',
  'links.notes': 'Notes',
  'links.notesPlaceholder': 'Any notes…',
  'links.required': 'Name and URL are required',
  'links.cancel': 'Cancel',
  'links.addSubmit': 'Add Link',
  'links.save': 'Save',
}

const es = {
  // Auth
  'auth.title': '🔧 Garage',
  'auth.subtitle': 'Planificador de builds y registro de mantenimiento',
  'auth.google': 'Continuar con Google',
  'auth.login': 'Iniciar sesión',
  'auth.signup': 'Registrarse',
  'auth.createAccount': 'Crear cuenta',
  'auth.or': 'o',
  'auth.name': 'Nombre',
  'auth.email': 'Correo electrónico',
  'auth.password': 'Contraseña',
  'auth.namePlaceholder': 'Tu nombre',
  'auth.emailPlaceholder': 'tu@correo.com',
  'auth.passwordPlaceholder': '••••••••',
  'auth.noAccount': '¿No tienes cuenta?',
  'auth.haveAccount': '¿Ya tienes cuenta?',
  'auth.err.noUser': 'No existe una cuenta con ese correo.',
  'auth.err.wrongPassword': 'Contraseña incorrecta.',
  'auth.err.emailInUse': 'El correo ya está registrado.',
  'auth.err.weakPassword': 'La contraseña debe tener al menos 6 caracteres.',
  'auth.err.invalidEmail': 'Correo electrónico no válido.',
  'auth.err.cancelled': 'Inicio de sesión cancelado.',
  'auth.err.invalidCredential': 'Correo o contraseña incorrectos.',
  'auth.err.default': 'Algo salió mal. Inténtalo de nuevo.',
  'auth.err.resetNoEmail': 'Ingresa tu correo primero.',
  'auth.rememberMe': 'Recordarme',
  'auth.forgotPassword': '¿Olvidaste tu contraseña?',
  'auth.resetSent': 'Revisa tu bandeja de entrada.',

  // Layout / Sidebar
  'layout.signOut': 'Cerrar sesión',
  'layout.loading': 'Cargando…',
  'layout.newBuild': '+ Nuevo build',
  'layout.importJson': '↑ Importar .json',
  'layout.buildNamePlaceholder': 'Nombre del build…',
  'layout.add': 'Añadir',
  'layout.save': 'Guardar',
  'layout.toggleTheme': 'Cambiar tema',
  'layout.noBuildSelected': 'Sin build seleccionado',
  'layout.noBuildHint': 'Selecciona un build en el menú lateral o crea uno nuevo.',
  'layout.rename': 'Renombrar',
  'layout.markFav': 'Marcar como favorito',
  'layout.unmarkFav': 'Quitar de favoritos',
  'layout.deleteBuild': 'Eliminar build',
  'layout.confirmDelete': '¿Eliminar este build? Esta acción no se puede deshacer.',
  'layout.renameBuild': 'Nuevo nombre del build:',
  'layout.importErrParse': 'No se pudo leer el archivo — asegúrate de que sea un archivo .json válido de Garage.',
  'layout.importErrSave': 'Error al guardar el build importado. Inténtalo de nuevo.',

  // Tabs
  'tabs.planner': 'Planificador',
  'tabs.budget': 'Presupuesto',
  'tabs.maintenance': 'Mantenimiento',
  'tabs.links': 'Enlaces',

  // Build Planner
  'planner.addPart': '+ Pieza',
  'planner.addFolder': '+ Carpeta',
  'planner.searchPlaceholder': 'Buscar…',
  'planner.noResults': 'Sin resultados',
  'planner.noResultsHint': 'Prueba con otra búsqueda.',
  'planner.noParts': 'Sin piezas',
  'planner.noPartsHint': 'Añade tu primera pieza para empezar.',
  'planner.addFirstPart': '+ Añadir pieza',
  'planner.statusBar': 'Total: {{amount}} · {{installed}}/{{total}} instaladas',
  'planner.emptyFolder': 'Vacía —',
  'planner.addPartToFolder': 'añadir pieza',
  'planner.openLink': 'Abrir enlace',
  'planner.dragToReorder': 'Arrastrar para reordenar',

  // Part context menu
  'part.edit': 'Editar',
  'part.moveUp': 'Subir',
  'part.moveDown': 'Bajar',
  'part.moveToFolder': 'Mover a carpeta',
  'part.wrapInFolder': 'Crear carpeta',
  'part.delete': 'Eliminar',

  // Folder context menu
  'folder.addPart': '+ Añadir pieza',
  'folder.rename': 'Renombrar',
  'folder.sortName': 'Ordenar por nombre',
  'folder.sortStatus': 'Ordenar por estado',
  'folder.sortPrice': 'Ordenar por precio',
  'folder.delete': 'Eliminar carpeta',

  // Part dialog
  'partDialog.editTitle': 'Editar pieza',
  'partDialog.addTitle': 'Añadir pieza',
  'partDialog.name': 'Nombre de la pieza *',
  'partDialog.namePlaceholder': 'p. ej. Coilovers',
  'partDialog.info': 'Info / Variante',
  'partDialog.infoPlaceholder': 'p. ej. BC Racing BR Series',
  'partDialog.link': 'Enlace',
  'partDialog.linkPlaceholder': 'https://…',
  'partDialog.open': 'Abrir',
  'partDialog.price': 'Precio (€)',
  'partDialog.qty': 'Cant.',
  'partDialog.status': 'Estado',
  'partDialog.notes': 'Notas',
  'partDialog.notesPlaceholder': 'Cualquier nota…',
  'partDialog.alternatives': 'Alternativas',
  'partDialog.cancel': 'Cancelar',
  'partDialog.addSubmit': 'Añadir pieza',
  'partDialog.saveSubmit': 'Guardar',
  'partDialog.required': 'Obligatorio',

  // Alternatives dialog
  'alt.title': 'Alternativas',
  'alt.hint': '★ = seleccionada actualmente',
  'alt.empty': 'Aún no hay alternativas.',
  'alt.add': '+ Añadir',
  'alt.cancel': 'Cancelar',
  'alt.apply': 'Aplicar',
  'alt.productName': 'Nombre del producto:',
  'alt.productLink': 'Enlace (opcional):',

  // Folder prompts
  'folder.newName': 'Nombre de la carpeta (p. ej. Escape):',
  'folder.renameName': 'Renombrar carpeta:',
  'folder.confirmDelete': '¿Eliminar la carpeta "{{name}}" con {{n}} elemento(s)? Los elementos irán a la papelera.',
  'folder.noFolders': 'No hay carpetas. Crea una primero.',
  'folder.movePrompt': 'Mover a carpeta:\n{{list}}\n(Introduce el número o el nombre, o deja en blanco para la raíz)',
  'folder.notFound': 'Carpeta no encontrada.',

  // Part prompts
  'part.confirmDelete': '¿Mover "{{name}}" a la papelera?',

  // Trash
  'trash.title': 'Papelera ({{count}})',
  'trash.empty': 'La papelera está vacía.',
  'trash.restore': 'Restaurar',
  'trash.deleteAll': 'Eliminar todo',
  'trash.confirmDeleteAll': '¿Eliminar {{n}} elementos permanentemente?',
  'trash.confirmDeleteOne': '¿Eliminar permanentemente?',
  'trash.close': 'Cerrar',

  // Budget
  'budget.noParts': 'Sin piezas',
  'budget.noPartsHint': 'Añade piezas en el Planificador para ver el resumen del presupuesto.',
  'budget.colPart': 'Pieza / Categoría',
  'budget.colCost': 'Coste',
  'budget.total': 'Total',
  'budget.installed': '{{n}} instaladas',

  // Status labels
  'status.planned': 'Planificado',
  'status.ordered': 'Pedido',
  'status.installed': 'Instalado',
  'status.sold': 'Vendido',

  // Maintenance
  'maint.addItem': '+ Añadir elemento',
  'maint.logService': 'Registrar servicio',
  'maint.odometer': 'Odómetro',
  'maint.noItems': 'Sin elementos de mantenimiento',
  'maint.noItemsHint': 'Añade componentes para seguir los intervalos de servicio (aceite, filtros, frenos, etc.)',
  'maint.colComponent': 'Componente',
  'maint.colInterval': 'Intervalo',
  'maint.colLastService': 'Último servicio',
  'maint.colNextDue': 'Próximo',
  'maint.colStatus': 'Estado',
  'maint.statusNone': '—',
  'maint.statusNoInterval': 'Sin intervalo',
  'maint.statusOverdue': 'VENCIDO',
  'maint.statusSoon': 'Próximamente',
  'maint.statusOk': 'OK',
  'maint.logServiceTitle': 'Registrar servicio',
  'maint.editTitle': 'Editar',
  'maint.deleteTitle': 'Eliminar',
  'maint.editEntryTitle': 'Editar entrada',
  'maint.deleteEntryTitle': 'Eliminar entrada',
  'maint.confirmDeleteItem': '¿Eliminar este componente y todo su historial de servicio?',
  'maint.confirmDeleteEntry': '¿Eliminar esta entrada de servicio?',

  // Mantenimiento — piezas necesarias
  'maint.parts.title': 'Piezas necesarias',
  'maint.parts.add': '+ Pieza',
  'maint.parts.empty': 'Aún no hay piezas. Añade aquí lo que necesitas comprar o usar para el mantenimiento.',
  'maint.parts.toBuy': '{{amount}} por comprar · {{n}} pendientes',
  'maint.parts.allDone': 'Nada pendiente',
  'maint.parts.addTitle': 'Añadir pieza',
  'maint.parts.editTitle': 'Editar pieza',
  'maint.parts.forComponent': 'Para el componente',
  'maint.parts.noComponent': 'Ninguno',
  'maint.parts.for': 'para {{name}}',
  'maint.parts.noneForItem': 'Aún no hay piezas vinculadas a este componente.',
  'maint.parts.confirmDelete': '¿Eliminar esta pieza?',

  // Item dialog
  'maintItem.editTitle': 'Editar elemento',
  'maintItem.addTitle': 'Añadir elemento de mantenimiento',
  'maintItem.name': 'Nombre del componente',
  'maintItem.namePlaceholder': 'p. ej. Aceite de motor',
  'maintItem.trackBy': 'Seguimiento por',
  'maintItem.byDistance': 'Distancia',
  'maintItem.byTime': 'Tiempo',
  'maintItem.byFixedDate': 'Fecha específica',
  'maintItem.dueDate': 'Fecha de vencimiento',
  'maintItem.interval': 'Intervalo de servicio',
  'maintItem.intervalPlaceholder': 'p. ej. 5000',
  'maintItem.intervalPlaceholderDate': 'p. ej. 12',
  'maintItem.unit.days': 'días',
  'maintItem.unit.months': 'meses',
  'maintItem.unit.years': 'años',
  'maintItem.cancel': 'Cancelar',
  'maintItem.add': 'Añadir',
  'maintItem.save': 'Guardar',

  // Log service dialog
  'logService.title': 'Registrar servicio',
  'logService.component': 'Componente',
  'logService.selectComponent': 'Selecciona un componente…',
  'logService.date': 'Fecha',
  'logService.odometer': 'Odómetro ({{unit}})',
  'logService.odoPlaceholder': 'p. ej. 125000',
  'logService.notes': 'Notas',
  'logService.notesPlaceholder': 'p. ej. Castrol 5W40',
  'logService.cancel': 'Cancelar',
  'logService.submit': 'Registrar servicio',

  // Edit entry dialog
  'editEntry.title': 'Editar entrada de servicio',
  'editEntry.date': 'Fecha',
  'editEntry.odometer': 'Odómetro ({{unit}})',
  'editEntry.notes': 'Notas',
  'editEntry.cancel': 'Cancelar',
  'editEntry.save': 'Guardar',

  // Links
  'links.add': '+ Enlace',
  'links.empty': 'Sin enlaces',
  'links.emptyHint': 'Guarda webs, foros o páginas de productos que quieras tener a mano.',
  'links.openTitle': 'Abrir enlace',
  'links.editTitle': 'Editar',
  'links.deleteTitle': 'Eliminar',
  'links.confirmDelete': '¿Eliminar este enlace?',
  'links.addTitleModal': 'Añadir enlace',
  'links.editTitleModal': 'Editar enlace',
  'links.name': 'Nombre *',
  'links.namePlaceholder': 'p. ej. Foro oficial',
  'links.url': 'URL *',
  'links.urlPlaceholder': 'https://…',
  'links.notes': 'Notas',
  'links.notesPlaceholder': 'Cualquier nota…',
  'links.required': 'Nombre y URL son obligatorios',
  'links.cancel': 'Cancelar',
  'links.addSubmit': 'Añadir enlace',
  'links.save': 'Guardar',
}

export const LANGS = { en: 'English', es: 'Español' }

const dicts = { en, es }

function interpolate(str, vars) {
  if (!vars) return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{{${k}}}`))
}

export const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangRaw] = useState(() => localStorage.getItem('lang') || 'en')

  function setLang(l) {
    localStorage.setItem('lang', l)
    setLangRaw(l)
  }

  function t(key, vars) {
    const str = dicts[lang]?.[key] ?? dicts['en']?.[key] ?? key
    return interpolate(str, vars)
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
