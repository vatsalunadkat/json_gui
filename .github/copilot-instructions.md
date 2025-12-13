# JSON Editor Pro - Copilot Instructions

## Project Overview

A modern GUI application built with **CustomTkinter** for editing JSON files containing arrays of objects. Features a beautiful split-pane interface with dark/light theme support, a form editor on the left, and live JSON preview on the right.

## Architecture

### Core Components

- **`json_editor.py`**: Single-file application (~380 lines) using CustomTkinter framework
- **`json_editor_config.json`**: Persists the last opened file path for auto-loading on restart
- **`test.json`**: Example JSON with nested objects demonstrating expected data structure
- **`requirements.txt`**: Dependencies (customtkinter>=5.2.0, darkdetect, packaging)

### Data Model Requirements

**Critical**: JSON files MUST have this structure:

```json
[
  { "key1": "value1", "nested": { "key2": "value2" } },
  { "key1": "value1", "nested": { "key2": "value2" } }
]
```

- Root must be an array of objects (validated in `validate_json()`)
- Each array element must be a dictionary/object
- Empty arrays or non-object elements will be rejected on load

### UI Architecture

**Modern split-pane design** using CustomTkinter grid layout:

- **Framework**: CustomTkinter 5.2+ with dark/light theme support
- **Layout**: Grid-based responsive design (not pack-based PanedWindow)
- **Left pane**: Card-style `CTkFrame` with `CTkScrollableFrame` for form fields
- **Right pane**: Card-style `CTkFrame` with `CTkTextbox` for JSON preview
- **Navigation bar**: Top bar with custom-styled buttons (colored by action: blue=open, green=save, red=exit)
- **Theme switcher**: `CTkSegmentedButton` with Light/Dark toggle in middle of nav bar

**Form generation** (`_build_form_recursive`):

- Recursively walks object structure to create nested fields
- Uses `grid()` layout with column 0 for labels, column 1 for entries (expandable)
- Nested objects shown with **color-coded visual card headers** (📦 icon, different colors per depth level)
- **VS Code-style indentation guides**: Vertical lines (2px width, #D0D0D0/#404040) showing nesting structure
- **Color palette for nesting**: 5 alternating colors (blue→gray→green→orange→pink) for visual hierarchy
- Nested objects indented by `depth * 20` pixels
- All values converted to strings for `CTkEntry` widgets (height=32px, rounded corners)
- Modern typography: Segoe UI 11pt for fields, 16pt bold for headers

### State Management

- `self.entry_map`: Maps `tuple(path_keys)` → `(CTkStringVar, original_type)`
  - Path tuples like `('widget', 'window', 'width')` for nested access
  - Preserves original type for correct serialization on save
  - Uses CustomTkinter's `CTkStringVar` instead of tkinter's `StringVar`
- `self.data`: List of all objects from JSON file
- `self.current_index`: Index of currently displayed object (0-based)
- `self.entry_map`: Maps `tuple(path_keys)` → `(StringVar, original_type)`
  - Path tuples like `('widget', 'window', 'width')` for nested access
  - Preserves original type for correct serialization on save

**Live update flow**:

1. Entry fields have `StringVar.trace_add("write", ...)` for keystroke detection

### Navigation & Persistence

- Arrow keys (Left/Right) or buttons navigate between array elements
- Ctrl+S saves changes with confirmation dialog
- Auto-saves last opened file path to `json_editor_config.json`
- On startup, auto-loads last file after 100ms delay (`self.after(100, ...)`)
- Theme selection persists across navigation (forces display refresh on theme change)
- Ctrl+S saves changes with confirmation dialog
- Auto-saves last opened file path to `json_editor_config.json`
- On startup, auto-loads last file after 100ms delay (`self.after(100, ...)`)

## Development Patterns

### CustomTkinter Conventions

**Widget naming**:

- Use `ctk.CTk` for main window (not `tk.Tk`)
- Use `ctk.CTkFrame`, `ctk.CTkButton`, `ctk.CTkLabel`, `ctk.CTkEntry`
- Use `ctk.CTkScrollableFrame` for scrollable containers (replaces Canvas+Frame pattern)
- Use `ctk.CTkTextbox` for multiline text (replaces `tk.Text`)

**Theming**:

- Set theme at startup: `ctk.set_appearance_mode("dark")` or `"light"` or `"System"`
- Set color theme: `ctk.set_default_color_theme("blue")` (or "green", "dark-blue")
- Custom colors use tuples: `fg_color=("#light_color", "#dark_color")`

**Layout differences from tkinter**:

- Use `grid()` instead of `pack()` for main layout (more predictable responsive behavior)
- Configure grid weights for responsive resizing: `grid_rowconfigure()`, `grid_columnconfigure()`
- CTkScrollableFrame handles scrolling internally (no manual Canvas configuration needed)

### Type Preservation

When updating from UI (`_update_memory_from_ui`):

```python
if original_type is bool:
    typed_value = True if raw_value.lower() == 'true' else False
elif original_type is int:
    typed_value = int(raw_value)  # with try/except for silent mode
```

**Important**: Lists use `json.loads(raw_value.replace("'", '"'))` for parsingwidth

- Mouse wheel scrolling bound globally to left pane canvas

### File Operations

- Uses UTF-8 encoding explicitly for all file operations
- Adds trailing newline on save: `f.write('\n')`
- Reload discards unsaved changes without warning (by design)

## Running the Application

### Windows

## Extension Points

### Adding Features

- **Custom field widgets**: Modify `_create_field_v2()` to use CTkComboBox, CTkCheckBox, CTkSwitch based on type
- **Validation rules**: Extend `_update_memory_from_ui()` with custom type validation
- **Additional themes**: Extend color palettes in `_build_form_recursive()` for more nesting levels
- **Collapsible sections**: Add expand/collapse buttons to nested object headers
- **JSON syntax highlighting**: Use CTkTextbox tag_config for syntax coloring
- **Export formats**: Add menu button with CTkOptionMenu for format selection
- **Export formats**: Add menu button with CTkOptionMenu for format selection

```bash
python3 json_editor.py
./run_editor.sh               # Requires execute permission
```

## Extension Points

### Adding Features

- **Custom field widgets**: Modify `_create_field_v2()` to use different widgets based on type
- **Validation rules**: Extend `_update_memory_from_ui()` with custom type validation
- **JSON syntax highlighting**: Add tag configuration to `txt_preview` Text widget
- **Export formats**: Add menu item calling new method parallel to `save_changes()`

### Known Limitations

- No undo/redo functionality
- List fields edited as raw JSON strings (not as sub-forms)
- No search/filter capability for large arrays
- Single-level array navigation (no nested array editing)
