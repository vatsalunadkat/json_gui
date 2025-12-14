# JSON Editor Pro

A modern, elegant GUI application for editing JSON files with nested objects. Features a beautiful dark/light theme interface, VS Code-style visual hierarchy, and comprehensive editing capabilities.

**Available in two versions:**

- 🖥️ **Desktop App** - Python/CustomTkinter (full offline functionality)
- 🌐 **Web App** - HTML/CSS/JavaScript (runs in browser, no installation needed)

🌐 **[Try the Web Version](https://vatsalunadkat.github.io/json_gui/)** - No installation required!

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.7+-blue.svg)
![CustomTkinter](https://img.shields.io/badge/CustomTkinter-5.2+-green.svg)

## ✨ Features

### Visual Design

- 🎨 **Interactive Theme Switcher** - Seamlessly toggle between light and dark modes
- 🌈 **VS Code-Style Color-Coded Indentation** - Six distinct colors for nested levels
- 📏 **Visual Hierarchy Guides** - Vertical lines showing nesting structure (like VS Code bracket pairs)
- 💅 **Modern UI with CustomTkinter** - Rounded corners, smooth animations, professional appearance
- 📱 **Responsive Layout** - Adaptive grid-based design that works at any window size

### Editing Capabilities

- ✏️ **Real-time Editing** - Changes sync instantly between form and JSON preview
- ➕ **Add New Objects** - Create new objects in the main array
- ➕ **Add Properties** - Add properties to any object at any nesting level
- 📦 **Nested Object Support** - Full support for deeply nested JSON structures
- 🔽 **Collapsible Sections** - Expand/collapse nested objects with arrow buttons
- 🔄 **Type Preservation** - Maintains correct data types (strings, numbers, booleans, arrays, objects)

### User Experience

- 💾 **Auto-save Configuration** - Remembers last opened file
- ⌨️ **Keyboard Shortcuts** - Ctrl+S to save, Arrow keys to navigate
- 📝 **Split-pane Design** - Form editor on left, live JSON preview on right
- 🔄 **Live Preview** - JSON updates as you type
- ↔️ **Easy Navigation** - Navigate between array objects with Previous/Next buttons

## 🌐 Web Version

**No installation required!** Use the web version directly in your browser:

👉 **[https://vatsalunadkat.github.io/json_gui/](https://vatsalunadkat.github.io/json_gui/)**

### Web Version Features

- ✅ All core editing features (add/edit/delete properties and objects)
- ✅ Dark/light theme support
- ✅ VS Code-style color-coded indentation
- ✅ Collapsible nested sections
- ✅ Copy last object functionality
- ✅ Browser-based file loading (your files stay private - nothing uploaded)
- ✅ Download edited JSON files
- ✅ Auto-saves to browser localStorage
- ✅ Works on mobile and desktop browsers
- ✅ No Python or dependencies required

### Differences from Desktop App

| Feature                 | Desktop                  | Web                              |
| ----------------------- | ------------------------ | -------------------------------- |
| **File editing**        | Direct file modification | Browser-based (download to save) |
| **Auto-load last file** | ✅ Yes                   | ❌ Manual file selection         |
| **Privacy**             | 100% local               | 100% local (no server uploads)   |
| **Installation**        | Python required          | None - just open in browser      |
| **Offline use**         | ✅ Yes                   | ✅ Yes (after first load)        |

## 🖥️ Desktop Installation

For the full-featured desktop application:

```bash
# Clone the repository
git clone https://github.com/vatsalunadkat/json_gui.git
cd json_gui/python_app

# Install dependencies
pip install -r requirements.txt
```

## 📋 Requirements

- Python 3.7 or higher
- CustomTkinter 5.2.0+
- darkdetect
- packaging

## 💻 Usage

### Running the Application

**Windows:**

```bash
pythonw json_editor.py          # Console-less mode (recommended)
# or
python json_editor.py            # With console
# or
run_editor.bat                   # Double-click to launch
```

**Linux/Mac:**

```bash
python3 json_editor.py
# or
./run_editor.sh                  # Requires execute permission
```

### Basic Workflow

1. **Open a JSON File** - Click "📁 Open" or the app will auto-load the last opened file
2. **Navigate Objects** - Use "◄ Previous" / "Next ►" buttons or Arrow keys
3. **Edit Values** - Click any field and type to edit
4. **Add Properties** - Click "+ Add Property" at the top or next to nested objects
5. **Add Objects** - Click "➕ Add Object" to create new objects in the array
6. **Expand/Collapse** - Click ▼/▶ arrows to show/hide nested sections
7. **Switch Themes** - Use the Light/Dark toggle in the navigation bar
8. **Save Changes** - Click "💾 Save" or press Ctrl+S

## 📄 JSON Format

The application expects JSON files with this structure:

```json
[
  {
    "id": 1,
    "name": "Example",
    "nested": {
      "property": "value",
      "deeper": {
        "level": "supported"
      }
    }
  },
  {
    "id": 2,
    "name": "Another Object"
  }
]
```

**Requirements:**

- Root element must be an array `[]`
- Each array element must be an object `{}`
- Supports unlimited nesting depth
- Supports all JSON data types: strings, numbers, booleans, arrays, nested objects

## 🎨 Visual Features Explained

### VS Code-Style Indentation Guides

Each nesting level gets its own colored vertical line:

```
Object 1
  📦 widget (Gold line)
  │   debug: "on"
  │   📦 window (Magenta line)
  │   │   title: "Sample"
  │   │   width: 500
  │   📦 image (Sky Blue line)
  │       src: "image.png"
```

**Color Palette:**

- **Dark Theme:** Gold → Magenta → Deep Sky Blue → Orange → Spring Green → Deep Pink
- **Light Theme:** Blue → Green → Brown → Dark Brown → Red → Purple

### Collapsible Sections

- **▼** - Expanded (showing all nested content)
- **▶** - Collapsed (hiding nested content)
- Click the arrow to toggle
- State persists while navigating between objects

## ⌨️ Keyboard Shortcuts

| Shortcut      | Action          |
| ------------- | --------------- |
| `Ctrl+S`      | Save changes    |
| `Left Arrow`  | Previous object |
| `Right Arrow` | Next object     |

## 🔧 Adding Data

### Add a New Object to Array

1. Click "➕ Add Object" in the top navigation
2. Enter a property name (e.g., `id`)
3. Enter a value (e.g., `3` for number, `"text"` for string, `object` for nested object)
4. Click "Add"

### Copy Last Object

1. Click "📋 Copy Last" button in the navigation bar
2. The last object in the array will be duplicated
3. You'll automatically navigate to the new copy
4. Modify the copied object as needed

**Note**: This creates a deep copy, so changes to the new object won't affect the original.

### Add Property to Existing Object

1. Click "+ Add Property" button (top of form or next to nested objects)
2. Enter property name
3. Enter value:
   - Plain text: `Hello World` or `"Hello World"`
   - Number: `42` or `3.14`
   - Boolean: `true` or `false`
   - Array: `[1, 2, 3]` or `["a", "b", "c"]`
   - Nested object: `object` or `{}`
   - JSON: `{"key": "value"}`
4. Click "Add"

## 🎯 Use Cases

- **Configuration Files** - Edit app settings, game configs, API responses
- **Data Management** - Manage structured data collections
- **Testing** - Create and modify test data sets
- **Learning** - Understand JSON structure with visual hierarchy
- **Quick Edits** - Faster than text editors for structured JSON

## 🚀 Deploying Your Own Web Version

Want to host your own copy of the web version on GitHub Pages?

### Step 1: Push to GitHub

```bash
git add index.html styles.css app.js .nojekyll
git commit -m "Add web version"
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**

### Step 3: Access Your Site

After 1-2 minutes, your site will be live at:

```
https://<your-username>.github.io/<repository-name>/
```

Example: `https://vatsalunadkat.github.io/json_gui/`

### Files Needed for Web Version

- `index.html` - Main HTML structure
- `styles.css` - All styling and theming
- `app.js` - JavaScript application logic
- `.nojekyll` - Tells GitHub Pages not to process with Jekyll

**Note**: The Python desktop app (`json_editor.py`) and web version work independently. You can use both!
