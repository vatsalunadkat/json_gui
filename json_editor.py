import customtkinter as ctk
from tkinter import filedialog, messagebox
import json
import os
import sys

CONFIG_FILE = "json_editor_config.json"

# Set appearance and color theme
ctk.set_appearance_mode("dark")  # Modes: "System" (default), "Dark", "Light"
ctk.set_default_color_theme("blue")  # Themes: "blue" (default), "green", "dark-blue"

class JSONEditor(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("JSON Editor Pro")
        self.geometry("1200x800")
        
        # Configure grid weight for responsive layout
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)
        
        # Data state
        self.filepath = None
        self.data = []
        self.current_index = 0
        self.entry_map = {} # Maps path tuple to (entry_widget_var, original_type)
        self.collapsed_sections = set()  # Track which sections are collapsed
        
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
        # Navigation Bar (Top) with modern styling
        self.nav_frame = ctk.CTkFrame(self, corner_radius=0, fg_color=("#E8E8E8", "#1a1a1a"))
        self.nav_frame.grid(row=0, column=0, sticky="ew", padx=0, pady=0)
        
        # Left section: Navigation
        self.nav_left = ctk.CTkFrame(self.nav_frame, fg_color="transparent")
        self.nav_left.pack(side="left", padx=15, pady=12)
        
        self.btn_prev = ctk.CTkButton(self.nav_left, text="◄ Previous", command=self.navigate_previous, 
                                       width=100, height=32, corner_radius=6)
        self.btn_prev.pack(side="left", padx=(0, 10))
        
        self.lbl_status = ctk.CTkLabel(self.nav_left, text="No file loaded", 
                                        font=("Segoe UI", 13, "bold"))
        self.lbl_status.pack(side="left", padx=15)
        
        self.btn_next = ctk.CTkButton(self.nav_left, text="Next ►", command=self.navigate_next, 
                                       width=100, height=32, corner_radius=6)
        self.btn_next.pack(side="left", padx=(10, 0))
        
        # Middle section: Theme switcher
        self.nav_middle = ctk.CTkFrame(self.nav_frame, fg_color="transparent")
        self.nav_middle.pack(side="left", padx=20, pady=12)
        
        ctk.CTkLabel(self.nav_middle, text="🎨", font=("Segoe UI", 14)).pack(side="left", padx=(0, 5))
        
        self.theme_var = ctk.StringVar(value="Dark")
        self.theme_selector = ctk.CTkSegmentedButton(
            self.nav_middle,
            values=["Light", "Dark"],
            variable=self.theme_var,
            command=self.change_theme,
            width=140,
            height=28,
            corner_radius=6
        )
        self.theme_selector.pack(side="left")
        
        # Right section: Action Buttons
        self.nav_right = ctk.CTkFrame(self.nav_frame, fg_color="transparent")
        self.nav_right.pack(side="right", padx=15, pady=12)
        
        self.btn_open = ctk.CTkButton(self.nav_right, text="📁 Open", command=self.load_file, 
                                       width=90, height=32, corner_radius=6, 
                                       fg_color=("#0078D4", "#0078D4"), hover_color=("#005A9E", "#106EBE"))
        self.btn_open.pack(side="left", padx=3)
        
        self.btn_reload = ctk.CTkButton(self.nav_right, text="🔄 Reload", command=self.reload_file, 
                                         width=90, height=32, corner_radius=6,
                                         fg_color=("#6B6B6B", "#4A4A4A"), hover_color=("#5A5A5A", "#5A5A5A"))
        self.btn_reload.pack(side="left", padx=3)
        
        self.btn_save = ctk.CTkButton(self.nav_right, text="💾 Save", command=self.save_changes, 
                                       width=90, height=32, corner_radius=6,
                                       fg_color=("#107C10", "#0F7B0F"), hover_color=("#0D5E0D", "#0E6A0E"))
        self.btn_save.pack(side="left", padx=3)
        
        self.btn_exit = ctk.CTkButton(self.nav_right, text="✕", command=self.quit, 
                                       width=40, height=32, corner_radius=6,
                                       fg_color=("#E81123", "#C42B1C"), hover_color=("#C50F1F", "#A21025"))
        self.btn_exit.pack(side="left", padx=(3, 0))

        # Main Content Frame with padding
        self.main_container = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.main_container.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)
        self.main_container.grid_columnconfigure(0, weight=1)
        self.main_container.grid_columnconfigure(1, weight=1)
        self.main_container.grid_rowconfigure(0, weight=1)

        # LEFT PANE: Form Editor with modern card design
        self.left_pane = ctk.CTkFrame(self.main_container, corner_radius=12)
        self.left_pane.grid(row=0, column=0, sticky="nsew", padx=(0, 5))
        self.left_pane.grid_rowconfigure(1, weight=1)
        self.left_pane.grid_columnconfigure(0, weight=1)
        
        # Left pane header
        self.left_header = ctk.CTkLabel(self.left_pane, text="📝 Form Editor", 
                                         font=("Segoe UI", 16, "bold"), anchor="w")
        self.left_header.grid(row=0, column=0, sticky="ew", padx=20, pady=(15, 10))
        
        # Scrollable frame for form fields
        self.scrollable_frame = ctk.CTkScrollableFrame(self.left_pane, corner_radius=0, 
                                                        fg_color="transparent")
        self.scrollable_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 10))
        self.scrollable_frame.grid_columnconfigure(0, weight=1)

        # RIGHT PANE: JSON Preview with modern card design
        self.right_pane = ctk.CTkFrame(self.main_container, corner_radius=12)
        self.right_pane.grid(row=0, column=1, sticky="nsew", padx=(5, 0))
        self.right_pane.grid_rowconfigure(1, weight=1)
        self.right_pane.grid_columnconfigure(0, weight=1)
        
        # Right pane header
        self.right_header = ctk.CTkLabel(self.right_pane, text="📄 JSON Preview", 
                                          font=("Segoe UI", 16, "bold"), anchor="w")
        self.right_header.grid(row=0, column=0, sticky="ew", padx=20, pady=(15, 10))
        
        # JSON preview text box
        self.txt_preview = ctk.CTkTextbox(self.right_pane, wrap="none", 
                                           font=("Consolas", 11), 
                                           corner_radius=8,
                                           border_width=0)
        self.txt_preview.grid(row=1, column=0, sticky="nsew", padx=15, pady=(0, 15))

    def _bind_shortcuts(self):
        self.bind("<Control-s>", lambda e: self.save_changes())
        self.bind("<Left>", lambda e: self.navigate_previous())
        self.bind("<Right>", lambda e: self.navigate_next())

    def change_theme(self, choice):
        """Switch between light and dark themes"""
        ctk.set_appearance_mode(choice.lower())
        # Force refresh of the current display to update colors
        if self.data:
            self.display_current_object()

    def load_file(self):
        filename = filedialog.askopenfilename(
            title="Select JSON File",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if filename:
            self.load_specific_file(filename)
        elif not self.data:
             self.lbl_status.configure(text="No file selected")

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
            self.title(f"JSON Editor Pro - {os.path.basename(filename)}")
            
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
        
        # Container for the grid form
        self.form_frame = ctk.CTkFrame(self.scrollable_frame, fg_color="transparent")
        self.form_frame.pack(fill="both", expand=True, padx=10, pady=5)
        self.form_frame.grid_columnconfigure(1, weight=1)  # Make entry column expandable
        
        # Build form with recursion using Grid
        self._build_form_recursive(obj, row_index=0)
        
        # Update Nav Controls
        self.lbl_status.configure(text=f"Object {self.current_index + 1} of {len(self.data)}")
        
        # Enable/disable navigation buttons
        if self.current_index <= 0:
            self.btn_prev.configure(state="disabled")
        else:
            self.btn_prev.configure(state="normal")
            
        if self.current_index >= len(self.data) - 1:
            self.btn_next.configure(state="disabled")
        else:
            self.btn_next.configure(state="normal")

        # Initial preview update
        self.update_json_preview()

    def _build_form_recursive(self, current_data, path_ids=None, depth=0, row_index=0):
        if path_ids is None:
            path_ids = []
        
        # VS Code bracket pair colorization colors
        # (light_theme_color, dark_theme_color)
        indent_colors = [
            ("#0431FA", "#FFD700"),  # Blue / Gold
            ("#319331", "#DA70D6"),  # Green / Magenta
            ("#9E5300", "#00BFFF"),  # Brown / Deep Sky Blue
            ("#7B3814", "#FFA500"),  # Dark Brown / Orange
            ("#B52E31", "#00FA9A"),  # Red / Medium Spring Green
            ("#7F3E96", "#FF1493")   # Purple / Deep Pink
        ]
        
        for key, value in current_data.items():
            current_path = path_ids + [key]
            path_str = ".".join(str(p) for p in current_path)
            indent_px = depth * 30
            
            if isinstance(value, dict):
                # Check if this section is collapsed
                is_collapsed = path_str in self.collapsed_sections
                
                # Create header frame with expand/collapse button
                header_container = ctk.CTkFrame(self.form_frame, fg_color="transparent", height=32)
                header_container.grid(row=row_index, column=0, columnspan=2, sticky="ew", pady=(4, 2))
                header_container.grid_propagate(False)  # Prevent container from resizing
                
                # Draw vertical indent guides for all parent levels
                for parent_depth in range(depth):
                    color_idx = parent_depth % len(indent_colors)
                    line_x = parent_depth * 30 + 15
                    guide = ctk.CTkFrame(header_container, 
                                        fg_color=indent_colors[color_idx],
                                        width=2, height=32)
                    guide.place(x=line_x, y=0)
                
                # Expand/collapse button
                arrow = "▶" if is_collapsed else "▼"
                btn_expand = ctk.CTkButton(
                    header_container,
                    text=arrow,
                    width=20,
                    height=24,
                    fg_color="transparent",
                    text_color=("#555555", "#AAAAAA"),
                    hover_color=("#DDDDDD", "#333333"),
                    font=("Segoe UI", 10),
                    command=lambda p=path_str: self.toggle_collapse(p)
                )
                btn_expand.place(x=indent_px, y=4)
                
                # Header label with colored text
                color_idx = depth % len(indent_colors)
                header_label = ctk.CTkLabel(
                    header_container,
                    text=f"📦 {key}",
                    font=("Segoe UI", 11, "bold"),
                    text_color=indent_colors[color_idx],
                    anchor="w"
                )
                header_label.place(x=indent_px + 28, y=6)
                
                row_index += 1
                
                # Only show nested content if not collapsed
                if not is_collapsed:
                    row_index = self._build_form_recursive(value, current_path, depth + 1, row_index)
            else:
                self._create_field_v2(key, value, current_path, indent_px, row_index, depth)
                row_index += 1
        return row_index
    
    def toggle_collapse(self, path_str):
        """Toggle collapse/expand state of a section"""
        if path_str in self.collapsed_sections:
            self.collapsed_sections.remove(path_str)
        else:
            self.collapsed_sections.add(path_str)
        # Refresh the display
        self.display_current_object()
    
    def _create_field_v2(self, key, value, path_keys, indent_px, row_index, depth=0):
        # VS Code bracket pair colorization colors (light_theme_color, dark_theme_color)
        indent_colors = [
            ("#0431FA", "#FFD700"),  # Blue / Gold
            ("#319331", "#DA70D6"),  # Green / Magenta
            ("#9E5300", "#00BFFF"),  # Brown / Deep Sky Blue
            ("#7B3814", "#FFA500"),  # Dark Brown / Orange
            ("#B52E31", "#00FA9A"),  # Red / Medium Spring Green
            ("#7F3E96", "#FF1493")   # Purple / Deep Pink
        ]
        
        # Create a container frame for the field row
        field_container = ctk.CTkFrame(self.form_frame, fg_color="transparent", height=42)
        field_container.grid(row=row_index, column=0, columnspan=2, sticky="ew", pady=1)
        field_container.grid_propagate(False)  # Prevent container from expanding
        field_container.grid_columnconfigure(1, weight=1)
        
        # Draw vertical indent guides for all parent levels
        for parent_depth in range(depth):
            color_idx = parent_depth % len(indent_colors)
            line_x = parent_depth * 30 + 15
            guide = ctk.CTkFrame(field_container, 
                                fg_color=indent_colors[color_idx],
                                width=2, height=42)
            guide.place(x=line_x, y=0)
        
        # Modern label with better typography
        lbl = ctk.CTkLabel(field_container, text=key, anchor="w", 
                            font=("Segoe UI", 11), 
                            text_color=("#555555", "#CCCCCC"))
        lbl.grid(row=0, column=0, sticky="w", padx=(indent_px + 10, 15), pady=5)
        
        var = ctk.StringVar(value=str(value))  # Convert all to string for Entry
        
        # Add trace for live updates
        var.trace_add("write", lambda *args: self.on_field_change())
        
        # Modern entry field with rounded corners
        entry = ctk.CTkEntry(field_container, textvariable=var, 
                              height=32, corner_radius=6,
                              border_width=1,
                              font=("Segoe UI", 11))
        entry.grid(row=0, column=1, sticky="ew", padx=(0, 10), pady=5)
        
        self.entry_map[tuple(path_keys)] = (var, type(value))

    def on_field_change(self):
        # When user types, update underlying data object and refresh preview
        if self._update_memory_from_ui(silent=True):
             self.update_json_preview()

    def update_json_preview(self):
        obj = self.data[self.current_index]
        self.txt_preview.delete("1.0", "end")
        self.txt_preview.insert("1.0", json.dumps(obj, indent=2))

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
                    f.write('\n') # Ensure trailing newline
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
