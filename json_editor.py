import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import json
import os
import sys

CONFIG_FILE = "json_editor_config.json"

class JSONEditor(tk.Tk):
    def __init__(self):
        super().__init__()
        
        self.title("JSON Editor")
        self.geometry("1000x700") # Wider for split view
        
        # Data state
        self.filepath = None
        self.data = []
        self.current_index = 0
        self.entry_map = {} # Maps path tuple to (entry_widget_var, original_type)
        
        # Load config
        self.last_opened = self.load_config()

        # Configure UI
        self._setup_ui()
        self._bind_shortcuts()
        
        # Defer file loading slightly to allow window to appear
        # If we have a last opened file, try to load it
        if self.last_opened and os.path.exists(self.last_opened):
            self.after(100, lambda: self.load_specific_file(self.last_opened))
        else:
            self.after(100, self.load_file)

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r') as f:
                    cfg = json.load(f)
                    return cfg.get("last_opened_file")
            except:
                return None
        return None

    def save_config(self, path):
        try:
            with open(CONFIG_FILE, 'w') as f:
                json.dump({"last_opened_file": path}, f)
        except:
            pass # Ignore config save errors

    def _setup_ui(self):
        # Navigation Bar (Top)
        self.nav_frame = ttk.Frame(self)
        self.nav_frame.pack(fill=tk.X, padx=10, pady=10, side=tk.TOP)
        
        self.btn_prev = ttk.Button(self.nav_frame, text="◄", command=self.navigate_previous)
        self.btn_prev.pack(side=tk.LEFT)
        
        self.lbl_status = ttk.Label(self.nav_frame, text="No file loaded")
        self.lbl_status.pack(side=tk.LEFT, padx=20)
        
        self.btn_next = ttk.Button(self.nav_frame, text="►", command=self.navigate_next)
        self.btn_next.pack(side=tk.LEFT)
        
        # Action Buttons
        self.btn_exit = ttk.Button(self.nav_frame, text="Exit", command=self.quit)
        self.btn_exit.pack(side=tk.RIGHT)

        self.btn_save = ttk.Button(self.nav_frame, text="Save (Ctrl+S)", command=self.save_changes)
        self.btn_save.pack(side=tk.RIGHT, padx=5)
        
        self.btn_reload = ttk.Button(self.nav_frame, text="Reload", command=self.reload_file)
        self.btn_reload.pack(side=tk.RIGHT, padx=5)
        
        self.btn_open = ttk.Button(self.nav_frame, text="Open File", command=self.load_file)
        self.btn_open.pack(side=tk.RIGHT, padx=5)

        # Main Split View
        self.paned_window = ttk.PanedWindow(self, orient=tk.HORIZONTAL)
        self.paned_window.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

        # LEFT PANE: Form Editor
        self.left_frame = ttk.Frame(self.paned_window)
        self.paned_window.add(self.left_frame, weight=1)
        
        # Sub-canvas for left frame scrolling
        self.canvas = tk.Canvas(self.left_frame)
        self.scrollbar = ttk.Scrollbar(self.left_frame, orient="vertical", command=self.canvas.yview)
        self.scrollable_frame = ttk.Frame(self.canvas)
        
        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )

        self.window_id = self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        
        # Resize canvas window with canvas
        self.canvas.bind("<Configure>", self._on_canvas_configure)

        self.canvas.configure(yscrollcommand=self.scrollbar.set)
        
        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")
        
        # Mousewheel scrolling for form
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel)

        # RIGHT PANE: JSON Preview
        self.right_frame = ttk.Frame(self.paned_window)
        self.paned_window.add(self.right_frame, weight=1)

        self.lbl_preview = ttk.Label(self.right_frame, text="JSON Preview", font=("Segoe UI", 10, "bold"))
        self.lbl_preview.pack(anchor="w", pady=(0, 5))

        self.txt_preview = tk.Text(self.right_frame, wrap=tk.NONE, font=("Consolas", 10))
        self.preview_scroll_y = ttk.Scrollbar(self.right_frame, orient="vertical", command=self.txt_preview.yview)
        self.preview_scroll_x = ttk.Scrollbar(self.right_frame, orient="horizontal", command=self.txt_preview.xview)
        
        self.txt_preview.configure(yscrollcommand=self.preview_scroll_y.set, xscrollcommand=self.preview_scroll_x.set)
        
        self.preview_scroll_y.pack(side=tk.RIGHT, fill=tk.Y)
        self.preview_scroll_x.pack(side=tk.BOTTOM, fill=tk.X)
        self.txt_preview.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

    def _on_canvas_configure(self, event):
        # dynamic width for scrollable frame
        self.canvas.itemconfig(self.window_id, width=event.width)

    def _bind_shortcuts(self):
        self.bind("<Control-s>", lambda e: self.save_changes())
        self.bind("<Left>", lambda e: self.navigate_previous())
        self.bind("<Right>", lambda e: self.navigate_next())

    def _on_mousewheel(self, event):
        self.canvas.yview_scroll(int(-1*(event.delta/120)), "units")

    def load_file(self):
        filename = filedialog.askopenfilename(
            title="Select JSON File",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if filename:
            self.load_specific_file(filename)
        elif not self.data:
             self.lbl_status.config(text="No file selected")

    def load_specific_file(self, filename):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            error = self.validate_json(data)
            if error:
                messagebox.showerror("Invalid JSON", error)
                if filename == self.last_opened: # If auto-load failed, ask for new file
                     self.load_file()
                return
                
            self.filepath = filename
            self.data = data
            self.current_index = 0
            self.title(f"JSON Editor - {os.path.basename(filename)}")
            
            self.save_config(filename)
            self.display_current_object()
            
        except json.JSONDecodeError:
            messagebox.showerror("Error", "File is not valid JSON.")
        except Exception as e:
            messagebox.showerror("Error", f"Could not load file: {str(e)}")

    def validate_json(self, data):
        if not isinstance(data, list):
            return "Root element must be an array (list) of objects."
        if not data:
            return "JSON array is empty."
        for idx, item in enumerate(data):
            if not isinstance(item, dict):
                return f"Item at index {idx} is not an object."
        return None

    def display_current_object(self):
        # Clear existing fields
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
        self.entry_map = {}
        
        if not self.data:
            return

        obj = self.data[self.current_index]
        
        # Header
        ttk.Label(
            self.scrollable_frame, 
            text=f"Object {self.current_index + 1}", 
            font=("Segoe UI", 12, "bold")
        ).pack(anchor="w", pady=(0, 10), padx=5)
        
        # Build form with recursion
        self._build_form_recursive(obj)
        
        # Update Nav Controls
        self.lbl_status.config(text=f"Object {self.current_index + 1} of {len(self.data)}")
        
        state_prev = "disabled" if self.current_index <= 0 else "!disabled"
        state_next = "disabled" if self.current_index >= len(self.data) -1 else "!disabled"
        
        self.btn_prev.state([state_prev])
        self.btn_next.state([state_next])

        # Initial preview update
        self.update_json_preview()

    def _build_form_recursive(self, current_data, path_ids=None, depth=0):
        if path_ids is None:
            path_ids = []
            
        for key, value in current_data.items():
            current_path = path_ids + [key]
            # Indentation
            indent_px = depth * 20
            
            if isinstance(value, dict):
                 # Header for object
                frame = ttk.Frame(self.scrollable_frame)
                frame.pack(fill=tk.X, pady=2, padx=(indent_px, 0))
                
                ttk.Label(
                    frame, 
                    text=f"{key} {{}}", 
                    font=("Segoe UI", 9, "bold")
                ).pack(anchor="w")
                
                self._build_form_recursive(value, current_path, depth + 1)
            else:
                self._create_field_v2(key, value, current_path, indent_px)
    
    def _create_field_v2(self, key, value, path_keys, indent_px):
        frame = ttk.Frame(self.scrollable_frame)
        frame.pack(fill=tk.X, pady=1, padx=(indent_px, 5))
        
        lbl = ttk.Label(frame, text=key, width=30, anchor="w")
        lbl.pack(side=tk.LEFT)
        
        var = tk.StringVar(value=str(value)) # Convert all to string for Entry
        
        # Add trace for live updates
        var.trace_add("write", lambda *args: self.on_field_change())

        state = "normal"
        if key == "id":
            state = "readonly"
            
        entry = ttk.Entry(frame, textvariable=var, state=state)
        entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        self.entry_map[tuple(path_keys)] = (var, type(value))

    def on_field_change(self):
        # When user types, update underlying data object and refresh preview
        if self._update_memory_from_ui(silent=True):
             self.update_json_preview()

    def update_json_preview(self):
        obj = self.data[self.current_index]
        self.txt_preview.config(state="normal")
        self.txt_preview.delete("1.0", tk.END)
        self.txt_preview.insert("1.0", json.dumps(obj, indent=2))
        self.txt_preview.config(state="disabled")

    def navigate_next(self):
        if self.current_index < len(self.data) - 1:
            if self._update_memory_from_ui():
                self.current_index += 1
                self.display_current_object()

    def navigate_previous(self):
        if self.current_index > 0:
            if self._update_memory_from_ui():
                self.current_index -= 1
                self.display_current_object()

    def _update_memory_from_ui(self, silent=False):
        # Taking values from entry_map and putting them back into self.data[self.current_index]
        obj = self.data[self.current_index]
        
        for path_keys, (var, original_type) in self.entry_map.items():
            # Traverse to the parent of the leaf
            target = obj
            for key in path_keys[:-1]:
                target = target[key]
            
            # The last key is the field to update
            final_key = path_keys[-1]
            raw_value = var.get()
            
            # Type preservation
            try:
                if original_type is bool:
                    if raw_value.lower() == 'true': typed_value = True
                    elif raw_value.lower() == 'false': typed_value = False
                    else: typed_value = bool(raw_value)
                elif original_type is int:
                    try:
                        typed_value = int(raw_value)
                    except ValueError:
                         typed_value = 0 if silent else int(raw_value) # Fallback during typing
                elif original_type is float:
                    try:
                         typed_value = float(raw_value)
                    except ValueError:
                         typed_value = 0.0 if silent else float(raw_value)
                elif original_type is list:
                     # simplistic list eval
                    try:
                        typed_value = json.loads(raw_value.replace("'", '"'))
                    except:
                        typed_value = raw_value # Fallback
                elif original_type is type(None):
                    if raw_value.lower() == 'null': typed_value = None
                    else: typed_value = raw_value
                else:
                    typed_value = raw_value
                    
                target[final_key] = typed_value
            except ValueError:
                # If silent (e.g. typing "12" but curr "1"), don't crash
                # We just let it be. But wait, if we are live updating JSON,
                # we need valid data. If invalid, maybe don't update key?
                # For string-based logic, it is fine.
                if not silent:
                    # Only valid types on full save/navigation?
                    # Actually for live preview we want to see what we type.
                    # Implementing a hybrid: try convert, else keep string.
                    target[final_key] = raw_value 
                else:
                     target[final_key] = raw_value

        return True

    def save_changes(self):
        if not self.filepath:
            return

        if messagebox.askyesno("Confirm Save", "Are you sure you want to overwrite the file?"):
            self._update_memory_from_ui() # Ensure latest
            try:
                with open(self.filepath, 'w', encoding='utf-8') as f:
                    json.dump(self.data, f, indent=2)
                messagebox.showinfo("Success", "File saved successfully!")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save file: {str(e)}")

    def reload_file(self):
        if self.filepath:
            try:
                with open(self.filepath, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
                self.display_current_object()
                messagebox.showinfo("Reloaded", "File reloaded from disk.")
            except Exception as e:
                 messagebox.showerror("Error", f"Failed to reload: {str(e)}")

if __name__ == "__main__":
    app = JSONEditor()
    app.mainloop()
