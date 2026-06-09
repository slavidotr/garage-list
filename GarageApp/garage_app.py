import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, filedialog
import json
import os
import webbrowser

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Status definitions ─ symbol shown in tree, colour, display label
STATUS_OPTIONS = ["planned", "ordered", "installed", "sold"]
STATUS_INFO = {
    "planned":   {"symbol": "",    "color": "#888888", "label": "Planned"},
    "ordered":   {"symbol": "→ ",  "color": "#1a73e8", "label": "Ordered"},
    "installed": {"symbol": "✓ ",  "color": "#2e7d32", "label": "Installed"},
    "sold":      {"symbol": "✗ ",  "color": "#9e9e9e", "label": "Sold"},
}

DEFAULT_CONTENT = [
    {
        "type": "folder", "name": "Exhaust Setup",
        "children": [
            {"type": "part", "part": "Resonator",   "info": "Vibrant 1792",      "price": 0, "status": "planned",
             "selected": {"name": "Vibrant 1792",      "link": ""}, "options": []},
            {"type": "part", "part": "Rear Muffler", "info": "Magnaflow 12259",   "price": 0, "status": "planned",
             "selected": {"name": "Magnaflow 12259",   "link": ""}, "options": []},
        ]
    },
    {
        "type": "folder", "name": "Suspension",
        "children": [
            {"type": "part", "part": "Coilovers", "info": "BC Racing BR Series", "price": 0, "status": "planned",
             "selected": {"name": "BC Racing BR Series", "link": ""}, "options": []},
        ]
    },
    {"type": "part", "part": "Wheels", "info": "Rota Grid 17\"", "price": 0, "status": "planned",
     "selected": {"name": "Rota Grid 17\"", "link": ""}, "options": []},
]


