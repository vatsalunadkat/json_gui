import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import json
import os
import sys

class JSONEditor(tk.Tk):
    def __init__(self):
        super().__init__()
        
        self.title("JSON Editor")
        self.geometry("800x600")
        
        # Data state
        self.filepath = None
        self.data = []
        self.current_index = 0
        self.entry_map = {} # Maps path string to (entry_widget, original_type)
        
        # Configure UI
        self._setup_ui()
        self._bind_shortcuts()
        
        # Defer file loading slightly to allow window to appear
        self.after(100, self.load_file)

    def _setup_ui(self):
        # Main container with scrolling
        self.main_container = ttk.Frame(self)
        self.main_container.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Canvas for scrolling
        self.canvas = tk.Canvas(self.main_container)
        self.scrollbar = ttk.Scrollbar(self.main_container, orient="vertical", command=self.canvas.yview)
        self.scrollable_frame = ttk.Frame(self.canvas)
        
        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )

        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scrollbar.set)
        
        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")
        
        # Mousewheel scrolling
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel)
        
        # Navigation Bar
        self.nav_frame = ttk.Frame(self)
        self.nav_frame.pack(fill=tk.X, padx=10, pady=10)
        
        self.btn_prev = ttk.Button(self.nav_frame, text="◄", command=self.navigate_previous)
        self.btn_prev.pack(side=tk.LEFT)
        
        self.lbl_status = ttk.Label(self.nav_frame, text="No file loaded")
        self.lbl_status.pack(side=tk.LEFT, padx=20)
        
        self.btn_next = ttk.Button(self.nav_frame, text="►", command=self.navigate_next)
        self.btn_next.pack(side=tk.LEFT)
        
        # Action Buttons
        self.btn_save = ttk.Button(self.nav_frame, text="Save (Ctrl+S)", command=self.save_changes)
        self.btn_save.pack(side=tk.RIGHT)
        
        self.btn_reload = ttk.Button(self.nav_frame, text="Reload", command=self.reload_file)
        self.btn_reload.pack(side=tk.RIGHT, padx=10)
        
        self.btn_open = ttk.Button(self.nav_frame, text="Open File", command=self.load_file)
        self.btn_open.pack(side=tk.RIGHT)

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
        if not filename:
            if not self.data: # If nothing loaded, maybe close or show empty
                self.lbl_status.config(text="No file selected")
            return
            
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            error = self.validate_json(data)
            if error:
                messagebox.showerror("Invalid JSON", error)
                self.load_file() # Allow re-selection
                return
                
            self.filepath = filename
            self.data = data
            self.current_index = 0
            self.title(f"JSON Editor - {os.path.basename(filename)}")
            self.display_current_object()
            
        except json.JSONDecodeError:
            messagebox.showerror("Error", "File is not valid JSON.")
            self.load_file()
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
        ).pack(anchor="w", pady=(0, 10))
        
        # Build form
        self._build_form_recursive(obj)
        
        # Update Nav Controls
        self.lbl_status.config(text=f"Object {self.current_index + 1} of {len(self.data)}")
        
        if self.current_index <= 0:
            self.btn_prev.state(["disabled"])
        else:
            self.btn_prev.state(["!disabled"])
            
        if self.current_index >= len(self.data) - 1:
            self.btn_next.state(["disabled"])
        else:
            self.btn_next.state(["!disabled"])

    def _build_form_recursive(self, current_data, path_prefix=""):
        for key, value in current_data.items():
            full_path = f"{path_prefix} → {key}" if path_prefix else key
            dict_path = f"{path_prefix}.{key}" if path_prefix else key # Used for saving logic if needed, or we just map by ref
            
            if isinstance(value, dict):
                # Header for object
                ttk.Label(
                    self.scrollable_frame, 
                    text=full_path, 
                    font=("Segoe UI", 10, "bold", "underline")
                ).pack(anchor="w", pady=(10, 2))
                self._build_form_recursive(value, full_path)
            elif isinstance(value, list):
                # Simple handling for lists - show as read-only string or just skip? 
                # Requirement says "nested JSON structures to display all properties". 
                # If it's a list of primitives, maybe editable string. If list of objects, it gets complex.
                # Simplification: Convert list to string for editing, user must format correctly.
                self._create_field(key, full_path, value, list_path=dict_path)
            else:
                self._create_field(key, full_path, value, list_path=dict_path)

    def _create_field(self, key, label_text, value, list_path):
        frame = ttk.Frame(self.scrollable_frame)
        frame.pack(fill=tk.X, pady=2)
        
        lbl = ttk.Label(frame, text=label_text, width=40, anchor="w")
        lbl.pack(side=tk.LEFT)
        
        var = tk.StringVar(value=str(value))
        
        # Read-only ID check
        state = "normal"
        if key == "id":
            state = "readonly"
            
        entry = ttk.Entry(frame, textvariable=var, state=state)
        entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Store for saving: (variable, original_type, nested_keys_stack)
        # To reconstruct, we need to know where this value belongs in the object.
        # We can use the 'list_path' split by ' → ' or handle keys from recursion manually?
        # Actually easier: when saving, we can't easily traverse the flattened map back to structure 
        # unless we store reference to parent dict and key.
        # But 'parent dict' changes if we navigate. 
        # So we can store: (key_path_list, original_type, entry_var)
        
        # We need to know the hierarchy. 
        # Let's clean up the pathing logic.
        # Instead of parsing the string label, let's pass the 'keys' chain.
        pass

    # improving recursion to store better path info
    def _build_form_recursive(self, current_data, path_ids=None):
        if path_ids is None:
            path_ids = []
            
        for key, value in current_data.items():
            current_path = path_ids + [key]
            display_path = " → ".join(current_path)
            
            if isinstance(value, dict):
                 # Header for object
                # ttk.Label(
                #     self.scrollable_frame, 
                #     text=display_path, 
                #     font=("Segoe UI", 10, "bold")
                # ).pack(anchor="w", pady=(5, 2))
                self._build_form_recursive(value, current_path)
            else:
                self._create_field_v2(key, display_path, value, current_path)
    
    def _create_field_v2(self, key, label_text, value, path_keys):
        frame = ttk.Frame(self.scrollable_frame)
        frame.pack(fill=tk.X, pady=2)
        
        lbl = ttk.Label(frame, text=label_text, width=50, anchor="w")
        lbl.pack(side=tk.LEFT)
        
        var = tk.StringVar(value=str(value)) # Convert all to string for Entry
        
        state = "normal"
        if key == "id":
            state = "readonly"
            
        entry = ttk.Entry(frame, textvariable=var, state=state)
        entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Store the info needed to save back
        # We use a tuple key of the path for uniqueness
        self.entry_map[tuple(path_keys)] = (var, type(value))

    def navigate_next(self):
        if self.current_index < len(self.data) - 1:
            # We save state before moving
            if self._update_memory_from_ui():
                self.current_index += 1
                self.display_current_object()

    def navigate_previous(self):
        if self.current_index > 0:
            if self._update_memory_from_ui():
                self.current_index -= 1
                self.display_current_object()

    def _update_memory_from_ui(self):
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
                    # simplistic bool parsing
                    if raw_value.lower() == 'true': typed_value = True
                    elif raw_value.lower() == 'false': typed_value = False
                    else: typed_value = bool(raw_value)
                elif original_type is int:
                    typed_value = int(raw_value)
                elif original_type is float:
                    typed_value = float(raw_value)
                elif original_type is list:
                    # simplistic list eval - risky but standard for basic editors
                    # If it was a list in JSON, we printed str(list).
                    # Now we try eval, or fallback to string if valid.
                    # Safety: json.loads might be better than eval
                    try:
                        typed_value = json.loads(raw_value.replace("'", '"'))
                    except:
                        typed_value = raw_value # Fallback
                elif original_type is type(None):
                    if raw_value.lower() == 'null': typed_value = None
                    else: typed_value = raw_value # Changed type
                else:
                    typed_value = raw_value
                    
                target[final_key] = typed_value
            except ValueError:
                # If conversion fails, keep as string or warn? 
                # Requirement: "preserve data types when saving by converting strings back..."
                # If user types "abc" into an int field, it's an error or it becomes string?
                # Let's warn but allow string if conversion fails, or better: suppress and just save as string?
                # "Preserve... where appropriate".
                target[final_key] = raw_value 

        return True

    def save_changes(self):
        # First commit current UI to memory
        self._update_memory_from_ui()
        
        if not self.filepath:
            return

        if messagebox.askyesno("Confirm Save", "Are you sure you want to overwrite the file?"):
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
