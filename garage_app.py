import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, filedialog
import json, os, csv, webbrowser, copy

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

STATUS_OPTIONS = ["planned", "ordered", "installed", "sold"]
STATUS_INFO = {
    "planned":   {"symbol": "",    "color": "#888888", "dark_color": "#aaaaaa", "label": "Planned"},
    "ordered":   {"symbol": "→ ",  "color": "#1a73e8", "dark_color": "#4da3ff", "label": "Ordered"},
    "installed": {"symbol": "✓ ",  "color": "#2e7d32", "dark_color": "#4caf50", "label": "Installed"},
    "sold":      {"symbol": "✗ ",  "color": "#9e9e9e", "dark_color": "#6e6e6e", "label": "Sold"},
}

THEMES = {
    "light": {
        "bg": "#f0f0f0", "fg": "#000000",
        "tree_bg": "#ffffff", "tree_fg": "#000000",
        "tree_sel_bg": "#0078d7", "tree_sel_fg": "#ffffff",
        "folder_fg": "#1a1a1a",
        "entry_bg": "#ffffff", "entry_fg": "#000000",
        "btn_bg": "#e1e1e1", "btn_fg": "#000000",
        "text_bg": "#ffffff", "text_fg": "#000000",
        "listbox_bg": "#ffffff", "listbox_fg": "#000000",
        "sep": "#cccccc", "total_fg": "#000000",
        "status_color_key": "color",
        "drop_into": "#cce5ff",
    },
    "dark": {
        "bg": "#1e1e1e", "fg": "#d4d4d4",
        "tree_bg": "#252526", "tree_fg": "#d4d4d4",
        "tree_sel_bg": "#264f78", "tree_sel_fg": "#ffffff",
        "folder_fg": "#e8c070",
        "entry_bg": "#3c3c3c", "entry_fg": "#d4d4d4",
        "btn_bg": "#3c3c3c", "btn_fg": "#d4d4d4",
        "text_bg": "#2d2d2d", "text_fg": "#d4d4d4",
        "listbox_bg": "#2d2d2d", "listbox_fg": "#d4d4d4",
        "sep": "#404040", "total_fg": "#ffffff",
        "status_color_key": "dark_color",
        "drop_into": "#264f78",
    },
}

DEFAULT_CONTENT = [
    {
        "type": "folder", "name": "Exhaust Setup",
        "children": [
            {"type": "part", "part": "Resonator", "info": "Vibrant 1792", "price": 0, "qty": 1,
             "status": "planned", "notes": "",
             "selected": {"name": "Vibrant 1792", "link": ""}, "options": []},
            {"type": "part", "part": "Rear Muffler", "info": "Magnaflow 12259", "price": 0, "qty": 1,
             "status": "planned", "notes": "",
             "selected": {"name": "Magnaflow 12259", "link": ""}, "options": []},
        ]
    },
    {
        "type": "folder", "name": "Suspension",
        "children": [
            {"type": "part", "part": "Coilovers", "info": "BC Racing BR Series", "price": 0, "qty": 1,
             "status": "planned", "notes": "",
             "selected": {"name": "BC Racing BR Series", "link": ""}, "options": []},
        ]
    },
    {"type": "part", "part": "Wheels", "info": "Rota Grid 17\"", "price": 0, "qty": 1,
     "status": "planned", "notes": "",
     "selected": {"name": "Rota Grid 17\"", "link": ""}, "options": []},
]