class GarageApp:
    def __init__(self, root):
        self.root = root
        self.root.geometry("950x640")

        self.data = []
        self.trash = []
        self.current_profile = "Default"
        self.favourite = None
        self._id_map = {}
        self._dirty = False

        self._drag_node = None
        self._drag_item = None
        self._drag_indicator = None

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

    # ── UI SETUP ─────────────────────────────────────────────────────────────
    def setup_ui(self):
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

    def _on_tab_change(self, _event=None):
        if self.notebook.index(self.notebook.select()) == 1:
            self._refresh_budget()

    # ── BUILD PLANNER TAB ────────────────────────────────────────────────────
    def build_builder_ui(self):
        top = ttk.Frame(self.builder_tab)
        top.pack(fill="x", pady=5)

        ttk.Button(top, text="Add Part",   command=self.add_part).pack(side="left")
        ttk.Button(top, text="New Build",  command=self.add_profile).pack(side="left")
        ttk.Button(top, text="Open Build", command=self.load_build).pack(side="left")
        ttk.Button(top, text="Save",       command=self.save).pack(side="left")
        self.trash_btn = ttk.Button(top, text="Trash", command=self.show_trash)
        self.trash_btn.pack(side="left")
        self.star_btn = tk.Button(
            top, text="☆", font=("Arial", 14), relief="flat",
            cursor="hand2", bd=0, padx=4, command=self._toggle_favourite)
        self.star_btn.pack(side="left", padx=(4, 0))

        # Expand / Collapse pushed to right
        ttk.Button(top, text="▼ All", width=6, command=self._expand_all).pack(side="right", padx=(0, 4))
        ttk.Button(top, text="▶ All", width=6, command=self._collapse_all).pack(side="right")

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

        style = ttk.Style()
        style.configure("Build.Treeview", font=("Arial", 12), rowheight=28)
        style.map("Build.Treeview", background=[("selected", "#0078d7")])

        # Price bar anchors to bottom (must be packed before tree)
        self.price_var = tk.StringVar(value="Total: €0.00")
        ttk.Label(self.builder_tab, textvariable=self.price_var,
                  font=("Arial", 11), anchor="e", padding=(10, 5)).pack(fill="x", side="bottom")
        ttk.Separator(self.builder_tab, orient="horizontal").pack(fill="x", side="bottom")

        self.tree = ttk.Treeview(self.builder_tab, show="tree",
                                  selectmode="browse", style="Build.Treeview")
        for s in STATUS_OPTIONS:
            self.tree.tag_configure(f"s_{s}", foreground="#000000")
        self.tree.tag_configure("folder",     foreground="#000000", font=("Arial", 12, "bold"))
        self.tree.tag_configure("drop_above", background="#a8d4f5")
        self.tree.tag_configure("drop_into",  background="#4a90d9")
        self.tree.pack(fill="both", expand=True, padx=10, pady=(6, 0))

        self.tree.bind("<Double-1>",      self.on_tree_double_click)
        self.tree.bind("<Button-3>",      self.on_right_click)
        self.tree.bind("<ButtonPress-1>", self.on_drag_start)
        self.tree.bind("<B1-Motion>",     self.on_drag_motion)
        self.tree.bind("<ButtonRelease-1>", self.on_drag_release)
        self.tree.bind("<<TreeviewSelect>>", self._update_price_bar)

    def _expand_all(self):
        for node in self.tree.get_children():
            self.tree.item(node, open=True)

    def _collapse_all(self):
        for node in self.tree.get_children():
            self.tree.item(node, open=False)

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
        return q in item.get("part", "").lower() or q in item.get("info", "").lower()

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
        style = ttk.Style()
        style.configure("Budget.Treeview",        font=("Arial", 12), rowheight=26)
        style.configure("Budget.Treeview.Heading", font=("Arial", 11, "bold"))

        self.budget_tree = ttk.Treeview(
            self.budget_tab, columns=("cost",),
            show="tree headings", style="Budget.Treeview")
        self.budget_tree.heading("#0",   text="Part / Category", anchor="w")
        self.budget_tree.heading("cost", text="Cost",            anchor="e")
        self.budget_tree.column("#0",    stretch=True, minwidth=200)
        self.budget_tree.column("cost",  width=120, anchor="e", stretch=False)

        for s in STATUS_OPTIONS:
            self.budget_tree.tag_configure(f"bs_{s}", foreground="#000000")
        self.budget_tree.tag_configure("folder_row", font=("Arial", 12, "bold"), foreground="#000000")
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
            price  = 0.0
            try:
                price = float(item.get("price", 0) or 0)
            except (ValueError, TypeError):
                pass
            totals[status] = totals.get(status, 0.0) + price
            label = STATUS_INFO.get(status, {}).get("label", status.capitalize())
            self.budget_tree.insert(
                parent, "end",
                text=f"  {sym}{item.get('part', '')}",
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
                open=True,
                tags=("folder_row",))
            for child in children:
                add_part_row(node, child)
            return node

        # Folder rows
        loose = []
        for item in self.data:
            if item.get("type") == "folder":
                add_folder_row(item)
            else:
                loose.append(item)

        # Loose parts not in any folder
        if loose:
            loose_node = self.budget_tree.insert(
                "", "end", text="(No folder)",
                values=("",), open=True, tags=("folder_row",))
            for item in loose:
                add_part_row(loose_node, item)

        # Summary
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

✔ Add parts with name, info, link, price and status
✔ Status: Planned / Ordered / Installed / Sold
✔ Group parts in folders (Exhaust, Suspension, etc.)
✔ Double-click a part → opens its link in the browser
✔ Right-click → Edit / Open Link / Make Folder / Delete
✔ Deleted items go to Trash — restore or delete permanently
✔ Drag and drop to reorder or move into folders
✔ Search bar filters parts instantly
✔ Expand All / Collapse All for large builds
✔ Budget tab shows cost breakdown by folder
✔ Star (★) marks a favourite build to open on startup
✔ Each build is its own .json file

HOW TO USE:

