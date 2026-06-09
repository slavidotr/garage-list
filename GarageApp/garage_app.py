import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, filedialog
import json
import os
import webbrowser

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DEFAULT_CONTENT = [
    {
        "type": "folder",
        "name": "Exhaust Setup",
        "children": [
            {
                "type": "part", "part": "Resonator", "info": "Vibrant 1792", "price": 0,
                "selected": {"name": "Vibrant 1792", "link": ""},
                "options": [{"name": "Vibrant 1792", "link": ""}]
            },
            {
                "type": "part", "part": "Rear Muffler", "info": "Magnaflow 12259", "price": 0,
                "selected": {"name": "Magnaflow 12259", "link": ""},
                "options": [{"name": "Magnaflow 12259", "link": ""}]
            }
        ]
    },
    {
        "type": "folder",
        "name": "Suspension",
        "children": [
            {
                "type": "part", "part": "Coilovers", "info": "BC Racing BR Series", "price": 0,
                "selected": {"name": "BC Racing BR Series", "link": ""},
                "options": [{"name": "BC Racing BR Series", "link": ""}]
            }
        ]
    },
    {
        "type": "part", "part": "Wheels", "info": "Rota Grid 17\"", "price": 0,
        "selected": {"name": "Rota Grid 17\"", "link": ""},
        "options": [{"name": "Rota Grid 17\"", "link": ""}]
    }
]