class GarageApp:
    def __init__(self, root):
        self.root = root
        self.root.geometry("1050x700")
        self.root.minsize(800, 520)

        self._theme = "light"
        self.data = []
        self.trash = []
        self.current_profile = "Default"
        self.favourite = None
        self._id_map = {}
        self._dirty = False

        self._drag_node = None
        self._drag_item = None
        self._drag_indicator = None
        self._folder_open = {}

        self.setup_ui()
        self.load()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    # ── CLOSE GUARD ──────────────────────────────────────────────────────────
    def _on_close(self):
        if self._dirty:
            ans = messagebox.askyesnocancel(
                "Unsaved Changes", "You have unsaved changes.\nSave before closing?", icon="warning")
            if ans is None:
                return
            if ans:
                self._save_file()
        self.root.destroy()

    def _mark_dirty(self):
        self._dirty = True
        self._update_title()

    # ── THEME ─────────────────────────────────────────────────────────────────
    def _apply_theme(self):
        t = THEMES[self._theme]
        style = ttk.Style()

        style.configure("TFrame",           background=t["bg"])
        style.configure("TLabel",           background=t["bg"],       foreground=t["fg"])
        style.configure("TButton",          background=t["btn_bg"],   foreground=t["btn_fg"])
        style.map("TButton",                background=[("active", t["btn_bg"]), ("pressed", t["btn_bg"])])
        style.configure("TEntry",           fieldbackground=t["entry_bg"], foreground=t["entry_fg"],
                                             insertcolor=t["entry_fg"])
        style.configure("TCombobox",        fieldbackground=t["entry_bg"], foreground=t["entry_fg"],
                                             background=t["btn_bg"], selectbackground=t["tree_sel_bg"])
        style.map("TCombobox",              fieldbackground=[("readonly", t["entry_bg"])],
                                             foreground=[("readonly", t["entry_fg"])],
                                             selectbackground=[("readonly", t["tree_sel_bg"])])
        style.configure("TSpinbox",         fieldbackground=t["entry_bg"], foreground=t["entry_fg"],
                                             background=t["btn_bg"])
        style.configure("TNotebook",        background=t["bg"])
        style.configure("TNotebook.Tab",    background=t["btn_bg"], foreground=t["fg"], padding=[8, 4])
        style.map("TNotebook.Tab",          background=[("selected", t["bg"])])
        style.configure("TSeparator",       background=t["sep"])
        style.configure("Vertical.TScrollbar", background=t["btn_bg"], troughcolor=t["bg"],
                                             arrowcolor=t["fg"])

        for ts in ("Build.Treeview", "Budget.Treeview"):
            rh = 28 if ts == "Build.Treeview" else 26
            style.configure(ts, background=t["tree_bg"], foreground=t["tree_fg"],
                             fieldbackground=t["tree_bg"], font=("Arial", 12), rowheight=rh)
            style.map(ts, background=[("selected", t["tree_sel_bg"])],
                      foreground=[("selected", t["tree_sel_fg"])])
        style.configure("Budget.Treeview.Heading", background=t["btn_bg"],
                         foreground=t["fg"], font=("Arial", 11, "bold"))

        self.root.configure(bg=t["bg"])
        self._reconfigure_tree_tags()
        self._update_star_btn()
        self.price_label.configure(bg=t["bg"], fg=t["fg"])

    def _reconfigure_tree_tags(self):
        t = THEMES[self._theme]
        ck = t["status_color_key"]
        for s in STATUS_OPTIONS:
            color = STATUS_INFO[s][ck]
            self.tree.tag_configure(f"s_{s}", foreground=color)
            self.budget_tree.tag_configure(f"bs_{s}", foreground=color)
        self.tree.tag_configure("folder",     foreground=t["folder_fg"], font=("Arial", 12, "bold"))
        self.tree.tag_configure("drop_into",  background=t["drop_into"])
        line_color = "#888888" if self._theme == "light" else "#666666"
        self._drop_line.configure(bg=line_color)
        self._drop_dot.configure(bg=line_color)
        self.budget_tree.tag_configure("folder_row", font=("Arial", 12, "bold"), foreground=t["folder_fg"])
        self.budget_tree.tag_configure("total_row",  font=("Arial", 12, "bold"), foreground=t["total_fg"])
        self.budget_tree.tag_configure("sep_row",    foreground=t["sep"])

    def _toggle_theme(self):
        self._theme = "dark" if self._theme == "light" else "light"
        self._apply_theme()
        self.theme_btn.config(text="☀" if self._theme == "dark" else "🌙")

    def _theme_dialog(self, dialog):
        t = THEMES[self._theme]
        dialog.configure(bg=t["bg"])
        return t

    # ── UI SETUP ─────────────────────────────────────────────────────────────
    def setup_ui(self):
        style = ttk.Style()
        style.theme_use("clam")

        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True)

        self.builder_tab = ttk.Frame(self.notebook)
        self.budget_tab  = ttk.Frame(self.notebook)
        self.help_tab    = ttk.Frame(self.notebook)

        self.notebook.add(self.builder_tab, text="Build Planner")
        self.notebook.add(self.budget_tab,  text="Budget")
        self.notebook.add(self.help_tab,    text="What can I do?")

        self.build_builder_ui()
        self.build_budget_ui()
        self.build_help_ui()

        self.notebook.bind("<<NotebookTabChanged>>", self._on_tab_change)
        self._apply_theme()

    def _on_tab_change(self, _event=None):
        if self.notebook.index(self.notebook.select()) == 1:
            self._refresh_budget()

    # ── BUILD PLANNER TAB ────────────────────────────────────────────────────
    def build_builder_ui(self):
        top = ttk.Frame(self.builder_tab)
        top.pack(fill="x", pady=4, padx=4)

        ttk.Button(top, text="Add Part",   command=self.add_part).pack(side="left", padx=2)
        ttk.Button(top, text="New Build",  command=self.add_profile).pack(side="left", padx=2)
        ttk.Button(top, text="Open Build", command=self.load_build).pack(side="left", padx=2)
        ttk.Button(top, text="Save",       command=self.save).pack(side="left", padx=2)

        # Build menu button (Rename / Duplicate / Export)
        self.build_menu_btn = ttk.Button(top, text="Build ▾", command=self._show_build_menu)
        self.build_menu_btn.pack(side="left", padx=2)

        self.trash_btn = ttk.Button(top, text="Trash", command=self.show_trash)
        self.trash_btn.pack(side="left", padx=2)

        self.star_btn = tk.Button(
            top, text="☆", font=("Arial", 14), relief="flat",
            cursor="hand2", bd=0, padx=4, command=self._toggle_favourite)
        self.star_btn.pack(side="left", padx=(4, 0))

        # Right-side buttons
        self.theme_btn = tk.Button(
            top, text="🌙", font=("Arial", 13), relief="flat",
            cursor="hand2", bd=0, padx=4, command=self._toggle_theme)
        self.theme_btn.pack(side="right", padx=2)
        ttk.Button(top, text="▼ All", width=6, command=self._expand_all).pack(side="right", padx=2)
        ttk.Button(top, text="▶ All", width=6, command=self._collapse_all).pack(side="right", padx=2)

        # Search bar
        sf = ttk.Frame(self.builder_tab)
        sf.pack(fill="x", padx=10, pady=(2, 0))
        ttk.Label(sf, text="🔍", font=("Arial", 11)).pack(side="left")
        self.search_var = tk.StringVar()
        self.search_var.trace_add("write", lambda *_: self._on_search())
        ttk.Entry(sf, textvariable=self.search_var, font=("Arial", 11)).pack(
            side="left", fill="x", expand=True, padx=4)
        ttk.Button(sf, text="✕", width=3,
                   command=lambda: self.search_var.set("")).pack(side="left")

        # Price / progress bar anchors to bottom
        self.price_var = tk.StringVar(value="Total: €0.00")
        self.price_label = tk.Label(self.builder_tab, textvariable=self.price_var,
                                     font=("Arial", 11), anchor="e", padx=10, pady=5)
        self.price_label.pack(fill="x", side="bottom")
        ttk.Separator(self.builder_tab, orient="horizontal").pack(fill="x", side="bottom")

        self.tree = ttk.Treeview(self.builder_tab, show="tree",
                                  selectmode="browse", style="Build.Treeview")
        for s in STATUS_OPTIONS:
            self.tree.tag_configure(f"s_{s}", foreground=STATUS_INFO[s]["color"])
        self.tree.tag_configure("folder",     foreground="#1a1a1a", font=("Arial", 12, "bold"))
        self.tree.tag_configure("drop_into", background="#4a90d9")
        self.tree.pack(fill="both", expand=True, padx=10, pady=(6, 0))

        # Drop-position line indicator (shown on top of the tree via place)
        self._drop_line = tk.Frame(self.builder_tab, height=2, bg="#888888",
                                    bd=0, highlightthickness=0)
        self._drop_dot  = tk.Frame(self.builder_tab, width=8, height=8, bg="#888888",
                                    bd=0, highlightthickness=0)

        self.tree.bind("<Double-1>",         self.on_tree_double_click)
        self.tree.bind("<Button-3>",         self.on_right_click)
        self.tree.bind("<ButtonPress-1>",    self.on_drag_start)
        self.tree.bind("<B1-Motion>",        self.on_drag_motion)
        self.tree.bind("<ButtonRelease-1>",  self.on_drag_release)
        self.tree.bind("<<TreeviewSelect>>", self._update_price_bar)
        self.tree.bind("<Delete>",           lambda e: self._on_tree_delete())
        self.tree.bind("<Control-d>",        lambda e: self._on_tree_duplicate())
        self.tree.bind("<F2>",               lambda e: self._on_tree_edit())
        self.tree.bind("<Control-Up>",       lambda e: self._move_item(-1) or "break")
        self.tree.bind("<Control-Down>",     lambda e: self._move_item(1) or "break")
        self.root.bind("<Control-s>",        lambda e: self.save())

    def _show_build_menu(self):
        menu = tk.Menu(self.root, tearoff=0)
        menu.add_command(label="Rename Build...",    command=self._rename_build)
        menu.add_command(label="Duplicate Build...", command=self._duplicate_build)
        menu.add_separator()
        menu.add_command(label="Export to CSV...",   command=self.export_csv)
        btn = self.build_menu_btn
        menu.tk_popup(btn.winfo_rootx(), btn.winfo_rooty() + btn.winfo_height())

    def _expand_all(self):
        for node in self.tree.get_children():
            self.tree.item(node, open=True)

    def _collapse_all(self):
        for node in self.tree.get_children():
            self.tree.item(node, open=False)

    def _on_tree_delete(self):
        node = self.tree.focus()
        if node:
            self._delete_item(node)

    def _on_tree_duplicate(self):
        node = self.tree.focus()
        if node:
            self._duplicate_item(node)

    def _on_tree_edit(self):
        node = self.tree.focus()
        if node:
            self._edit_item(node)

    def _move_item(self, direction):
        node = self.tree.focus()
        if not node:
            return
        item = self._id_map.get(node)
        if not item:
            return
        lst = self._get_parent_list(item)
        if lst is None:
            return
        idx = lst.index(item)
        new_idx = idx + direction
        if new_idx < 0 or new_idx >= len(lst):
            return
        lst.insert(new_idx, lst.pop(idx))
        self._mark_dirty()
        self.refresh()
        # Re-select the moved item
        for tree_node, mapped_item in self._id_map.items():
            if mapped_item is item:
                self.tree.focus(tree_node)
                self.tree.selection_set(tree_node)
                self.tree.see(tree_node)
                break

    def _on_search(self):
        query = self.search_var.get().strip().lower()
        self._id_map = {}
        for node in self.tree.get_children():
            self.tree.delete(node)
        for item in self.data:
            if query:
                self._insert_filtered("", item, query)
            else:
                self._insert_tree_item("", item)
        self._update_price_bar()

    def _matches(self, item, q):
        if item.get("type") == "folder":
            return q in item.get("name", "").lower()
        return (q in item.get("part", "").lower() or
                q in item.get("info", "").lower() or
                q in item.get("notes", "").lower())

    def _insert_filtered(self, parent, item, q):
        if item.get("type") == "folder":
            hits = [c for c in item.get("children", []) if self._matches(c, q)]
            if hits or self._matches(item, q):
                node = self.tree.insert(parent, "end",
                                        text=f"\U0001f4c1  {item['name']}", open=True)
                self._id_map[node] = item
                for child in (hits if hits else item.get("children", [])):
                    self._insert_filtered(node, child, q)
        else:
            if self._matches(item, q):
                self._insert_tree_item(parent, item)

    # ── BUDGET TAB ───────────────────────────────────────────────────────────
    def build_budget_ui(self):
        self.budget_tree = ttk.Treeview(
            self.budget_tab, columns=("cost",),
            show="tree headings", style="Budget.Treeview")
        self.budget_tree.heading("#0",   text="Part / Category", anchor="w")
        self.budget_tree.heading("cost", text="Cost",            anchor="e")
        self.budget_tree.column("#0",    stretch=True, minwidth=200)
        self.budget_tree.column("cost",  width=120, anchor="e", stretch=False)

        for s in STATUS_OPTIONS:
            self.budget_tree.tag_configure(f"bs_{s}", foreground=STATUS_INFO[s]["color"])
        self.budget_tree.tag_configure("folder_row", font=("Arial", 12, "bold"), foreground="#1a1a1a")
        self.budget_tree.tag_configure("total_row",  font=("Arial", 12, "bold"), foreground="#000000")
        self.budget_tree.tag_configure("sep_row",    foreground="#cccccc")

        sb = ttk.Scrollbar(self.budget_tab, command=self.budget_tree.yview)
        self.budget_tree.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y")
        self.budget_tree.pack(fill="both", expand=True, padx=10, pady=10)

    def _refresh_budget(self):
        for node in self.budget_tree.get_children():
            self.budget_tree.delete(node)

        totals = {"installed": 0.0, "ordered": 0.0, "planned": 0.0, "sold": 0.0}

        def fmt(price):
            return f"€{price:.2f}" if price else "—"

        def add_part_row(parent, item):
            status = item.get("status", "planned")
            sym    = STATUS_INFO.get(status, {}).get("symbol", "")
            qty    = int(item.get("qty", 1) or 1)
            price  = 0.0
            try:
                price = float(item.get("price", 0) or 0) * qty
            except (ValueError, TypeError):
                pass
            totals[status] = totals.get(status, 0.0) + price
            qty_str = f" ×{qty}" if qty > 1 else ""
            self.budget_tree.insert(
                parent, "end",
                text=f"  {sym}{item.get('part', '')}{qty_str}",
                values=(fmt(price),),
                tags=(f"bs_{status}",))

        def add_folder_row(item):
            folder_cost = self._sum_prices(item.get("children", []))
            children    = item.get("children", [])
            inst_count  = sum(1 for c in children if c.get("status") == "installed")
            detail      = f"  {inst_count}/{len(children)} installed" if children else ""
            node = self.budget_tree.insert(
                "", "end",
                text=f"\U0001f4c1  {item['name']}{detail}",
                values=(fmt(folder_cost),),
                open=True, tags=("folder_row",))
            for child in children:
                add_part_row(node, child)

        loose = []
        for item in self.data:
            if item.get("type") == "folder":
                add_folder_row(item)
            else:
                loose.append(item)

        if loose:
            loose_node = self.budget_tree.insert(
                "", "end", text="(No folder)",
                values=("",), open=True, tags=("folder_row",))
            for item in loose:
                add_part_row(loose_node, item)

        self.budget_tree.insert("", "end", text="", values=("",), tags=("sep_row",))
        for key in ("installed", "ordered", "planned", "sold"):
            if totals[key]:
                sym   = STATUS_INFO[key]["symbol"]
                label = STATUS_INFO[key]["label"]
                self.budget_tree.insert(
                    "", "end",
                    text=f"  {sym}{label}",
                    values=(fmt(totals[key]),),
                    tags=(f"bs_{key}",))

        grand = sum(totals.values())
        self.budget_tree.insert("", "end", text="", values=("",), tags=("sep_row",))
        self.budget_tree.insert("", "end", text="  Total",
                                 values=(fmt(grand),), tags=("total_row",))

    # ── HELP TAB ─────────────────────────────────────────────────────────────
    def build_help_ui(self):
        text = tk.Text(self.help_tab, wrap="word", font=("Arial", 11))
        text.pack(fill="both", expand=True)
        text.insert("end", """GARAGE BUILD PLANNER - HELP

WHAT YOU CAN DO:

✔ Add parts with name, info, link, price, quantity, notes and status
✔ Status: Planned / Ordered / Installed / Sold  (colour-coded)
✔ Group parts in folders (Exhaust, Suspension, etc.)
✔ Add alternatives per part and pick the selected one
✔ Double-click a part → opens its link in the browser
✔ Right-click → Edit / Open Link / Duplicate / Sort / Make Folder / Delete
✔ Deleted items go to Trash — restore or delete permanently
✔ Drag and drop to reorder or move into folders
✔ Search bar filters parts instantly (searches name, info, notes)
✔ Expand All / Collapse All for large builds
✔ Budget tab shows cost breakdown by folder (respects quantity)
✔ Star (★) marks a favourite build to open on startup
✔ Build ▾ menu: Rename Build, Duplicate Build, Export to CSV
✔ Dark mode toggle (🌙 button, top right)
✔ Each build is its own .json file

KEYBOARD SHORTCUTS:

  Ctrl+S      Save
  F2          Edit selected item
  Delete      Move selected item to trash
  Ctrl+D      Duplicate selected part
  Ctrl+Up     Move selected item up
  Ctrl+Down   Move selected item down

HOW TO USE:

1. Add parts and set price + status to track build progress
2. Use Qty field when you need multiples of one part
3. Budget tab shows installed vs ordered vs planned costs
4. Use Alternatives to compare different product options
5. Drag and drop to organise — drop onto a folder to move inside
""")
        text.config(state="disabled")

    # ── HELPERS ──────────────────────────────────────────────────────────────
    def center_on_main(self, dialog):
        dialog.update_idletasks()
        x = self.root.winfo_x() + (self.root.winfo_width()  - dialog.winfo_width())  // 2
        y = self.root.winfo_y() + (self.root.winfo_height() - dialog.winfo_height()) // 2
        dialog.geometry(f"+{x}+{y}")

    def _display_text(self, item):
        status = item.get("status", "planned")
        symbol = STATUS_INFO.get(status, {}).get("symbol", "")
        name   = item.get("part", "")
        info   = item.get("info", "") or item.get("selected", {}).get("name", "")
        price  = item.get("price", 0) or 0
        qty    = int(item.get("qty", 1) or 1)
        text   = symbol + name
        if qty > 1:
            text += f" ×{qty}"
        if info and info != name:
            text += f"  —  {info}"
        if price:
            try:
                text += f"  (€{float(price) * qty:.2f})"
            except (ValueError, TypeError):
                pass
        return text

    def _get_link(self, item):
        return item.get("link", "") or item.get("selected", {}).get("link", "")

    def _get_parent_list(self, item):
        if item in self.data:
            return self.data
        for entry in self.data:
            if entry.get("type") == "folder" and item in entry.get("children", []):
                return entry["children"]
        return None

    def _find_folder_by_name(self, name):
        for item in self.data:
            if item.get("type") == "folder" and item.get("name") == name:
                return item
        return None

    def _sum_prices(self, items):
        total = 0.0
        for item in items:
            if item.get("type") == "folder":
                total += self._sum_prices(item.get("children", []))
            else:
                try:
                    qty = int(item.get("qty", 1) or 1)
                    total += float(item.get("price", 0) or 0) * qty
                except (ValueError, TypeError):
                    pass
        return total

    def _count_parts(self, items=None):
        if items is None:
            items = self.data
        n = 0
        for item in items:
            if item.get("type") == "folder":
                n += self._count_parts(item.get("children", []))
            else:
                n += 1
        return n

    def _count_installed(self, items=None):
        if items is None:
            items = self.data
        n = 0
        for item in items:
            if item.get("type") == "folder":
                n += self._count_installed(item.get("children", []))
            elif item.get("status") == "installed":
                n += 1
        return n

    def _update_title(self):
        marker = " *" if self._dirty else ""
        self.root.title(f"Garage Build Planner — {self.current_profile}{marker}")

    def _update_price_bar(self, _event=None):
        total     = self._sum_prices(self.data)
        n_parts   = self._count_parts()
        n_inst    = self._count_installed()
        parts = [f"Total: €{total:.2f}", f"{n_inst}/{n_parts} installed"]
        node = self.tree.focus()
        item = self._id_map.get(node)
        if item:
            if item.get("type") == "folder":
                parts.append(f"Folder: €{self._sum_prices(item.get('children', [])):.2f}")
            else:
                try:
                    qty = int(item.get("qty", 1) or 1)
                    parts.append(f"Selected: €{float(item.get('price', 0) or 0) * qty:.2f}")
                except (ValueError, TypeError):
                    pass
        self.price_var.set("   |   ".join(parts))

    def _update_trash_btn(self):
        n = len(self.trash)
        self.trash_btn.config(text=f"Trash ({n})" if n else "Trash")

    def _update_star_btn(self):
        t = THEMES[self._theme]
        if self.favourite == self.current_profile:
            self.star_btn.config(text="★", fg="#f5a623", bg=t["bg"])
        else:
            self.star_btn.config(text="☆", fg="#aaaaaa", bg=t["bg"])
        self.theme_btn.config(bg=t["bg"], fg=t["fg"])

    def _toggle_favourite(self):
        self.favourite = None if self.favourite == self.current_profile else self.current_profile
        self._save_config()
        self._update_star_btn()

    def _parse_file(self, raw):
        if isinstance(raw, list):
            return raw, []
        if isinstance(raw, dict) and "items" in raw:
            return raw.get("items", []), raw.get("trash", [])
        return None, None

    # ── DATA / TREE ──────────────────────────────────────────────────────────
    def refresh(self):
        self._update_title()
        self._update_trash_btn()
        self._update_star_btn()
        # Save open/closed state of each folder by name before rebuilding
        self._folder_open = {}
        for node, item in self._id_map.items():
            if item.get("type") == "folder":
                try:
                    self._folder_open[item.get("name", "")] = self.tree.item(node, "open")
                except tk.TclError:
                    pass
        self._id_map = {}
        for node in self.tree.get_children():
            self.tree.delete(node)
        for item in self.data:
            self._insert_tree_item("", item)
        self._folder_open = {}
        self._update_price_bar()

    def _insert_tree_item(self, parent, item):
        if item.get("type") == "folder":
            name = item.get("name", "")
            is_open = self._folder_open.get(name, True)
            node = self.tree.insert(parent, "end",
                                    text=f"\U0001f4c1  {name}", open=is_open,
                                    tags=("folder",))
            self._id_map[node] = item
            for child in item.get("children", []):
                self._insert_tree_item(node, child)
        else:
            status = item.get("status", "planned")
            node = self.tree.insert(parent, "end",
                                    text=self._display_text(item),
                                    tags=(f"s_{status}",))
            self._id_map[node] = item

    def _restore_status_tag(self, node):
        item = self._id_map.get(node)
        if item and item.get("type") == "folder":
            self.tree.item(node, tags=("folder",))
        elif item:
            self.tree.item(node, tags=(f"s_{item.get('status', 'planned')}",))
        else:
            self.tree.item(node, tags=())

    def _clear_drop_indicator(self):
        if self._drag_indicator:
            try:
                self._restore_status_tag(self._drag_indicator)
            except tk.TclError:
                pass
            self._drag_indicator = None
        self._drop_line.place_forget()
        self._drop_dot.place_forget()

    # ── DRAG & DROP ──────────────────────────────────────────────────────────
    def on_drag_start(self, event):
        node = self.tree.identify_row(event.y)
        self._drag_node = node or None
        self._drag_item = self._id_map.get(node) if node else None

    def on_drag_motion(self, event):
        if not self._drag_node:
            return
        self._clear_drop_indicator()
        target = self.tree.identify_row(event.y)
        if not target or target == self._drag_node:
            self.tree.config(cursor="hand2" if not target else "")
            return
        drag_item   = self._drag_item
        target_item = self._id_map.get(target)
        if drag_item and drag_item.get("type") == "folder":
            if self.tree.parent(target) or (target_item and target_item.get("type") == "folder"):
                self.tree.config(cursor="X_cursor")
                return
        self.tree.config(cursor="hand2")
        if target_item and target_item.get("type") == "folder":
            # Drop into folder: highlight the folder row
            self.tree.item(target, tags=("drop_into",))
            self._drag_indicator = target
        else:
            # Drop above/below: show insertion line
            bbox = self.tree.bbox(target)
            if bbox:
                mid = bbox[1] + bbox[3] // 2
                line_y = bbox[1] if event.y <= mid else bbox[1] + bbox[3]
                tx = self.tree.winfo_x()
                ty = self.tree.winfo_y()
                tw = self.tree.winfo_width()
                indent = 14
                lx = tx + indent
                lw = tw - indent - 8
                self._drop_line.place(x=lx, y=ty + line_y - 1, width=lw, height=2)
                self._drop_dot.place(x=lx - 4, y=ty + line_y - 4, width=8, height=8)
                self._drop_line.lift()
                self._drop_dot.lift()

    def on_drag_release(self, event):
        self._clear_drop_indicator()
        self.tree.config(cursor="")
        drag_node, drag_item = self._drag_node, self._drag_item
        self._drag_node = self._drag_item = None
        if not drag_node or not drag_item:
            return
        target_node = self.tree.identify_row(event.y)
        if target_node == drag_node:
            return
        src_list = self._get_parent_list(drag_item)
        if src_list is None:
            return
        if not target_node:
            src_list.remove(drag_item)
            self.data.append(drag_item)
            self._mark_dirty(); self.refresh(); return
        target_item = self._id_map.get(target_node)
        if target_item is None:
            return
        if drag_item.get("type") == "folder":
            if self.tree.parent(target_node) or target_item.get("type") == "folder":
                return
        src_list.remove(drag_item)
        if target_item.get("type") == "folder":
            target_item.setdefault("children", []).append(drag_item)
            self._folder_open[target_item.get("name", "")] = True
        else:
            dst = self._get_parent_list(target_item)
            if dst is None:
                src_list.append(drag_item); return
            idx = dst.index(target_item)
            bbox = self.tree.bbox(target_node)
            if bbox and event.y > bbox[1] + bbox[3] // 2:
                idx += 1
            dst.insert(idx, drag_item)
        self._mark_dirty(); self.refresh()

    # ── TREE EVENTS ──────────────────────────────────────────────────────────
    def on_tree_double_click(self, event):
        node = self.tree.identify_row(event.y)
        if not node:
            return
        item = self._id_map.get(node)
        if item and item.get("type") != "folder":
            link = self._get_link(item)
            if link:
                webbrowser.open(link)

    def on_right_click(self, event):
        node = self.tree.identify_row(event.y)
        if node:
            self.tree.selection_set(node)
        item      = self._id_map.get(node) if node else None
        is_part   = item is not None and item.get("type") != "folder"
        is_folder = item is not None and item.get("type") == "folder"
        menu = tk.Menu(self.root, tearoff=0)
        if item is not None:
            menu.add_command(label="Edit", command=lambda: self._edit_item(node))
        if is_part:
            menu.add_command(label="Open Link",  command=lambda: self._open_link(node))
            menu.add_command(label="Duplicate",  command=lambda: self._duplicate_item(node))
            menu.add_separator()
        if is_folder:
            sort_menu = tk.Menu(menu, tearoff=0)
            sort_menu.add_command(label="By Name",   command=lambda: self._sort_folder(item, "name"))
            sort_menu.add_command(label="By Status", command=lambda: self._sort_folder(item, "status"))
            sort_menu.add_command(label="By Price",  command=lambda: self._sort_folder(item, "price"))
            menu.add_cascade(label="Sort Children", menu=sort_menu)
            menu.add_separator()
        menu.add_command(label="Make Folder",
                         command=lambda: self._make_folder(node if is_part else None))
        if item is not None:
            menu.add_separator()
            menu.add_command(label="Delete", command=lambda: self._delete_item(node))
        menu.tk_popup(event.x_root, event.y_root)

    def _open_link(self, node):
        item = self._id_map.get(node)
        if not item:
            return
        link = self._get_link(item)
        if link:
            webbrowser.open(link)
        else:
            messagebox.showinfo("No Link", "This part has no link attached.")

    # ── SORT ─────────────────────────────────────────────────────────────────
    def _sort_folder(self, folder_item, key):
        children = folder_item.get("children", [])
        if key == "name":
            children.sort(key=lambda x: x.get("part", "").lower())
        elif key == "status":
            order = {s: i for i, s in enumerate(STATUS_OPTIONS)}
            children.sort(key=lambda x: order.get(x.get("status", "planned"), 0))
        elif key == "price":
            children.sort(key=lambda x: float(x.get("price", 0) or 0) *
                          int(x.get("qty", 1) or 1), reverse=True)
        folder_item["children"] = children
        self._mark_dirty(); self.refresh()

    # ── DUPLICATE ────────────────────────────────────────────────────────────
    def _duplicate_item(self, node):
        item = self._id_map.get(node)
        if not item or item.get("type") == "folder":
            return
        new_item = copy.deepcopy(item)
        new_item["part"] = item.get("part", "") + " (copy)"
        lst = self._get_parent_list(item)
        if lst is not None:
            idx = lst.index(item)
            lst.insert(idx + 1, new_item)
            self._mark_dirty(); self.refresh()

    # ── DELETE / TRASH ───────────────────────────────────────────────────────
    def _delete_item(self, node):
        item = self._id_map.get(node)
        if not item:
            return
        if item.get("type") == "folder":
            n = len(item.get("children", []))
            msg   = f'Move folder "{item["name"]}" to trash'
            msg  += f' (with its {n} item{"s" if n != 1 else ""})?' if n else "?"
            label = f"\U0001f4c1 {item['name']}  ({n} item{'s' if n != 1 else ''})"
        else:
            msg   = f'Move "{item.get("part", "")}" to trash?'
            label = item.get("part", "")
            if item.get("info"):
                label += f"  —  {item['info']}"
        if not messagebox.askyesno("Delete", msg):
            return
        parent_node = self.tree.parent(node)
        parent_item = self._id_map.get(parent_node) if parent_node else None
        from_folder = parent_item.get("name") if parent_item else None
        lst = self._get_parent_list(item)
        if lst is not None:
            lst.remove(item)
            self.trash.append({"item": item, "from_folder": from_folder, "label": label})
            self._mark_dirty(); self.refresh()

    def _restore_entry(self, entry):
        item = entry["item"]
        if entry.get("from_folder"):
            folder = self._find_folder_by_name(entry["from_folder"])
            if folder:
                folder.setdefault("children", []).append(item)
                return
        self.data.append(item)

    def show_trash(self):
        dialog = tk.Toplevel(self.root)
        dialog.title("Trash")
        dialog.geometry("520x380")
        dialog.resizable(False, False)
        dialog.transient(self.root)
        dialog.grab_set()
        self.center_on_main(dialog)
        t = self._theme_dialog(dialog)

        ttk.Label(dialog, text="Deleted items:", font=("Arial", 11)).pack(
            pady=(12, 4), anchor="w", padx=15)

        lf = ttk.Frame(dialog)
        lf.pack(fill="both", expand=True, padx=15, pady=(0, 5))
        sb = ttk.Scrollbar(lf)
        sb.pack(side="right", fill="y")
        lb = tk.Listbox(lf, font=("Arial", 11), yscrollcommand=sb.set, activestyle="none",
                        bg=t["listbox_bg"], fg=t["listbox_fg"],
                        selectbackground=t["tree_sel_bg"], selectforeground=t["tree_sel_fg"])
        lb.pack(fill="both", expand=True)
        sb.config(command=lb.yview)

        def populate():
            lb.delete(0, tk.END)
            for e in self.trash:
                f = e.get("from_folder")
                lb.insert(tk.END, e.get("label", "?") + (f"   ← {f}" if f else "   ← root"))
            if not self.trash:
                lb.insert(tk.END, "(trash is empty)")

        populate()

        def restore_sel():
            sel = lb.curselection()
            if not sel or not self.trash:
                return
            self._restore_entry(self.trash.pop(sel[0]))
            populate(); self._mark_dirty(); self.refresh()

        def delete_sel():
            sel = lb.curselection()
            if not sel or not self.trash:
                return
            e = self.trash[sel[0]]
            if messagebox.askyesno("Delete Permanently",
                f'Permanently delete "{e.get("label","this item")}"?\nThis cannot be undone.',
                parent=dialog):
                self.trash.pop(sel[0]); populate()
                self._mark_dirty(); self._update_trash_btn()

        def restore_all():
            if not self.trash:
                return
            for e in list(self.trash):
                self._restore_entry(e)
            self.trash.clear(); populate(); self._mark_dirty(); self.refresh()

        def delete_all():
            if not self.trash:
                return
            if messagebox.askyesno("Delete All Permanently",
                f"Permanently delete all {len(self.trash)} item(s)?\nThis cannot be undone.",
                parent=dialog):
                self.trash.clear(); populate()
                self._mark_dirty(); self._update_trash_btn()

        bf = ttk.Frame(dialog)
        bf.pack(pady=8)
        ttk.Button(bf, text="Restore",            command=restore_sel ).grid(row=0, column=0, padx=6, pady=3)
        ttk.Button(bf, text="Delete Permanently", command=delete_sel  ).grid(row=0, column=1, padx=6, pady=3)
        ttk.Button(bf, text="Restore All",        command=restore_all ).grid(row=1, column=0, padx=6, pady=3)
        ttk.Button(bf, text="Delete All",         command=delete_all  ).grid(row=1, column=1, padx=6, pady=3)
        ttk.Button(dialog, text="Close", command=dialog.destroy).pack(pady=(0, 10))
        dialog.bind("<Escape>", lambda e: dialog.destroy())

    # ── EDIT / FOLDER ────────────────────────────────────────────────────────
    def _edit_item(self, node):
        item = self._id_map.get(node)
        if not item:
            return
        if item.get("type") == "folder":
            name = simpledialog.askstring("Rename Folder", "Folder name:", initialvalue=item["name"])
            if name and name.strip():
                item["name"] = name.strip()
                self._mark_dirty(); self.refresh()
            return
        self._open_part_dialog(item=item)

    def _make_folder(self, part_node):
        name = simpledialog.askstring("Folder Name", "e.g. Exhaust Setup, Suspension")
        if not name:
            return
        folder = {"type": "folder", "name": name, "children": []}
        if part_node:
            item = self._id_map.get(part_node)
            lst  = self._get_parent_list(item)
            if lst is not None and item in lst:
                idx = lst.index(item)
                lst.pop(idx)
                folder["children"].append(item)
                lst.insert(idx, folder)
        else:
            self.data.append(folder)
        self._mark_dirty(); self.refresh()

    # ── PARTS DIALOG ─────────────────────────────────────────────────────────
    def add_part(self):
        self._open_part_dialog(item=None)

    def _open_part_dialog(self, item=None):
        editing = item is not None
        dialog  = tk.Toplevel(self.root)
        dialog.title("Edit Part" if editing else "Add Part")
        dialog.geometry("560x500")
        dialog.resizable(False, False)
        dialog.transient(self.root)
        dialog.grab_set()
        self.center_on_main(dialog)
        t = self._theme_dialog(dialog)

        pad = {"padx": 15, "pady": 6}

        ttk.Label(dialog, text="Part Name:", font=("Arial", 11)).grid(row=0, column=0, sticky="w", **pad)
        part_var = tk.StringVar(value=item.get("part", "") if editing else "")
        ttk.Entry(dialog, textvariable=part_var, width=38, font=("Arial", 11)).grid(
            row=0, column=1, columnspan=2, sticky="ew", padx=5, pady=6)

        ttk.Label(dialog, text="Info:", font=("Arial", 11)).grid(row=1, column=0, sticky="w", **pad)
        info_var = tk.StringVar(value=item.get("info", "") if editing else "")
        ttk.Entry(dialog, textvariable=info_var, width=38, font=("Arial", 11)).grid(
            row=1, column=1, columnspan=2, sticky="ew", padx=5, pady=6)

        ttk.Label(dialog, text="Link:", font=("Arial", 11)).grid(row=2, column=0, sticky="w", **pad)
        link_var = tk.StringVar(value=self._get_link(item) if editing else "")
        ttk.Entry(dialog, textvariable=link_var, width=30, font=("Arial", 11)).grid(
            row=2, column=1, sticky="ew", padx=5, pady=6)
        ttk.Button(dialog, text="Open",
                   command=lambda: webbrowser.open(link_var.get().strip()) if link_var.get().strip() else None
                   ).grid(row=2, column=2, padx=(0, 15), pady=6)

        # Price + Qty on same row
        pq = ttk.Frame(dialog)
        pq.grid(row=3, column=0, columnspan=3, sticky="ew", padx=15, pady=6)
        ttk.Label(pq, text="Price (€):", font=("Arial", 11)).pack(side="left")
        ep = item.get("price", 0) if editing else 0
        price_var = tk.StringVar(value=f"{float(ep):.2f}" if ep else "")
        ttk.Entry(pq, textvariable=price_var, width=12, font=("Arial", 11)).pack(side="left", padx=(5, 20))
        ttk.Label(pq, text="Qty:", font=("Arial", 11)).pack(side="left")
        qty_var = tk.StringVar(value=str(int(item.get("qty", 1) or 1) if editing else 1))
        tk.Spinbox(pq, from_=1, to=999, textvariable=qty_var, width=6, font=("Arial", 11),
                   bg=t["entry_bg"], fg=t["entry_fg"],
                   buttonbackground=t["btn_bg"]).pack(side="left", padx=5)

        ttk.Label(dialog, text="Status:", font=("Arial", 11)).grid(row=4, column=0, sticky="w", **pad)
        cur_status  = item.get("status", "planned") if editing else "planned"
        status_var  = tk.StringVar(value=STATUS_INFO[cur_status]["label"])
        status_labels = [STATUS_INFO[s]["label"] for s in STATUS_OPTIONS]
        ttk.Combobox(dialog, textvariable=status_var, values=status_labels,
                     state="readonly", width=15, font=("Arial", 11)).grid(
            row=4, column=1, sticky="w", padx=5, pady=6)

        ttk.Label(dialog, text="Notes:", font=("Arial", 11)).grid(row=5, column=0, sticky="nw", padx=15, pady=6)
        notes_text = tk.Text(dialog, width=36, height=3, font=("Arial", 11),
                              bg=t["text_bg"], fg=t["text_fg"],
                              insertbackground=t["text_fg"], relief="solid", bd=1)
        notes_text.grid(row=5, column=1, columnspan=2, sticky="ew", padx=5, pady=6)
        if editing and item.get("notes"):
            notes_text.insert("1.0", item["notes"])

        # Alternatives
        opts_state = {
            "options": list(item.get("options", [])) if editing else [],
            "selected_idx": None,
        }
        if editing and item.get("selected") and opts_state["options"]:
            sel_name = item["selected"].get("name", "")
            for i, o in enumerate(opts_state["options"]):
                if o.get("name") == sel_name:
                    opts_state["selected_idx"] = i
                    break

        alts_label_var = tk.StringVar()
        def update_alts_label():
            n = len(opts_state["options"])
            alts_label_var.set(f"Manage Alternatives ({n})" if n else "Add Alternatives")
        update_alts_label()

        def open_alts():
            self._open_alternatives_dialog(opts_state, info_var, link_var, dialog)
            update_alts_label()

        ttk.Button(dialog, textvariable=alts_label_var, command=open_alts).grid(
            row=6, column=1, sticky="w", padx=5, pady=6)

        def on_confirm():
            part      = part_var.get().strip()
            info      = info_var.get().strip()
            link      = link_var.get().strip()
            raw_price = price_var.get().strip().replace(",", ".")
            s_label   = status_var.get()
            status    = next((s for s in STATUS_OPTIONS if STATUS_INFO[s]["label"] == s_label), "planned")
            notes     = notes_text.get("1.0", "end").rstrip("\n")
            try:
                qty = max(1, int(qty_var.get()))
            except (ValueError, tk.TclError):
                qty = 1

            if not part:
                messagebox.showwarning("Missing Info", "Part name is required.", parent=dialog)
                return
            try:
                price = float(raw_price) if raw_price else 0.0
            except ValueError:
                messagebox.showwarning("Invalid Price", "Price must be a number.", parent=dialog)
                return

            option  = {"name": info or part, "link": link}
            options = opts_state["options"] if opts_state["options"] else [option]
            si      = opts_state["selected_idx"]
            selected = options[si] if (si is not None and si < len(options)) else option

            if editing:
                item.update({"part": part, "info": info, "price": price, "qty": qty,
                              "status": status, "notes": notes,
                              "selected": selected, "options": options})
            else:
                self.data.append({
                    "type": "part", "part": part, "info": info,
                    "price": price, "qty": qty, "status": status, "notes": notes,
                    "selected": selected, "options": options,
                })
            self._mark_dirty(); self.refresh(); dialog.destroy()

        bf = ttk.Frame(dialog)
        bf.grid(row=7, column=0, columnspan=3, pady=12)
        ttk.Button(bf, text="Save" if editing else "Add Part", command=on_confirm).pack(side="left", padx=10)
        ttk.Button(bf, text="Cancel", command=dialog.destroy).pack(side="left", padx=10)

        dialog.columnconfigure(1, weight=1)
        dialog.bind("<Return>", lambda e: on_confirm())
        dialog.bind("<Escape>", lambda e: dialog.destroy())

    # ── ALTERNATIVES DIALOG ──────────────────────────────────────────────────
    def _open_alternatives_dialog(self, opts_state, info_var, link_var, parent):
        dialog = tk.Toplevel(parent)
        dialog.title("Manage Alternatives")
        dialog.geometry("480x360")
        dialog.resizable(False, False)
        dialog.transient(parent)
        dialog.grab_set()
        self.center_on_main(dialog)
        t = self._theme_dialog(dialog)

        ttk.Label(dialog, text="Alternative products  (★ = currently selected):",
                  font=("Arial", 11)).pack(pady=(12, 4), anchor="w", padx=15)

        lf = ttk.Frame(dialog)
        lf.pack(fill="both", expand=True, padx=15, pady=(0, 4))
        sb = ttk.Scrollbar(lf)
        sb.pack(side="right", fill="y")
        lb = tk.Listbox(lf, font=("Arial", 11), yscrollcommand=sb.set, activestyle="none",
                        bg=t["listbox_bg"], fg=t["listbox_fg"],
                        selectbackground=t["tree_sel_bg"], selectforeground=t["tree_sel_fg"])
        lb.pack(fill="both", expand=True)
        sb.config(command=lb.yview)

        def populate():
            lb.delete(0, tk.END)
            si = opts_state["selected_idx"]
            for i, o in enumerate(opts_state["options"]):
                prefix = "★ " if i == si else "   "
                link_preview = o.get("link", "") or "(no link)"
                lb.insert(tk.END, f"{prefix}{o.get('name', '')}  —  {link_preview}")
            if not opts_state["options"]:
                lb.insert(tk.END, "(no alternatives yet — click Add)")

        populate()

        def add_alt():
            name = simpledialog.askstring("Add Alternative", "Product name:", parent=dialog)
            if not name or not name.strip():
                return
            link = simpledialog.askstring("Add Alternative", "Product link (optional):", parent=dialog) or ""
            opts_state["options"].append({"name": name.strip(), "link": link.strip()})
            if opts_state["selected_idx"] is None:
                opts_state["selected_idx"] = 0
                info_var.set(name.strip())
                link_var.set(link.strip())
            populate()

        def remove_alt():
            sel = lb.curselection()
            if not sel or not opts_state["options"]:
                return
            i  = sel[0]
            opts_state["options"].pop(i)
            si = opts_state["selected_idx"]
            if si is not None:
                if si == i:
                    opts_state["selected_idx"] = 0 if opts_state["options"] else None
                elif si > i:
                    opts_state["selected_idx"] = si - 1
            populate()

        def set_selected():
            sel = lb.curselection()
            if not sel or not opts_state["options"]:
                return
            i = sel[0]
            opts_state["selected_idx"] = i
            o = opts_state["options"][i]
            info_var.set(o.get("name", ""))
            link_var.set(o.get("link", ""))
            populate()

        bf = ttk.Frame(dialog)
        bf.pack(pady=6)
        ttk.Button(bf, text="Add",          command=add_alt    ).grid(row=0, column=0, padx=5, pady=3)
        ttk.Button(bf, text="Remove",       command=remove_alt ).grid(row=0, column=1, padx=5, pady=3)
        ttk.Button(bf, text="Set Selected", command=set_selected).grid(row=0, column=2, padx=5, pady=3)
        ttk.Button(dialog, text="Done", command=dialog.destroy).pack(pady=(0, 10))
        dialog.bind("<Escape>", lambda e: dialog.destroy())

    # ── PROFILES ─────────────────────────────────────────────────────────────
    def add_profile(self):
        name = simpledialog.askstring("New Build", "Build name (becomes the filename):")
        if not name or not name.strip():
            return
        name = name.strip()
        if os.path.exists(os.path.join(BASE_DIR, f"{name}.json")):
            messagebox.showwarning("Already Exists",
                f'"{name}.json" already exists.\nUse Open Build to load it.')
            return
        if self._dirty:
            ans = messagebox.askyesnocancel(
                "Unsaved Changes",
                "You have unsaved changes.\nSave before switching?",
                icon="warning")
            if ans is None:
                return
            if ans:
                self._save_file()
        self.data = []; self.trash = []
        self.current_profile = name
        self._save_file(); self.refresh()

    def _rename_build(self):
        new_name = simpledialog.askstring("Rename Build", "New build name:",
                                           initialvalue=self.current_profile)
        if not new_name or not new_name.strip() or new_name.strip() == self.current_profile:
            return
        new_name = new_name.strip()
        new_path = os.path.join(BASE_DIR, f"{new_name}.json")
        if os.path.exists(new_path):
            messagebox.showwarning("Already Exists", f'"{new_name}.json" already exists.')
            return
        old_path = os.path.join(BASE_DIR, f"{self.current_profile}.json")
        try:
            os.rename(old_path, new_path)
        except Exception as e:
            messagebox.showerror("Rename Failed", str(e))
            return
        if self.favourite == self.current_profile:
            self.favourite = new_name
        self.current_profile = new_name
        self._dirty = False
        self._save_config(); self._update_title(); self._update_star_btn()

    def _duplicate_build(self):
        new_name = simpledialog.askstring("Duplicate Build", "Name for the copy:",
                                           initialvalue=f"{self.current_profile} copy")
        if not new_name or not new_name.strip():
            return
        new_name = new_name.strip()
        new_path = os.path.join(BASE_DIR, f"{new_name}.json")
        if os.path.exists(new_path):
            messagebox.showwarning("Already Exists", f'"{new_name}.json" already exists.')
            return
        try:
            with open(new_path, "w") as f:
                json.dump({"items": copy.deepcopy(self.data), "trash": []}, f, indent=4)
            messagebox.showinfo("Duplicated", f'Build saved as "{new_name}".')
        except Exception as e:
            messagebox.showerror("Error", str(e))

    # ── EXPORT CSV ───────────────────────────────────────────────────────────
    def export_csv(self):
        path = filedialog.asksaveasfilename(
            title="Export to CSV",
            defaultextension=".csv",
            initialfile=f"{self.current_profile}.csv",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")])
        if not path:
            return

        rows = []
        def collect(items, folder=""):
            for it in items:
                if it.get("type") == "folder":
                    collect(it.get("children", []), it.get("name", ""))
                else:
                    qty   = int(it.get("qty", 1) or 1)
                    price = float(it.get("price", 0) or 0)
                    rows.append({
                        "Folder":    folder,
                        "Part":      it.get("part", ""),
                        "Info":      it.get("info", ""),
                        "Status":    STATUS_INFO.get(it.get("status", "planned"), {}).get("label", ""),
                        "Price (€)": f"{price:.2f}",
                        "Qty":       qty,
                        "Total (€)": f"{price * qty:.2f}",
                        "Link":      self._get_link(it),
                        "Notes":     it.get("notes", ""),
                    })
        collect(self.data)

        fields = ["Folder", "Part", "Info", "Status", "Price (€)", "Qty", "Total (€)", "Link", "Notes"]
        try:
            with open(path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fields)
                writer.writeheader()
                writer.writerows(rows)
            messagebox.showinfo("Exported", f"Build exported to:\n{path}")
        except Exception as e:
            messagebox.showerror("Export Failed", str(e))

    # ── SAVE / LOAD ──────────────────────────────────────────────────────────
    def _save_config(self):
        try:
            cfg = {"default": self.current_profile}
            if self.favourite:
                cfg["favourite"] = self.favourite
            with open(os.path.join(BASE_DIR, "config.json"), "w") as f:
                json.dump(cfg, f)
        except Exception:
            pass

    def _load_config(self):
        try:
            with open(os.path.join(BASE_DIR, "config.json"), "r") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_file(self):
        filepath = os.path.join(BASE_DIR, f"{self.current_profile}.json")
        with open(filepath, "w") as f:
            json.dump({"items": self.data, "trash": self.trash}, f, indent=4)
        self._dirty = False
        self._update_title()
        self._save_config()

    def save(self):
        self._save_file()

    def load_build(self):
        if self._dirty:
            ans = messagebox.askyesnocancel(
                "Unsaved Changes",
                "You have unsaved changes.\nSave before opening another build?",
                icon="warning")
            if ans is None:
                return
            if ans:
                self._save_file()
        path = filedialog.askopenfilename(
            title="Open Build", initialdir=BASE_DIR,
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")])
        if not path:
            return
        try:
            with open(path, "r") as f:
                raw = json.load(f)
        except Exception as e:
            messagebox.showerror("Load Failed", f"Could not read file:\n{e}")
            return
        items, trash = self._parse_file(raw)
        if items is None:
            messagebox.showerror("Invalid File", "This file is not a valid build.")
            return
        self.data = items; self.trash = trash
        self.current_profile = os.path.splitext(os.path.basename(path))[0]
        self._dirty = False
        self._save_config(); self.refresh()

    def load(self):
        def try_load(name):
            path = os.path.join(BASE_DIR, f"{name}.json")
            if not os.path.exists(path):
                return None, None
            try:
                with open(path, "r") as f:
                    return self._parse_file(json.load(f))
            except Exception:
                return None, None

        cfg = self._load_config()
        self.favourite = cfg.get("favourite")

        for name in filter(None, [cfg.get("favourite"), cfg.get("default")]):
            items, trash = try_load(name)
            if items is not None:
                self.data, self.trash, self.current_profile = items, trash, name
                self._dirty = False; self.refresh(); return

        for filename in sorted(os.listdir(BASE_DIR)):
            if not filename.endswith(".json") or filename in ("config.json",):
                continue
            try:
                with open(os.path.join(BASE_DIR, filename), "r") as f:
                    items, trash = self._parse_file(json.load(f))
                if items is not None:
                    self.data, self.trash = items, trash
                    self.current_profile = os.path.splitext(filename)[0]
                    self._dirty = False; self.refresh(); return
            except Exception:
                pass

        self.data = json.loads(json.dumps(DEFAULT_CONTENT))
        self.trash = []; self.current_profile = "Default"
        self._save_file(); self._dirty = False; self.refresh()


if __name__ == "__main__":
    root = tk.Tk()
    app  = GarageApp(root)
    root.mainloop()