1. Add parts and set price + status to track build progress
2. Budget tab shows installed vs ordered vs planned costs
3. Use the search bar to find any part instantly
4. Drag and drop to organise — drop onto a folder to move inside
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
        text   = symbol + name
        if info and info != name:
            text += f"  —  {info}"
        if price:
            try:
                text += f"  (€{float(price):.2f})"
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
                    total += float(item.get("price", 0) or 0)
                except (ValueError, TypeError):
                    pass
        return total

    def _update_title(self):
        marker = " *" if self._dirty else ""
        self.root.title(f"Garage Build Planner — {self.current_profile}{marker}")

    def _update_price_bar(self, _event=None):
        total = self._sum_prices(self.data)
        parts = [f"Total: €{total:.2f}"]
        node = self.tree.focus()
        item = self._id_map.get(node)
        if item:
            if item.get("type") == "folder":
                parts.append(f"Folder: €{self._sum_prices(item.get('children', [])):.2f}")
            else:
                try:
                    parts.append(f"Selected: €{float(item.get('price', 0) or 0):.2f}")
                except (ValueError, TypeError):
                    pass
        self.price_var.set("   |   ".join(parts))

    def _update_trash_btn(self):
        n = len(self.trash)
        self.trash_btn.config(text=f"Trash ({n})" if n else "Trash")

    def _update_star_btn(self):
        if self.favourite == self.current_profile:
            self.star_btn.config(text="★", fg="#f5a623")
        else:
            self.star_btn.config(text="☆", fg="#aaaaaa")

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

    # ── DATA / TREE ───────────────────────────────────────────────────────────
    def refresh(self):
        self._update_title()
        self._update_trash_btn()
        self._update_star_btn()
        self._id_map = {}
        for node in self.tree.get_children():
            self.tree.delete(node)
        for item in self.data:
            self._insert_tree_item("", item)
        self._update_price_bar()

    def _insert_tree_item(self, parent, item):
        if item.get("type") == "folder":
            node = self.tree.insert(parent, "end",
                                    text=f"\U0001f4c1  {item['name']}", open=True,
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
        tag = "drop_into" if (target_item and target_item.get("type") == "folder") else "drop_above"
        self.tree.item(target, tags=(tag,))
        self._drag_indicator = target
        self.tree.config(cursor="hand2")

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
            self._mark_dirty()
            self.refresh()
            return
        target_item = self._id_map.get(target_node)
        if target_item is None:
            return
        if drag_item.get("type") == "folder":
            if self.tree.parent(target_node) or target_item.get("type") == "folder":
                return
        src_list.remove(drag_item)
        if target_item.get("type") == "folder":
            target_item.setdefault("children", []).append(drag_item)
        else:
            dst = self._get_parent_list(target_item)
            if dst is None:
                src_list.append(drag_item)
                return
            idx = dst.index(target_item)
            bbox = self.tree.bbox(target_node)
            if bbox and event.y > bbox[1] + bbox[3] // 2:
                idx += 1
            dst.insert(idx, drag_item)
        self._mark_dirty()
        self.refresh()

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
        item    = self._id_map.get(node) if node else None
        is_part = item is not None and item.get("type") != "folder"
        menu = tk.Menu(self.root, tearoff=0)
        if item is not None:
            menu.add_command(label="Edit", command=lambda: self._edit_item(node))
        if is_part:
            menu.add_command(label="Open Link", command=lambda: self._open_link(node))
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
        parent_node  = self.tree.parent(node)
        parent_item  = self._id_map.get(parent_node) if parent_node else None
        from_folder  = parent_item.get("name") if parent_item else None
        lst = self._get_parent_list(item)
        if lst is not None:
            lst.remove(item)
            self.trash.append({"item": item, "from_folder": from_folder, "label": label})
            self._mark_dirty()
            self.refresh()

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

        ttk.Label(dialog, text="Deleted items:", font=("Arial", 11)).pack(
            pady=(12, 4), anchor="w", padx=15)

        lf = ttk.Frame(dialog)
        lf.pack(fill="both", expand=True, padx=15, pady=(0, 5))
        sb = ttk.Scrollbar(lf)
        sb.pack(side="right", fill="y")
        lb = tk.Listbox(lf, font=("Arial", 11), yscrollcommand=sb.set, activestyle="none")
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
        dialog.geometry("520x360")
        dialog.resizable(False, False)
        dialog.transient(self.root)
        dialog.grab_set()
        self.center_on_main(dialog)

        pad = {"padx": 15, "pady": 7}

        # Part name
        ttk.Label(dialog, text="Part Name:", font=("Arial", 11)).grid(row=0, column=0, sticky="w", **pad)
        part_var = tk.StringVar(value=item.get("part", "") if editing else "")
        ttk.Entry(dialog, textvariable=part_var, width=38, font=("Arial", 11)).grid(
            row=0, column=1, columnspan=2, sticky="ew", padx=5, pady=7)

        # Info
        ttk.Label(dialog, text="Info (optional):", font=("Arial", 11)).grid(row=1, column=0, sticky="w", **pad)
        info_var = tk.StringVar(value=item.get("info", "") if editing else "")
        ttk.Entry(dialog, textvariable=info_var, width=38, font=("Arial", 11)).grid(
            row=1, column=1, columnspan=2, sticky="ew", padx=5, pady=7)

        # Link
        ttk.Label(dialog, text="Link:", font=("Arial", 11)).grid(row=2, column=0, sticky="w", **pad)
        link_var = tk.StringVar(value=self._get_link(item) if editing else "")
        ttk.Entry(dialog, textvariable=link_var, width=30, font=("Arial", 11)).grid(
            row=2, column=1, sticky="ew", padx=5, pady=7)
        ttk.Button(dialog, text="Open Link",
                   command=lambda: webbrowser.open(link_var.get().strip()) if link_var.get().strip() else None
                   ).grid(row=2, column=2, padx=(0, 15), pady=7)

        # Price
        ttk.Label(dialog, text="Price (€):", font=("Arial", 11)).grid(row=3, column=0, sticky="w", **pad)
        ep = item.get("price", 0) if editing else 0
        price_var = tk.StringVar(value=f"{float(ep):.2f}" if ep else "")
        ttk.Entry(dialog, textvariable=price_var, width=15, font=("Arial", 11)).grid(
            row=3, column=1, sticky="w", padx=5, pady=7)

        # Status
        ttk.Label(dialog, text="Status:", font=("Arial", 11)).grid(row=4, column=0, sticky="w", **pad)
        cur_status = item.get("status", "planned") if editing else "planned"
        status_var = tk.StringVar(value=STATUS_INFO[cur_status]["label"])
        status_labels = [STATUS_INFO[s]["label"] for s in STATUS_OPTIONS]
        ttk.Combobox(dialog, textvariable=status_var, values=status_labels,
                     state="readonly", width=15, font=("Arial", 11)).grid(
            row=4, column=1, sticky="w", padx=5, pady=7)

        def on_confirm():
            part      = part_var.get().strip()
            info      = info_var.get().strip()
            link      = link_var.get().strip()
            raw_price = price_var.get().strip().replace(",", ".")
            s_label   = status_var.get()
            status    = next((s for s in STATUS_OPTIONS
                              if STATUS_INFO[s]["label"] == s_label), "planned")

            if not part:
                messagebox.showwarning("Missing Info", "Part name is required.", parent=dialog)
                return
            try:
                price = float(raw_price) if raw_price else 0.0
            except ValueError:
                messagebox.showwarning("Invalid Price", "Price must be a number.", parent=dialog)
                return

            option = {"name": info or part, "link": link}
            if editing:
                item["part"]     = part
                item["info"]     = info
                item["price"]    = price
                item["status"]   = status
                item["selected"] = option
                item["options"]  = [option]
            else:
                self.data.append({
                    "type": "part", "part": part, "info": info,
                    "price": price, "status": status,
                    "selected": option, "options": [option]
                })
            self._mark_dirty(); self.refresh(); dialog.destroy()

        bf = ttk.Frame(dialog)
        bf.grid(row=5, column=0, columnspan=3, pady=12)
        ttk.Button(bf, text="Save" if editing else "Add Part", command=on_confirm).pack(side="left", padx=10)
        ttk.Button(bf, text="Cancel", command=dialog.destroy).pack(side="left", padx=10)

        dialog.columnconfigure(1, weight=1)
        dialog.bind("<Return>", lambda e: on_confirm())
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
                "You have unsaved changes in the current build.\nSave before switching?",
                icon="warning")
            if ans is None:
                return
            if ans:
                self._save_file()
        self.data = []; self.trash = []
        self.current_profile = name
        self._save_file(); self.refresh()

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
            if not filename.endswith(".json") or filename == "config.json":
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
