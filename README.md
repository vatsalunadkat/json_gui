# JSON Object Editor (Joe)

A modern, elegant web-based JSON editor for editing JSON files containing **arrays of objects**. Features a beautiful Material Design 3 inspired interface, VS Code-style visual hierarchy, and an innovative object-by-object editing approach with smart array visualization.

🌐 **[Launch Joe in Your Browser](https://vatsalunadkat.github.io/json_gui/)** - No installation required!

**Available in two versions:**

- 🌐 **Web App** (Primary) - HTML/CSS/JavaScript - runs in any modern browser
- 🖥️ **Python App** (Backup) - Python/CustomTkinter - offline desktop version

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.7+-blue.svg)
![CustomTkinter](https://img.shields.io/badge/CustomTkinter-5.2+-green.svg)

---

## 📸 Visual Highlights

### Object-by-Object Editing

Navigate through large JSON arrays one object at a time with clear position tracking and easy Previous/Next navigation.

### Smart Tag-Style Arrays

Primitive arrays display as horizontal, editable tags with click-to-add and hover-to-delete functionality - no more quote hell!

### VS Code-Style Visual Hierarchy

Color-coded vertical indentation guides (Gold → Purple → Blue) make deeply nested structures easy to understand at a glance.

### Material Design 3 Interface

Beautiful pastel buttons, smooth animations, and seamless dark/light theme switching for a modern editing experience.

---

## 🎯 Core Features

### Object-by-Object Editing (Our Signature Feature!)

Unlike traditional JSON editors that show the entire file structure, **Joe** focuses on **one object at a time**:

- 📋 **Clean, Focused Editing** - Edit individual objects without distraction from hundreds of other entries
- 🎯 **Perfect for Large Arrays** - Navigate through arrays of 10, 100, or 1000+ objects with ease
- ⬅️➡️ **Intuitive Navigation** - Simple Previous/Next buttons to move between objects
- 📍 **Position Tracking** - Always know where you are with "Object X of Y" counter
- 🔄 **Auto-sync Preview** - See the complete JSON structure updating live in the right pane

**Why This Matters:**  
When working with JSON files containing arrays of similar objects (configs, database exports, API responses), traditional editors become overwhelming. Our object-by-object approach makes editing **100+ objects** as easy as editing 5.

### Smart Tag-Style Array Display (Unique Innovation!)

Property values that are **primitive arrays** (lists of strings, numbers, or booleans) are displayed in a revolutionary **horizontal tag format**:

- 🏷️ **Horizontal Tag Layout** - Arrays like `["google", "facebook", "email"]` display as editable tags side-by-side
- ➕ **Click-to-Add** - Add new items with a single click on the "+" button
- ❌ **Hover-to-Delete** - Remove items by hovering and clicking the "×" button
- 📏 **Auto-sizing Inputs** - Each tag automatically adjusts width based on content
- 🎨 **Visual Grouping** - See all array items at a glance without scrolling

**Example:**

```json
"providers": ["google", "facebook", "email"]
```

Displays as: `[google] [facebook] [email] [+]` with inline editing!

### Visual Design & Material Design 3

- 🎨 **Material Design 3** - Modern color system with beautiful pastels and smooth transitions
- 🌓 **Seamless Theme Switching** - Toggle between light and dark modes instantly
- 🌈 **VS Code-Style Color-Coded Nesting** - Gold → Purple → Blue cycling colors for nested levels
- 📏 **Vertical Indentation Guides** - Visual lines showing nesting structure (like VS Code bracket pairs)
- 🎭 **Material Icons** - Google's Material Symbols throughout the UI
- 💅 **Smooth Animations** - Dialog fade-ins, button hover effects, collapsible sections

### Advanced Editing Capabilities

- ✏️ **Live Editing** - Changes sync instantly between form and JSON preview (with debouncing)
- 📦 **Deep Nesting Support** - Edit objects nested 10+ levels deep with visual guides
- 🔽 **Collapsible Sections** - Expand/collapse nested objects to manage complexity
- ➕ **Add Properties Anywhere** - Add properties to root objects or deeply nested objects
- 🗑️ **Delete Properties** - Remove unwanted properties with a simple dialog
- ➕ **Add/Copy Objects** - Create new objects or duplicate the last one
- 🔄 **Type Preservation** - Automatically maintains strings, numbers, booleans, arrays, and nested objects

### User Experience

- 💾 **Auto-save Configuration** - Desktop app remembers your last opened file
- ⌨️ **Keyboard Shortcuts** - Ctrl+S to save, ← → to navigate between objects
- 📝 **Split-pane Design** - Form editor on left, live JSON preview on right (resizable)
- 🔍 **Font Size Controls** - Adjust text size for better readability
- 📱 **Fully Responsive** - Works on desktop, tablet, and mobile browsers

## 🌐 Web Version

**No installation required!** Use the web version directly in your browser:

👉 **[https://vatsalunadkat.github.io/json_gui/](https://vatsalunadkat.github.io/json_gui/)**

### Web Version Features

- ✅ **All Core Features** - Object-by-object editing, smart tag arrays, live preview
- ✅ **Material Design 3 UI** - Beautiful pastel buttons, smooth animations, modern icons
- ✅ **Dark/Light Theme** - Seamless theme switching with Material color system
- ✅ **Smart Array Display** - Horizontal tag-style editing for primitive arrays
- ✅ **Collapsible Nested Sections** - Manage complex JSON structures with ease
- ✅ **Live Editable Preview** - Right pane allows direct JSON editing with validation
- ✅ **Browser-Based** - Your files stay 100% private, nothing uploaded to servers
- ✅ **Download Edited Files** - Save your changes as JSON files
- ✅ **LocalStorage Auto-save** - Never lose your work between sessions
- ✅ **Works Everywhere** - Desktop, tablet, and mobile browsers
- ✅ **Zero Dependencies** - No Python, Node.js, or installations needed

### Desktop vs Web Comparison

| Feature                  | Desktop (Python)                   | Web (Browser)                             |
| ------------------------ | ---------------------------------- | ----------------------------------------- |
| **Core Editing**         | ✅ Object-by-object + Smart Arrays | ✅ Object-by-object + Smart Arrays        |
| **UI Framework**         | CustomTkinter                      | Material Design 3 + Material Icons        |
| **Theme Support**        | ✅ Dark/Light                      | ✅ Dark/Light (MD3 color system)          |
| **File Editing**         | Direct file modification           | Browser-based (download to save)          |
| **Auto-load Last File**  | ✅ Yes                             | ❌ Manual file selection                  |
| **Live Preview Editing** | ❌ Read-only                       | ✅ Fully editable with validation         |
| **Font Size Adjustment** | Partial support                    | ✅ Full A+/A- controls                    |
| **Privacy**              | 100% local                         | 100% local (no server communication)      |
| **Installation**         | Python + dependencies required     | None - just open index.html               |
| **Offline Use**          | ✅ Yes                             | ✅ Yes (after first page load)            |
| **Best For**             | Power users, automated workflows   | Quick edits, cross-platform compatibility |

## 🖥️ Desktop Installation

For the full-featured desktop application with direct file editing:

```bash
# Clone the repository
git clone https://github.com/vatsalunadkat/json_gui.git
cd json_gui/python_app

# Install dependencies
pip install -r requirements.txt
```

## 📋 Requirements (Desktop Only)

- Python 3.7 or higher
- CustomTkinter 5.2.0+
- darkdetect
- packaging

## 💻 Usage

### Running the Desktop Application

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

1. **Open a JSON File** - Click "Open" button or drag & drop (desktop auto-loads last file)
2. **Navigate Objects** - Use Previous/Next navigation arrows or ← → keys
3. **Edit Values** - Click any field and type to edit (changes sync live to preview)
4. **Edit Arrays** - Primitive arrays display as horizontal tags with +/× buttons
5. **Add Properties** - Click "Add Property" at header or on nested object cards
6. **Add Objects** - Click "Add Object" to insert new objects into the array
7. **Expand/Collapse** - Click arrow icons on nested sections to manage complexity
8. **Switch Themes** - Toggle Light/Dark mode for your preferred visual style
9. **Adjust Font Size** - Use A+/A- controls for better readability
10. **Save Changes** - Desktop: Ctrl+S overwrites file | Web: Download button

## 📄 Required JSON Format

**JSON Editor Pro** is specifically designed for JSON files with the following structure:

```json
[
  {
    "id": "app_001",
    "name": "E-Commerce Platform",
    "version": "2.5.3",
    "active": true,
    "tags": ["production", "critical", "monitored"],
    "configuration": {
      "server": {
        "host": "api.example.com",
        "port": 8443,
        "endpoints": {
          "users": "/api/v2/users",
          "products": "/api/v2/products"
        }
      },
      "features": {
        "authentication": {
          "enabled": true,
          "providers": ["google", "facebook", "email"],
          "twoFactor": true
        }
      }
    }
  },
  {
    "id": "app_002",
    "name": "Another Application"
  }
]
```

**Strict Requirements:**

- ✅ **Root must be an array** `[]` (not an object)
- ✅ **Each array element must be an object** `{}` (no primitive array items)
- ✅ **Nested objects** supported at any depth
- ✅ **Primitive arrays as properties** displayed with smart tag-style UI
- ✅ **All JSON types** supported: strings, numbers, booleans, arrays, null, nested objects

**Perfect For:**

- API response collections
- Configuration file sets
- Database exports
- Test data fixtures
- Multi-environment configs
- Product catalogs
- User records

**Not Suitable For:**

- Single object files: `{"key": "value"}` (wrap in array: `[{"key": "value"}]`)
- Primitive arrays: `[1, 2, 3]` or `["a", "b", "c"]` (wrap in objects: `[{"values": [1, 2, 3]}]`)
- Mixed type arrays: `[{"id": 1}, "string", 123]`

## 🎨 Visual Features Explained

### VS Code-Style Indentation Guides

Each nesting level gets its own colored vertical line and icon:

```
Object 1
  📦 configuration (Gold line)
  │   timeout: 30000
  │   📦 server (Purple line)
  │   │   host: "api.example.com"
  │   │   port: 8443
  │   │   📦 endpoints (Blue line)
  │   │   │   users: "/api/v2/users"
  │   │   │   products: "/api/v2/products"
```

**Color Cycling (3 colors repeat):**

- **Level 0:** Gold / Purple Blue → **Level 1:** Purple / Dark Purple → **Level 2:** Blue / Darker Blue
- Pattern repeats for levels 3+

**Benefits:**

- Instantly see nesting depth
- Trace parent-child relationships
- Match nested brackets visually
- Reduces cognitive load for complex structures

### Smart Tag-Style Array Display

When a property value is a **primitive array** (list of strings/numbers/booleans):

**Traditional JSON:**

```json
"providers": ["google", "facebook", "email", "apple"]
```

**JSON Editor Pro Display:**

```
providers: [google] [facebook] [email] [apple] [+]
           ↑ editable tags with hover-delete
```

- Each item is an inline input that auto-sizes
- Hover over a tag to reveal the "×" delete button
- Click "+" to add new items instantly
- No nested array editor needed - everything is inline!

### Collapsible Sections

- **expand_more** icon - Expanded (showing all nested content)
- **chevron_right** icon - Collapsed (hiding nested content)
- Click the header to toggle visibility
- State persists while navigating between objects
- Empty objects show "(empty)" indicator

## ⌨️ Keyboard Shortcuts

| Shortcut      | Action          |
| ------------- | --------------- |
| `Ctrl+S`      | Save changes    |
| `Left Arrow`  | Previous object |
| `Right Arrow` | Next object     |

## 🔧 Editing Operations

### Add a New Object to Array

**Desktop & Web:**

1. Click "Add Object" button (green pastel button in top navigation)
2. In the dialog, enter initial property name (e.g., `id`, `name`)
3. Enter the value:
   - **Number**: `42` or `3.14`
   - **String**: `"text"` or just `text`
   - **Boolean**: `true` or `false`
   - **Array**: `[1, 2, 3]` or `["a", "b"]`
   - **Nested Object**: `object` or `{}` or `{"key": "value"}`
4. Click "Add" button

The new object is added to the end of the array and you're automatically navigated to it.

### Copy Last Object

**Quick way to create similar objects:**

1. Click "Copy Last" button (purple pastel button in navigation)
2. The last object in the array is deep-copied
3. You're automatically moved to the new copy
4. Edit the duplicated values as needed

**Use Case:** When adding 20 similar configuration objects, copy one and just change specific fields!

### Add Property to Existing Object

**Add properties at any nesting level:**

1. Click "Add Property" button:
   - Top header button → adds to root object
   - "+" button on nested object header → adds to that nested object
2. Dialog shows target path (e.g., `Adding to: configuration.server`)
3. Enter property name (e.g., `timeout`)
4. Enter value using same format as "Add Object"
5. Click "Add"

**Property Value Formats:**

| Type           | Example Input                                   |
| -------------- | ----------------------------------------------- |
| String         | `Hello World` or `"Hello World"`                |
| Number         | `42`, `3.14`, `-10`                             |
| Boolean        | `true`, `false`                                 |
| Null           | `null`                                          |
| Simple Array   | `[1, 2, 3]`, `["red", "blue"]`, `[true, false]` |
| Object         | `object` or `{}` (creates empty) or `{"a": 1}`  |
| Complex Object | `{"name": "John", "age": 30, "tags": ["dev"]}`  |

### Delete Property

**Desktop & Web:**

1. Click "Delete Property" button (red pastel button in header)
2. Dialog shows list of all properties in current object
3. Select property to delete (shows full path for nested properties)
4. Confirm deletion

### Delete Object

**Desktop & Web:**

1. Click "Delete" button (red pastel button in top navigation)
2. Confirm deletion dialog
3. Current object is removed from array
4. You're navigated to previous object (or next if deleting first)

### Edit Array Values (Smart Tags)

**For primitive arrays** (like `["google", "facebook", "email"]`):

1. Arrays display horizontally as editable tags
2. **Edit**: Click on any tag and type to change value
3. **Delete**: Hover over tag, click "×" button that appears
4. **Add**: Click the "+" button at the end of the tag row
5. Tags auto-resize based on content length

**Type Preservation:** If the first array item is a number, new items default to `0`, otherwise empty string `""`.

## 🎯 Use Cases

### Perfect For:

- 📝 **Multi-Environment Configs** - Manage dev/staging/prod configurations
- 🛒 **Product Catalogs** - Edit large product databases with hundreds of items
- 👥 **User Management** - Modify user records, permissions, and settings
- 🧪 **Test Data Sets** - Create and maintain test fixtures
- 🌐 **API Response Collections** - Edit mock API responses
- 🎮 **Game Configurations** - Manage levels, characters, items
- 📊 **Data Exports** - Edit database exports before re-importing
- 🔧 **Application Settings** - Centralized config file management

### Why Choose JSON Editor Pro Over Text Editors:

| Scenario                       | Text Editor     | JSON Editor Pro    |
| ------------------------------ | --------------- | ------------------ |
| Edit 1 object in array of 500  | Scroll & search | ✅ Navigate 1-by-1 |
| Add property to all 50 objects | Copy-paste 50x  | ✅ Efficient       |
| Understand deep nesting        | Count brackets  | ✅ Color guides    |
| Edit array of 20 tags          | Quote hell      | ✅ Click & type    |
| Accidentally break JSON syntax | High risk       | ✅ Validated live  |
| Switch between light/dark      | Not available   | ✅ One click       |

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

- `index.html` - Main HTML structure with Material Icons
- `styles.css` - Material Design 3 styling and theming
- `app.js` - JavaScript application logic (~1100 lines)
- `test.json` - Sample data file (optional)
- `.nojekyll` - Tells GitHub Pages not to process with Jekyll

**Note**: The Python desktop app (`json_editor.py`) and web version work independently. You can use both!

## 🏗️ Technical Details

### Desktop App (Python)

- **Framework**: CustomTkinter 5.2+ (modern tkinter wrapper)
- **Architecture**: Single-file application (~670 lines)
- **State Management**: Entry map with path tuples for nested access
- **Type System**: Preserves original types (int, float, bool, str, list, dict, None)
- **Live Updates**: StringVar trace callbacks for real-time synchronization
- **Layout**: Grid-based responsive design with weighted columns
- **Config Persistence**: JSON config file stores last opened file path

**Key Classes:**

- `JSONEditor(ctk.CTk)` - Main application window
- Uses recursive form builder with depth tracking
- Collapsible sections tracked via set of path strings

### Web App (JavaScript)

- **Framework**: Vanilla JavaScript (no dependencies!)
- **Design System**: Material Design 3 color tokens
- **Icons**: Google Material Symbols (variable fonts)
- **Architecture**: ~1100 lines of modern ES6+ JavaScript
- **State Management**: Global state with Map-based entry tracking
- **Live Editing**: Debounced input handlers (500ms) for performance
- **Storage**: LocalStorage for auto-save between sessions
- **Layout**: CSS Grid + Flexbox for responsive design

**Key Features:**

- Editable JSON preview pane with syntax validation
- Colorized title with alternating Material colors
- Resizable split-pane with draggable divider
- Font size controls (9px-24px range)
- Keyboard shortcut handling (Ctrl+S, Arrow keys)

### Color System

Both versions use a **3-color cycling palette** for nesting:

**Dark Theme:**

- Gold (#FFD700) → Purple (#DA70D6) → Blue (#179FFF)

**Light Theme:**

- Dark Gold (#D4AF37) → Purple (#9C27B0) → Dark Blue (#0277BD)

Colors cycle every 3 levels to maintain visual distinction.

## 📚 Sample Data

Included `test.json` contains realistic example data:

- **2 application objects** with deep nesting (5+ levels)
- **Demonstrates:**
  - Server configurations
  - Database settings (primary, replica, cache)
  - Feature flags
  - Authentication providers (as tag array)
  - Payment gateways
  - Shipping providers
  - UI theme configuration
  - Analytics settings

Perfect for testing all features of the editor!

## 🤝 Contributing

Contributions are welcome! Here are some ideas:

- 🌍 **Internationalization** - Add language support
- 🔍 **Search/Filter** - Search within object properties
- 📋 **Schema Validation** - JSON Schema support
- 🎨 **Custom Themes** - More color schemes
- ↩️ **Undo/Redo** - History tracking
- 📝 **Inline Editing** - Edit directly in JSON preview
- 🖱️ **Drag & Drop Properties** - Reorder fields

## 📝 License

MIT License - Feel free to use in personal and commercial projects!

## 👏 Acknowledgments

- **CustomTkinter** - Beautiful modern tkinter framework
- **Material Design 3** - Google's design system and color tokens
- **Material Symbols** - Google's icon font
- **VS Code** - Inspiration for color-coded indentation guides
- **GitHub Pages** - Free hosting for web version

## 📧 Contact

Created by [vatsalunadkat](https://github.com/vatsalunadkat)

**⭐ If you find this useful, please star the repository!**

---

**Happy JSON Editing! 🎉**
