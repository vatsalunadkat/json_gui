# New Features: Theme Switcher & Enhanced Nested Visualization

## 1. Theme Switcher 🎨

### Implementation

Added a `CTkSegmentedButton` in the navigation bar that allows users to toggle between Light and Dark themes.

**Location**: Center of the top navigation bar, between navigation controls and action buttons

**Features**:

- 🎨 Emoji icon for quick recognition
- Two-button toggle: "Light" | "Dark"
- Width: 140px, Height: 28px
- Smooth transition between themes
- Auto-refreshes the current view to apply theme changes immediately

**Code Pattern**:

```python
self.theme_var = ctk.StringVar(value="Dark")
self.theme_selector = ctk.CTkSegmentedButton(
    self.nav_middle,
    values=["Light", "Dark"],
    variable=self.theme_var,
    command=self.change_theme
)

def change_theme(self, choice):
    ctk.set_appearance_mode(choice.lower())
    if self.data:
        self.display_current_object()  # Refresh to apply colors
```

## 2. Color-Coded Nested Layers 🌈

### Color Palettes

Different colors for each nesting depth level to improve visual hierarchy:

**Light Mode Colors**:

- Level 0: `#2C5282` (Blue)
- Level 1: `#2D3748` (Gray)
- Level 2: `#2F855A` (Green)
- Level 3: `#744210` (Orange)
- Level 4: `#702459` (Pink)

**Dark Mode Colors**:

- Level 0: `#63B3ED` (Light Blue)
- Level 1: `#A0AEC0` (Light Gray)
- Level 2: `#68D391` (Light Green)
- Level 3: `#F6AD55` (Light Orange)
- Level 4: `#F687B3` (Light Pink)

### Implementation

```python
level_colors_light = ["#2C5282", "#2D3748", "#2F855A", "#744210", "#702459"]
level_colors_dark = ["#63B3ED", "#A0AEC0", "#68D391", "#F6AD55", "#F687B3"]

color_idx = depth % len(level_colors_light)
header_color_light = level_colors_light[color_idx]
header_color_dark = level_colors_dark[color_idx]

ctk.CTkLabel(
    header_frame,
    text=f"📦 {key}",
    text_color=(header_color_light, header_color_dark)
)
```

### Benefits

- **Quick depth recognition**: Instantly see how deeply nested an object is
- **Visual grouping**: Related nested items share the same color
- **Reduced cognitive load**: Colors cycle every 5 levels for consistency

## 3. VS Code-Style Indentation Guides 📏

### Visual Design

Vertical lines showing where nested elements start and end, similar to VS Code's editor.

**Specifications**:

- Width: 2px
- Colors: `#D0D0D0` (light mode) / `#404040` (dark mode)
- Position: 10px to the left of each nested item's indentation
- Height: Spans the full height of each form field row

### Implementation

```python
if depth > 0:
    guide_frame = ctk.CTkFrame(
        self.form_frame,
        fg_color=("#D0D0D0", "#404040"),
        width=2
    )
    guide_frame.grid(row=row_index, column=0, sticky="ns",
                      padx=(indent_px - 10, 0), pady=0)
```

### Benefits

- **Clear nesting structure**: Easy to see where nested blocks begin and end
- **Professional appearance**: Matches familiar VS Code interface patterns
- **Improved readability**: Vertical guides help trace nested relationships
- **Subtle design**: Doesn't distract from content but provides helpful context

## Combined Effect

When both features work together:

1. **Theme switcher** lets users choose their preferred visual mode
2. **Color-coded headers** provide hierarchy at a glance
3. **Indentation guides** show structural relationships

Example nested structure visualization:

```
📦 widget (Blue)
│   debug: "on"
│   📦 window (Gray)
│   │   title: "Sample"
│   │   width: 500
│   📦 image (Gray)
│   │   src: "Images/Sun.png"
│   │   📦 properties (Green)
│   │   │   hOffset: 250
│   │   │   vOffset: 250
```

## User Experience Improvements

1. **Accessibility**: Users can choose light theme for bright environments or dark for low-light
2. **Visual Hierarchy**: Nested objects are immediately distinguishable by color
3. **Structure Clarity**: Indentation guides make complex nested JSON easy to navigate
4. **Consistency**: Follows familiar patterns from popular code editors

## Technical Notes

- Theme change triggers `display_current_object()` to refresh colors
- Color palettes cycle using modulo operator: `depth % len(colors)`
- Indentation guides use `sticky="ns"` to span full row height
- Both features work seamlessly with existing form generation logic
