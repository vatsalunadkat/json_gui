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
        
        self.btn_add_object = ctk.CTkButton(self.nav_right, text="➕ Add Object", command=self.add_new_object, 
                                            width=110, height=32, corner_radius=6,
                                            fg_color=("#8B4513", "#A0522D"), hover_color=("#654321", "#8B4513"))
        self.btn_add_object.pack(side="left", padx=3)
        
        self.btn_copy_last = ctk.CTkButton(self.nav_right, text="📋 Copy Last", command=self.copy_last_object, 
                                            width=110, height=32, corner_radius=6,
                                            fg_color=("#6B4C9A", "#9370DB"), hover_color=("#553D7F", "#7B68EE"))
        self.btn_copy_last.pack(side="left", padx=3)
        
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
        
        # Configure syntax highlighting tags
        self._setup_syntax_highlighting()

    def _setup_syntax_highlighting(self):
        """Configure text tags for JSON syntax highlighting"""
        # Get current appearance mode for colors
        mode = ctk.get_appearance_mode()
        
        if mode == "Dark":
            # VS Code Dark+ theme colors
            bracket_colors = ["#FFD700", "#DA70D6", "#179FFF"]  # Gold, Purple, Blue
            string_color = "#CE9178"
            number_color = "#B5CEA8"
            boolean_color = "#569CD6"
            null_color = "#569CD6"
        else:
            # VS Code Light+ theme colors
            bracket_colors = ["#D4AF37", "#9C27B0", "#0277BD"]  # Dark Gold, Purple, Blue
            string_color = "#A31515"
            number_color = "#098658"
            boolean_color = "#0000FF"
            null_color = "#0000FF"
        
        # Create tags for each nesting level
        for i, color in enumerate(bracket_colors):
            self.txt_preview.tag_config(f"bracket_{i}", foreground=color, font=("Consolas", 11, "bold"))
            self.txt_preview.tag_config(f"key_{i}", foreground=color, font=("Consolas", 11, "bold"))
        
        # Tags for other syntax elements
        self.txt_preview.tag_config("string", foreground=string_color)
        self.txt_preview.tag_config("number", foreground=number_color)
        self.txt_preview.tag_config("boolean", foreground=boolean_color)
        self.txt_preview.tag_config("null", foreground=null_color)

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
        
        # Header with Add button for root level
        header_container = ctk.CTkFrame(self.scrollable_frame, fg_color="transparent", height=40)
        header_container.pack(fill="x", padx=10, pady=(5, 10))
        
        ctk.CTkLabel(
            header_container,
            text=f"Object {self.current_index + 1}",
            font=("Segoe UI", 14, "bold")
        ).pack(side="left")
        
        ctk.CTkButton(
            header_container,
            text="+ Add Property",
            width=120,
            height=28,
            fg_color=("#107C10", "#0F7B0F"),
            hover_color=("#0D5E0D", "#0E6A0E"),
            font=("Segoe UI", 10),
            command=lambda: self.add_property_to_object([])
        ).pack(side="left", padx=15)
        
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
                
                # Add property button for nested objects
                btn_add_prop = ctk.CTkButton(
                    header_container,
                    text="+",
                    width=20,
                    height=24,
                    fg_color=("#107C10", "#0F7B0F"),
                    hover_color=("#0D5E0D", "#0E6A0E"),
                    font=("Segoe UI", 12, "bold"),
                    command=lambda cp=current_path: self.add_property_to_object(cp)
                )
                btn_add_prop.place(x=indent_px + 28 + len(key) * 8 + 30, y=4)
                
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
        json_text = json.dumps(obj, indent=2)
        
        self.txt_preview.delete("1.0", "end")
        self.txt_preview.insert("1.0", json_text)
        
        # Apply syntax highlighting
        self._apply_json_syntax_highlighting(json_text)
    
    def _apply_json_syntax_highlighting(self, json_text):
        """Apply VS Code-style syntax highlighting to JSON text"""
        import re
        
        # Remove all existing tags
        for tag in self.txt_preview.tag_names():
            self.txt_preview.tag_remove(tag, "1.0", "end")
        
        depth = 0
        i = 0
        line = 1
        col = 0
        
        while i < len(json_text):
            char = json_text[i]
            
            # Track line and column for tag placement
            if char == '\n':
                line += 1
                col = 0
                i += 1
                continue
            
            # Handle strings (keys and values)
            if char == '"':
                string_start = i
                i += 1
                while i < len(json_text) and json_text[i] != '"':
                    if json_text[i] == '\\':
                        i += 1  # Skip escaped character
                    i += 1
                i += 1  # Include closing quote
                
                # Check if it's a key (followed by colon)
                j = i
                while j < len(json_text) and json_text[j] in ' \t':
                    j += 1
                
                start_pos = f"{line}.{col}"
                end_pos = f"{line}.{col + (i - string_start)}"
                
                if j < len(json_text) and json_text[j] == ':':
                    # Property key - use nested color
                    tag = f"key_{depth % 3}"
                    self.txt_preview.tag_add(tag, start_pos, end_pos)
                else:
                    # String value
                    self.txt_preview.tag_add("string", start_pos, end_pos)
                
                col += i - string_start
                continue
            
            # Handle opening brackets
            if char in '{[':
                start_pos = f"{line}.{col}"
                end_pos = f"{line}.{col + 1}"
                tag = f"bracket_{depth % 3}"
                self.txt_preview.tag_add(tag, start_pos, end_pos)
                depth += 1
                col += 1
                i += 1
                continue
            
            # Handle closing brackets
            if char in '}]':
                depth -= 1
                start_pos = f"{line}.{col}"
                end_pos = f"{line}.{col + 1}"
                tag = f"bracket_{depth % 3}"
                self.txt_preview.tag_add(tag, start_pos, end_pos)
                col += 1
                i += 1
                continue
            
            # Handle numbers
            if char.isdigit() or (char == '-' and i + 1 < len(json_text) and json_text[i + 1].isdigit()):
                num_start = i
                if char == '-':
                    i += 1
                    col += 1
                while i < len(json_text) and (json_text[i].isdigit() or json_text[i] in '.eE+-'):
                    i += 1
                    col += 1
                
                start_pos = f"{line}.{col - (i - num_start)}"
                end_pos = f"{line}.{col}"
                self.txt_preview.tag_add("number", start_pos, end_pos)
                continue
            
            # Handle booleans and null
            if json_text[i:i+4] == 'true' or json_text[i:i+5] == 'false':
                length = 4 if json_text[i:i+4] == 'true' else 5
                start_pos = f"{line}.{col}"
                end_pos = f"{line}.{col + length}"
                self.txt_preview.tag_add("boolean", start_pos, end_pos)
                i += length
                col += length
                continue
            
            if json_text[i:i+4] == 'null':
                start_pos = f"{line}.{col}"
                end_pos = f"{line}.{col + 4}"
                self.txt_preview.tag_add("null", start_pos, end_pos)
                i += 4
                col += 4
                continue
            
            # Move to next character
            col += 1
            i += 1

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

    def add_new_object(self):
        """Add a new object to the array"""
        if not self.data:
            messagebox.showwarning("No File", "Please load a JSON file first.")
            return
        
        # Create a simple dialog to get the new object structure
        dialog = ctk.CTkToplevel(self)
        dialog.title("Add New Object")
        dialog.geometry("450x280")
        dialog.transient(self)
        dialog.grab_set()
        dialog.resizable(False, False)
        
        ctk.CTkLabel(dialog, text="Enter property name:", font=("Segoe UI", 12)).pack(pady=(20, 5))
        key_entry = ctk.CTkEntry(dialog, width=300)
        key_entry.pack(pady=5)
        
        ctk.CTkLabel(dialog, text="Enter property value:", font=("Segoe UI", 12)).pack(pady=(10, 5))
        value_entry = ctk.CTkEntry(dialog, width=300)
        value_entry.pack(pady=5)
        
        def add_object():
            key = key_entry.get().strip()
            value = value_entry.get().strip()
            
            if not key:
                messagebox.showwarning("Invalid Input", "Property name cannot be empty.")
                return
            
            # Try to parse value as JSON, otherwise treat as string
            try:
                parsed_value = json.loads(value)
            except:
                parsed_value = value
            
            # Create new object with the property
            new_obj = {key: parsed_value}
            self.data.append(new_obj)
            
            # Navigate to the new object
            self.current_index = len(self.data) - 1
            self.display_current_object()
            dialog.destroy()
        btn_frame = ctk.CTkFrame(dialog, fg_color="transparent")
        btn_frame.pack(pady=20, side="bottom")
        
        ctk.CTkButton(btn_frame, text="Add", command=add_object, width=120, height=35,
                      fg_color=("#107C10", "#0F7B0F"), hover_color=("#0D5E0D", "#0E6A0E")).pack(side="left", padx=10)
        ctk.CTkButton(btn_frame, text="Cancel", command=dialog.destroy, width=120, height=35,
                      fg_color=("#6B6B6B", "#4A4A4A"), hover_color=("#5A5A5A", "#5A5A5A")).pack(side="left", padx=10)

    def copy_last_object(self):
        """Create a copy of the last object in the array"""
        if not self.data:
            messagebox.showwarning("No File", "Please load a JSON file first.")
            return
        
        if len(self.data) == 0:
            messagebox.showwarning("Empty Array", "No objects to copy.")
            return
        
        # Deep copy the last object to avoid reference issues
        import copy
        last_object = copy.deepcopy(self.data[-1])
        self.data.append(last_object)
        
        # Navigate to the new copied object
        self.current_index = len(self.data) - 1
        self.display_current_object()
        messagebox.showinfo("Success", f"Copied object {len(self.data) - 1} to create object {len(self.data)}")

    def add_property_to_object(self, path_keys):
        """Add a new property to an existing object"""
        # Create dialog
        dialog = ctk.CTkToplevel(self)
        dialog.title("Add Property")
        dialog.geometry("500x300")
        dialog.transient(self)
        dialog.grab_set()
        dialog.resizable(False, False)
        
        ctk.CTkLabel(dialog, text=f"Add property to: {' → '.join(str(k) for k in path_keys)}", 
                     font=("Segoe UI", 12, "bold")).pack(pady=(20, 10))
        
        ctk.CTkLabel(dialog, text="Property name:", font=("Segoe UI", 11)).pack(pady=(10, 5))
        key_entry = ctk.CTkEntry(dialog, width=400)
        key_entry.pack(pady=5)
        
        ctk.CTkLabel(dialog, text="Property value (or type 'object' for nested object):", 
                     font=("Segoe UI", 11)).pack(pady=(10, 5))
        value_entry = ctk.CTkEntry(dialog, width=400)
        value_entry.pack(pady=5)
        
        def add_property():
            key = key_entry.get().strip()
            value = value_entry.get().strip()
            
            if not key:
                messagebox.showwarning("Invalid Input", "Property name cannot be empty.")
                return
            
            # Navigate to the target object
            obj = self.data[self.current_index]
            for k in path_keys:
                obj = obj[k]
            
            # Check if key already exists
            if key in obj:
                if not messagebox.askyesno("Confirm", f"Property '{key}' already exists. Overwrite?"):
                    return
            
            # Parse value
            if value.lower() == 'object':
                obj[key] = {}
            else:
                try:
                    obj[key] = json.loads(value)
                except:
                    obj[key] = value
            
            self.display_current_object()
            dialog.destroy()
        
        btn_frame = ctk.CTkFrame(dialog, fg_color="transparent")
        btn_frame.pack(pady=20, side="bottom")
        
        ctk.CTkButton(btn_frame, text="Add", command=add_property, width=120, height=35,
                      fg_color=("#107C10", "#0F7B0F"), hover_color=("#0D5E0D", "#0E6A0E")).pack(side="left", padx=10)
        ctk.CTkButton(btn_frame, text="Cancel", command=dialog.destroy, width=120, height=35,
                      fg_color=("#6B6B6B", "#4A4A4A"), hover_color=("#5A5A5A", "#5A5A5A")).pack(side="left", padx=10)

if __name__ == "__main__":
    app = JSONEditor()
    app.mainloop()