class GarageApp:
    def __init__(self, root):
        self.root = root
        self.root.geometry("900x600")

        self.data = []
        self.trash = []
        self.current_profile = "Default"
        self.favourite = None
        self._id_map = {}
        self._dirty = False

        # drag state
        self._drag_node = None
        self._drag_item = None
        self._drag_indicator = None

        self.setup_ui()
        self.load()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    # ---------------- CLOSE GUARD ----------------
    def _on_close(self):
        if self._dirty:
            ans = messagebox.askyesnocancel(
                "Unsaved Changes",
                "You have unsaved changes.\nSave before closing?",
                icon="warning"
            )
            if ans is None:
                return
            if ans:
                self._save_file()
        self.root.destroy()

    def _mark_dirty(self):
        self._dirty = True
        self._update_title()

    # ---------------- UI SETUP ----------------
    def setup_ui(self):
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True)

        self.builder_tab = ttk.Frame(self.notebook)
        self.help_tab = ttk.Frame(self.notebook)

        self.notebook.add(self.builder_tab, text="Build Planner")
        self.notebook.add(self.help_tab, text="What can I do?")

        self.build_builder_ui()
        self.build_help_ui()

    # ---------------- BUILDER UI ----------------
    def build_builder_ui(self):
        top = ttk.Frame(self.builder_tab)
        top.pack(fill="x", pady=5)

        ttk.Button(top, text="Add Part", command=self.add_part).pack(side="left")
        ttk.Button(top, text="New Build", command=self.add_profile).pack(side="left")
        ttk.Button(top, text="Open Build", command=self.load_build).pack(side="left")
        ttk.Button(top, text="Save", command=self.save).pack(side="left")
        self.trash_btn = ttk.Button(top, text="Trash", command=self.show_trash)
        self.trash_btn.pack(side="left")
        self.star_btn = tk.Button(
            top, text="☆", font=("Arial", 14), relief="flat",
            cursor="hand2", bd=0, padx=4, command=self._toggle_favourite
        )
        self.star_btn.pack(side="left", padx=(4, 0))

        style = ttk.Style()
        style.configure("Build.Treeview", font=("Arial", 12), rowheight=28)
        style.map("Build.Treeview", background=[("selected", "#0078d7")])

        # Price bar packed before tree so it anchors to the bottom
        self.price_var = tk.StringVar(value="Total: €0.00")
        ttk.Label(
            self.builder_tab, textvariable=self.price_var,
            font=("Arial", 11), anchor="e", padding=(10, 5)
        ).pack(fill="x", side="bottom")

        ttk.Separator(self.builder_tab, orient="horizontal").pack(fill="x", side="bottom")

        self.tree = ttk.Treeview(self.builder_tab, show="tree", selectmode="browse", style="Build.Treeview")
        self.tree.tag_configure("drop_above", background="#a8d4f5")
        self.tree.tag_configure("drop_into", background="#4a90d9")
        self.tree.pack(fill="both", expand=True, padx=10, pady=10)

        self.tree.bind("<Double-1>", self.on_tree_double_click)
        self.tree.bind("<Button-3>", self.on_right_click)
        self.tree.bind("<ButtonPress-1>", self.on_drag_start)
        self.tree.bind("<B1-Motion>", self.on_drag_motion)
        self.tree.bind("<ButtonRelease-1>", self.on_drag_release)
        self.tree.bind("<<TreeviewSelect>>", self._update_price_bar)

    # ---------------- HELP TAB ----------------
    def build_help_ui(self):
        text = tk.Text(self.help_tab, wrap="word", font=("Arial", 11))
        text.pack(fill="both", expand=True)

        text.insert("end",
        """GARAGE BUILD PLANNER - HELP

WHAT YOU CAN DO:

✔ Add car parts with name, info, link and price
✔ Group parts in folders (Exhaust Setup, Suspension, etc.)
✔ Double-click a part → opens its link in the browser
✔ Right-click → Edit / Open Link / Make Folder / Delete
✔ Deleted items go to Trash — restore or delete permanently
✔ Drag parts or folders to reorder, or drop onto a folder
✔ Price totals shown at the bottom (total and selected)
✔ Each build is its own .json file — window title shows unsaved changes (*)

HOW TO USE:

1. Add parts and set a price to track build costs
2. Right-click items to edit, open links, or create folders
3. Drag and drop to reorder anything
4. Check Trash to recover deleted items
5. Use New Build / Open Build to manage multiple builds

This is basically your digital garage notebook.
""")
        text.config(state="disabled")

    # ---------------- HELPERS ----------------
    def center_on_main(self, dialog):
        dialog.update_idletasks()
        x = self.root.winfo_x() + (self.root.winfo_width() - dialog.winfo_width()) // 2
        y = self.root.winfo_y() + (self.root.winfo_height() - dialog.winfo_height()) // 2
        dialog.geometry(f"+{x}+{y}")

    def _display_text(self, item):
        name = item.get("part", "")
        info = item.get("info", "") or item.get("selected", {}).get("name", "")
        price = item.get("price", 0) or 0

        text = name
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
            if entry.get("type") == "folder":
                children = entry.get("children", [])
                if item in children:
                    return children
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

    def _update_price_bar(self, event=None):
        total = self._sum_prices(self.data)
        parts = [f"Total: €{total:.2f}"]

        node = self.tree.focus()
        item = self._id_map.get(node)
        if item:
            if item.get("type") == "folder":
                sel_sum = self._sum_prices(item.get("children", []))
                parts.append(f"Selected folder: €{sel_sum:.2f}")
            else:
                try:
                    price = float(item.get("price", 0) or 0)
                    parts.append(f"Selected: €{price:.2f}")
                except (ValueError, TypeError):
                    pass

        self.price_var.set("   |   ".join(parts))

    def _update_trash_btn(self):
        count = len(self.trash)
        self.trash_btn.config(text=f"Trash ({count})" if count else "Trash")

    def _update_star_btn(self):
        if self.favourite == self.current_profile:
            self.star_btn.config(text="★", fg="#f5a623")
        else:
            self.star_btn.config(text="☆", fg="#aaaaaa")

    def _toggle_favourite(self):
        if self.favourite == self.current_profile:
            self.favourite = None
        else:
            self.favourite = self.current_profile
        self._save_config()
        self._update_star_btn()

    def _parse_file(self, raw):
        """Accept both old list format and new dict format. Returns (items, trash) or (None, None)."""
        if isinstance(raw, list):
            return raw, []
        if isinstance(raw, dict) and "items" in raw:
            return raw.get("items", []), raw.get("trash", [])
        return None, None

    # ---------------- DATA LOGIC ----------------
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
            node = self.tree.insert(parent, "end", text=f"\U0001f4c1  {item['name']}", open=True)
            self._id_map[node] = item
            for child in item.get("children", []):
                self._insert_tree_item(node, child)
        else:
            node = self.tree.insert(parent, "end", text=self._display_text(item))
            self._id_map[node] = item

    def _clear_drop_indicator(self):
        if self._drag_indicator:
            try:
                self.tree.item(self._drag_indicator, tags=())
            except tk.TclError:
                pass
            self._drag_indicator = None

    # ---------------- DRAG AND DROP ----------------
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

        drag_item = self._drag_item
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

        drag_node = self._drag_node
        drag_item = self._drag_item
        self._drag_node = None
        self._drag_item = None

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
            dst_list = self._get_parent_list(target_item)
            if dst_list is None:
                src_list.append(drag_item)
                return

            idx = dst_list.index(target_item)
            bbox = self.tree.bbox(target_node)
            if bbox:
                mid_y = bbox[1] + bbox[3] // 2
                if event.y > mid_y:
                    idx += 1
            dst_list.insert(idx, drag_item)

        self._mark_dirty()
        self.refresh()

    # ---------------- TREE EVENTS ----------------
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

        item = self._id_map.get(node) if node else None
        is_part = item is not None and item.get("type") != "folder"

        menu = tk.Menu(self.root, tearoff=0)

        if item is not None:
            menu.add_command(label="Edit", command=lambda: self._edit_item(node))

        if is_part:
            menu.add_command(label="Open Link", command=lambda: self._open_link(node))
            menu.add_separator()

        menu.add_command(label="Make Folder", command=lambda: self._make_folder(node if is_part else None))

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

    # ---------------- DELETE / TRASH ----------------
    def _delete_item(self, node):
        item = self._id_map.get(node)
        if not item:
            return

        if item.get("type") == "folder":
            count = len(item.get("children", []))
            msg = f'Move folder "{item["name"]}" to trash'
            msg += f' (with its {count} item{"s" if count != 1 else ""})?' if count else "?"
            label = f"\U0001f4c1 {item['name']}  ({count} item{'s' if count != 1 else ''})"
        else:
            msg = f'Move "{item.get("part", "")}" to trash?'
            info = item.get("info", "")
            label = item.get("part", "")
            if info:
                label += f"  —  {info}"

        if not messagebox.askyesno("Delete", msg):
            return

        parent_node = self.tree.parent(node)
        parent_item = self._id_map.get(parent_node) if parent_node else None
        from_folder = parent_item.get("name") if parent_item else None

        lst = self._get_parent_list(item)
        if lst is not None:
            lst.remove(item)
            self.trash.append({"item": item, "from_folder": from_folder, "label": label})
            self._mark_dirty()
            self.refresh()

    def _restore_entry(self, entry):
        item = entry["item"]
        from_folder = entry.get("from_folder")
        if from_folder:
            folder = self._find_folder_by_name(from_folder)
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

        ttk.Label(dialog, text="Deleted items:", font=("Arial", 11)).pack(pady=(12, 4), anchor="w", padx=15)

        list_frame = ttk.Frame(dialog)
        list_frame.pack(fill="both", expand=True, padx=15, pady=(0, 5))

        sb = ttk.Scrollbar(list_frame)
        sb.pack(side="right", fill="y")
        listbox = tk.Listbox(list_frame, font=("Arial", 11), yscrollcommand=sb.set, activestyle="none")
        listbox.pack(fill="both", expand=True)
        sb.config(command=listbox.yview)

        def populate():
            listbox.delete(0, tk.END)
            for entry in self.trash:
                from_f = entry.get("from_folder")
                suffix = f"   ← {from_f}" if from_f else "   ← root"
                listbox.insert(tk.END, entry.get("label", "?") + suffix)
            if not self.trash:
                listbox.insert(tk.END, "(trash is empty)")

        populate()

        def restore_selected():
            sel = listbox.curselection()
            if not sel or not self.trash:
                return
            entry = self.trash.pop(sel[0])
            self._restore_entry(entry)
            populate()
            self._mark_dirty()
            self.refresh()

        def delete_selected():
            sel = listbox.curselection()
            if not sel or not self.trash:
                return
            entry = self.trash[sel[0]]
            if messagebox.askyesno(
                "Delete Permanently",
                f'Permanently delete "{entry.get("label", "this item")}"?\nThis cannot be undone.',
                parent=dialog
            ):
                self.trash.pop(sel[0])
                populate()
                self._mark_dirty()
                self._update_trash_btn()

        def restore_all():
            if not self.trash:
                return
            for entry in list(self.trash):
                self._restore_entry(entry)
            self.trash.clear()
            populate()
            self._mark_dirty()
            self.refresh()

        def delete_all():
            if not self.trash:
                return
            if messagebox.askyesno(
                "Delete All Permanently",
                f"Permanently delete all {len(self.trash)} item(s)?\nThis cannot be undone.",
                parent=dialog
            ):
                self.trash.clear()
                populate()
                self._mark_dirty()
                self._update_trash_btn()

        btn_frame = ttk.Frame(dialog)
        btn_frame.pack(pady=8)
        ttk.Button(btn_frame, text="Restore",            command=restore_selected).grid(row=0, column=0, padx=6, pady=3)
        ttk.Button(btn_frame, text="Delete Permanently", command=delete_selected ).grid(row=0, column=1, padx=6, pady=3)
        ttk.Button(btn_frame, text="Restore All",        command=restore_all     ).grid(row=1, column=0, padx=6, pady=3)
        ttk.Button(btn_frame, text="Delete All",         command=delete_all      ).grid(row=1, column=1, padx=6, pady=3)

        ttk.Button(dialog, text="Close", command=dialog.destroy).pack(pady=(0, 10))
        dialog.bind("<Escape>", lambda e: dialog.destroy())

    # ---------------- EDIT / FOLDER ----------------
    def _edit_item(self, node):
        item = self._id_map.get(node)
        if not item:
            return

        if item.get("type") == "folder":
            name = simpledialog.askstring("Rename Folder", "Folder name:", initialvalue=item["name"])
            if name and name.strip():
                item["name"] = name.strip()
                self._mark_dirty()
                self.refresh()
            return

        self._open_part_dialog(item=item)

    def _make_folder(self, part_node):
        name = simpledialog.askstring("Folder Name", "e.g. Exhaust Setup, Suspension")
        if not name:
            return

        folder = {"type": "folder", "name": name, "children": []}

        if part_node:
            item = self._id_map.get(part_node)
            lst = self._get_parent_list(item)
            if lst is not None and item in lst:
                idx = lst.index(item)
                lst.pop(idx)
                folder["children"].append(item)
                lst.insert(idx, folder)
        else:
            self.data.append(folder)

        self._mark_dirty()
        self.refresh()

    # ---------------- PARTS ----------------
    def add_part(self):
        self._open_part_dialog(item=None)

    def _open_part_dialog(self, item=None):
        editing = item is not None
        dialog = tk.Toplevel(self.root)
        dialog.title("Edit Part" if editing else "Add Part")
        dialog.geometry("520x310")
        dialog.resizable(False, False)
        dialog.transient(self.root)
        dialog.grab_set()
        self.center_on_main(dialog)

        pad = {"padx": 15, "pady": 8}

        ttk.Label(dialog, text="Part Name:", font=("Arial", 11)).grid(row=0, column=0, sticky="w", **pad)
        part_var = tk.StringVar(value=item.get("part", "") if editing else "")
        ttk.Entry(dialog, textvariable=part_var, width=38, font=("Arial", 11)).grid(row=0, column=1, columnspan=2, sticky="ew", padx=5, pady=8)

        ttk.Label(dialog, text="Info (optional):", font=("Arial", 11)).grid(row=1, column=0, sticky="w", **pad)
        info_var = tk.StringVar(value=item.get("info", "") if editing else "")
        ttk.Entry(dialog, textvariable=info_var, width=38, font=("Arial", 11)).grid(row=1, column=1, columnspan=2, sticky="ew", padx=5, pady=8)

        ttk.Label(dialog, text="Link:", font=("Arial", 11)).grid(row=2, column=0, sticky="w", **pad)
        link_var = tk.StringVar(value=self._get_link(item) if editing else "")
        ttk.Entry(dialog, textvariable=link_var, width=30, font=("Arial", 11)).grid(row=2, column=1, sticky="ew", padx=5, pady=8)

        def open_link():
            url = link_var.get().strip()
            if url:
                webbrowser.open(url)

        ttk.Button(dialog, text="Open Link", command=open_link).grid(row=2, column=2, padx=(0, 15), pady=8)

        ttk.Label(dialog, text="Price (€):", font=("Arial", 11)).grid(row=3, column=0, sticky="w", **pad)
        existing_price = item.get("price", 0) if editing else 0
        price_str = f"{float(existing_price):.2f}" if existing_price else ""
        price_var = tk.StringVar(value=price_str)
        ttk.Entry(dialog, textvariable=price_var, width=15, font=("Arial", 11)).grid(row=3, column=1, sticky="w", padx=5, pady=8)

        def on_confirm():
            part = part_var.get().strip()
            info = info_var.get().strip()
            link = link_var.get().strip()
            raw_price = price_var.get().strip().replace(",", ".")

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
                item["part"] = part
                item["info"] = info
                item["price"] = price
                item["selected"] = option
                item["options"] = [option]
            else:
                self.data.append({
                    "type": "part",
                    "part": part,
                    "info": info,
                    "price": price,
                    "selected": option,
                    "options": [option]
                })

            self._mark_dirty()
            self.refresh()
            dialog.destroy()

        btn_frame = ttk.Frame(dialog)
        btn_frame.grid(row=4, column=0, columnspan=3, pady=12)
        ttk.Button(btn_frame, text="Save" if editing else "Add Part", command=on_confirm).pack(side="left", padx=10)
        ttk.Button(btn_frame, text="Cancel", command=dialog.destroy).pack(side="left", padx=10)

        dialog.columnconfigure(1, weight=1)
        dialog.bind("<Return>", lambda e: on_confirm())
        dialog.bind("<Escape>", lambda e: dialog.destroy())

    # ---------------- PROFILES ----------------
    def add_profile(self):
        name = simpledialog.askstring("New Build", "Build name (becomes the filename):")
        if not name or not name.strip():
            return
        name = name.strip()

        filepath = os.path.join(BASE_DIR, f"{name}.json")
        if os.path.exists(filepath):
            messagebox.showwarning("Already Exists", f'"{name}.json" already exists.\nUse Open Build to load it.')
            return

        if self._dirty:
            ans = messagebox.askyesnocancel(
                "Unsaved Changes",
                "You have unsaved changes in the current build.\nSave before switching?",
                icon="warning"
            )
            if ans is None:
                return
            if ans:
                self._save_file()

        self.data = []
        self.trash = []
        self.current_profile = name
        self._save_file()
        self.refresh()

    # ---------------- SAVE / LOAD ----------------
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
                icon="warning"
            )
            if ans is None:
                return
            if ans:
                self._save_file()

        path = filedialog.askopenfilename(
            title="Open Build",
            initialdir=BASE_DIR,
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
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

        self.data = items
        self.trash = trash
        self.current_profile = os.path.splitext(os.path.basename(path))[0]
        self._dirty = False
        self._save_config()
        self.refresh()

    def load(self):
        """On startup: load the default build from config, or first alphabetical, or create Default.json."""
        def try_load(name):
            path = os.path.join(BASE_DIR, f"{name}.json")
            if not os.path.exists(path):
                return None, None
            try:
                with open(path, "r") as f:
                    raw = json.load(f)
                return self._parse_file(raw)
            except Exception:
                return None, None

        cfg = self._load_config()
        self.favourite = cfg.get("favourite")

        # 1. Prefer the starred favourite, then fall back to last-used default
        for name in filter(None, [cfg.get("favourite"), cfg.get("default")]):
            items, trash = try_load(name)
            if items is not None:
                self.data, self.trash, self.current_profile = items, trash, name
                self._dirty = False
                self.refresh()
                return

        # 2. Fall back to first valid .json in folder
        for filename in sorted(os.listdir(BASE_DIR)):
            if not filename.endswith(".json") or filename == "config.json":
                continue
            try:
                with open(os.path.join(BASE_DIR, filename), "r") as f:
                    raw = json.load(f)
                items, trash = self._parse_file(raw)
                if items is not None:
                    self.data, self.trash = items, trash
                    self.current_profile = os.path.splitext(filename)[0]
                    self._dirty = False
                    self.refresh()
                    return
            except Exception:
                pass

        # 3. No valid files found — create Default.json with examples
        self.data = json.loads(json.dumps(DEFAULT_CONTENT))
        self.trash = []
        self.current_profile = "Default"
        self._save_file()
        self._dirty = False
        self.refresh()


if __name__ == "__main__":
    root = tk.Tk()
    app = GarageApp(root)
    root.mainloop()
