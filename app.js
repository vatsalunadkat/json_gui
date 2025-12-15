// Global state
let jsonData = [];
let currentIndex = 0;
let currentFilePath = null;
let currentFileHandle = null; // File System Access API handle for direct saving
let entryMap = new Map();
let collapsedSections = new Set();

// Table view state
let currentViewMode = 'form'; // 'form' or 'table'
let tableFontSize = 13;
let sortColumn = null;
let sortDirection = 'asc'; // 'asc' or 'desc'
let selectedRows = new Set();

// Color palette for nested levels - 7 unique bright colors
const nestColors = [
  "var(--nest-color-0)",
  "var(--nest-color-1)",
  "var(--nest-color-2)",
  "var(--nest-color-3)",
  "var(--nest-color-4)",
  "var(--nest-color-5)",
  "var(--nest-color-6)",
];

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners();
  colorizeTitle();
  loadSampleData();
});

function colorizeTitle() {
  const title = document.querySelector(".app-title");
  if (!title) return;

  // Palette of vibrant, "Google-ish" colors
  // Palette matching the pastel buttons
  const colors = [
    "#64B5F6", // Blue (Open)
    "#81C784", // Green (Add Object)
    "#F48FB1", // Purple (Copy Last)
    "#E57373", // Red (Delete)
    "#FFB74D", // Orange (Download)
  ];

  const text = title.textContent;
  title.innerHTML = "";

  // Split into chars and colorize, keeping spaces
  [...text].forEach((char, index) => {
    const span = document.createElement("span");
    span.textContent = char;
    if (char.trim() !== "") {
      span.style.color = colors[index % colors.length];
      // Add a subtle drop shadow to make them pop on any background
      span.style.textShadow = "0 1px 1px rgba(0,0,0,0.1)";
    }
    title.appendChild(span);
  });
}

function initializeEventListeners() {
  // File operations
  document.getElementById("btn-open").addEventListener("click", openFile);

  document
    .getElementById("file-input")
    .addEventListener("change", handleFileSelect);
  document
    .getElementById("btn-save")
    .addEventListener("click", saveFile);
  document
    .getElementById("btn-download")
    .addEventListener("click", downloadJSON);

  // Navigation
  document
    .getElementById("btn-prev")
    .addEventListener("click", () => navigateObject(-1));
  document
    .getElementById("btn-next")
    .addEventListener("click", () => navigateObject(1));

  // CRUD operations
  document
    .getElementById("btn-add")
    .addEventListener("click", showAddObjectDialog);
  document.getElementById("btn-copy").addEventListener("click", copyLastObject);
  document
    .getElementById("btn-delete")
    .addEventListener("click", deleteCurrentObject);
  document.getElementById("btn-add-root-prop").addEventListener("click", () => {
    showAddPropertyDialog([]);
  });
  document
    .getElementById("btn-delete-root-prop")
    .addEventListener("click", showDeletePropertyDialog);

  // Initialize resizer
  initializeResizer();

  // Font size controls for editor
  document
    .getElementById("btn-editor-font-increase")
    .addEventListener("click", () => changeEditorFontSize(2));
  document
    .getElementById("btn-editor-font-decrease")
    .addEventListener("click", () => changeEditorFontSize(-2));

  // Font size controls for preview
  document
    .getElementById("btn-preview-font-increase")
    .addEventListener("click", () => changePreviewFontSize(2));
  document
    .getElementById("btn-preview-font-decrease")
    .addEventListener("click", () => changePreviewFontSize(-2));

  // Theme switcher
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.addEventListener("click", () => changeTheme(btn.dataset.theme));
  });

  // View mode toggle
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchViewMode(btn.dataset.view));
  });

  // Table font size controls
  const tableFontIncrease = document.getElementById('btn-table-font-increase');
  const tableFontDecrease = document.getElementById('btn-table-font-decrease');
  if (tableFontIncrease) {
    tableFontIncrease.addEventListener('click', () => changeTableFontSize(2));
  }
  if (tableFontDecrease) {
    tableFontDecrease.addEventListener('click', () => changeTableFontSize(-2));
  }

  // Table actions
  const tableAddRow = document.getElementById('btn-table-add-row');
  const tableDeleteSelected = document.getElementById('btn-table-delete-selected');
  if (tableAddRow) {
    tableAddRow.addEventListener('click', addTableRow);
  }
  if (tableDeleteSelected) {
    tableDeleteSelected.addEventListener('click', deleteSelectedRows);
  }

  // Dialog handlers
  document
    .getElementById("add-obj-confirm")
    .addEventListener("click", confirmAddObject);
  document.getElementById("add-obj-cancel").addEventListener("click", () => {
    document.getElementById("add-object-dialog").classList.remove("active");
  });

  document
    .getElementById("add-prop-confirm")
    .addEventListener("click", confirmAddProperty);
  document.getElementById("add-prop-cancel").addEventListener("click", () => {
    document.getElementById("add-prop-dialog").classList.remove("active");
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFile();
      return;
    }

    // Disable navigation shortcuts if user is typing in an input or textarea
    if (e.target.matches("input, textarea")) return;

    if (e.key === "ArrowLeft") {
      navigateObject(-1);
    } else if (e.key === "ArrowRight") {
      navigateObject(1);
    }
  });

  // Close dialogs on overlay click
  document.querySelectorAll(".dialog-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
      }
    });
  });


  // Preview Pane Handlers
  const preview = document.getElementById("json-preview");

  // Tab support for indentation
  preview.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = preview.selectionStart;
      const end = preview.selectionEnd;

      // Insert 2 spaces
      preview.value = preview.value.substring(0, start) + "  " + preview.value.substring(end);

      // Move caret
      preview.selectionStart = preview.selectionEnd = start + 2;
    }
  });

  // Sync scroll between textarea and highlight overlay
  preview.addEventListener("scroll", () => {
    const highlightDiv = preview.nextElementSibling;
    if (highlightDiv && highlightDiv.classList.contains('json-highlight')) {
      highlightDiv.scrollTop = preview.scrollTop;
      highlightDiv.scrollLeft = preview.scrollLeft;
    }
  });

  // Live Update (Debounced)
  let debounceTimer;
  preview.addEventListener("input", (e) => {
    // Update syntax highlighting immediately for visual feedback
    syntaxHighlight(preview);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        const newData = JSON.parse(e.target.value);
        jsonData[currentIndex] = newData;

        // Refresh form UI without full rebuild if possible, but full rebuild is safer for structure changes
        displayCurrentObject(false); // pass false to skip updating preview from data (loop)

        document.querySelector(".live-indicator").innerHTML = `
            <span class="material-symbols-outlined indicator-dot" style="font-size: 10px; color: #81C784;">fiber_manual_record</span>
            LIVE
        `;
        document.querySelector(".live-indicator").style.color = "#81C784";
        preview.classList.remove("error");
      } catch (err) {
        document.querySelector(".live-indicator").innerHTML = `
             <span class="material-symbols-obtained indicator-dot" style="font-size: 10px; color: var(--md-sys-color-error);">error</span>
             INVALID JSON
        `;
        document.querySelector(".live-indicator").style.color = "var(--md-sys-color-error)";
        preview.classList.add("error");
      }
    }, 500);
  });
}

function loadSampleData() {
  // Load test.json by default
  fetch("test.json")
    .then((response) => response.json())
    .then((data) => {
      if (
        Array.isArray(data) &&
        data.every((item) => typeof item === "object" && !Array.isArray(item))
      ) {
        jsonData = data;
        currentIndex = 0;
        currentFilePath = "test.json";
        collapsedSections.clear();
        displayCurrentObject();
      } else {
        console.error("Invalid JSON structure in test.json");
        loadFallbackData();
      }
    })
    .catch((error) => {
      console.error("Error loading test.json:", error);
      loadFallbackData();
    });
}

function loadFallbackData() {
  // Fallback sample data
  jsonData = [
    {
      "id": "app_001",
      "name": "E-Commerce Platform",
      "version": "2.5.3",
      "active": true,
      "configuration": {
        "server": {
          "host": "api.example.com",
          "port": 8443,
          "protocol": "https",
          "timeout": 30000,
          "retries": 3,
          "endpoints": {
            "users": "/api/v2/users",
            "products": "/api/v2/products",
            "orders": "/api/v2/orders",
            "analytics": "/api/v2/analytics"
          }
        },
        "database": {
          "primary": {
            "type": "postgresql",
            "host": "db-primary.example.com",
            "port": 5432,
            "name": "ecommerce_prod",
            "ssl": true,
            "poolSize": 20
          },
          "replica": {
            "type": "postgresql",
            "host": "db-replica.example.com",
            "port": 5432,
            "name": "ecommerce_prod",
            "ssl": true,
            "readOnly": true
          },
          "cache": {
            "type": "redis",
            "host": "cache.example.com",
            "port": 6379,
            "ttl": 3600
          }
        },
        "features": {
          "authentication": {
            "enabled": true,
            "providers": ["google", "facebook", "email"],
            "twoFactor": true,
            "sessionTimeout": 7200
          },
          "payments": {
            "enabled": true,
            "gateways": {
              "stripe": {
                "apiKey": "sk_live_xxxxx",
                "webhookSecret": "whsec_xxxxx",
                "supportedCurrencies": ["USD", "EUR", "GBP", "JPY"]
              },
              "paypal": {
                "clientId": "AYxxxxx",
                "secret": "EPxxxxx",
                "sandboxMode": false
              }
            },
            "defaultCurrency": "USD"
          },
          "shipping": {
            "enabled": true,
            "providers": {
              "fedex": {
                "accountNumber": "123456789",
                "apiKey": "xxxxx",
                "services": ["STANDARD_OVERNIGHT", "PRIORITY_OVERNIGHT", "GROUND"]
              },
              "ups": {
                "accountNumber": "987654321",
                "apiKey": "yyyyy",
                "services": ["NEXT_DAY_AIR", "2ND_DAY_AIR", "GROUND"]
              }
            },
            "freeShippingThreshold": 50.0
          }
        }
      },
      "ui": {
        "theme": {
          "primaryColor": "#0078D4",
          "secondaryColor": "#107C10",
          "accentColor": "#FFB900",
          "backgroundColor": "#FFFFFF",
          "textColor": "#1E1E1E",
          "fonts": {
            "primary": "Segoe UI, sans-serif",
            "secondary": "Consolas, monospace",
            "sizes": {
              "small": 12,
              "medium": 14,
              "large": 18,
              "xlarge": 24
            }
          }
        },
        "layout": {
          "header": {
            "height": 64,
            "sticky": true,
            "showLogo": true,
            "showSearch": true
          },
          "sidebar": {
            "width": 280,
            "collapsible": true,
            "defaultCollapsed": false
          },
          "footer": {
            "height": 120,
            "showSocialLinks": true,
            "showNewsletter": true
          }
        }
      },
      "analytics": {
        "google": {
          "trackingId": "GA-XXXXXXX",
          "enabled": true
        },
        "mixpanel": {
          "token": "xxxxxxxxxxxx",
          "enabled": true
        },
        "customEvents": ["purchase", "signup", "cart_abandon", "product_view"]
      }
    },
    {
      "id": "app_002",
      "name": "Mobile Banking App",
      "version": "3.2.1",
      "active": true,
      "configuration": {
        "server": {
          "host": "api.bankapp.com",
          "port": 443,
          "protocol": "https",
          "timeout": 15000,
          "endpoints": {
            "accounts": "/api/accounts",
            "transactions": "/api/transactions",
            "transfers": "/api/transfers"
          }
        },
        "security": {
          "encryption": {
            "algorithm": "AES-256-GCM",
            "keyRotation": 90
          },
          "biometric": {
            "enabled": true,
            "types": ["fingerprint", "faceId"],
            "fallbackPin": true
          },
          "twoFactor": {
            "enabled": true,
            "methods": ["sms", "email", "authenticator"],
            "required": true
          }
        }
      }
    }
  ];
  displayCurrentObject();
}

// Open file using File System Access API (with fallback)
async function openFile() {
  // Check if File System Access API is supported
  if ('showOpenFilePicker' in window) {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false
      });

      const file = await fileHandle.getFile();
      const content = await file.text();

      try {
        const data = JSON.parse(content);

        // Validate structure
        if (!Array.isArray(data)) {
          alert("Error: JSON must be an array of objects");
          return;
        }

        if (data.length === 0 || !data.every((item) => typeof item === "object" && !Array.isArray(item))) {
          alert("Error: JSON must contain only objects");
          return;
        }

        jsonData = data;
        currentIndex = 0;
        currentFilePath = file.name;
        currentFileHandle = fileHandle; // Store handle for saving
        collapsedSections.clear();
        selectedRows.clear();
        sortColumn = null;
        sortDirection = 'asc';

        if (currentViewMode === 'table') {
          renderTableView();
        } else {
          displayCurrentObject();
        }

      } catch (error) {
        alert("Error parsing JSON: " + error.message);
      }

    } catch (err) {
      // User cancelled or error occurred
      if (err.name !== 'AbortError') {
        console.error('Error opening file:', err);
      }
    }
  } else {
    // Fallback to traditional file input
    document.getElementById("file-input").click();
  }
}

// Save file directly using File System Access API
async function saveFile() {
  if (jsonData.length === 0) {
    alert("No data to save");
    return;
  }

  // Update data from current view
  if (currentViewMode === 'form') {
    updateDataFromUI();
  }

  const jsonString = JSON.stringify(jsonData, null, 2) + "\n";

  // If we have a file handle, save directly to it
  if (currentFileHandle) {
    try {
      const writable = await currentFileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();

      // Show brief success feedback
      showSaveNotification("Saved to " + currentFilePath);

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        // Permission denied, try to request it again
        try {
          const permission = await currentFileHandle.requestPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            return saveFile(); // Retry
          }
        } catch (e) {
          // Fall through to "Save As" behavior
        }
      }
      console.error('Error saving file:', err);
      // Fall back to Save As
      await saveFileAs(jsonString);
    }
  } else if ('showSaveFilePicker' in window) {
    // No existing handle, use Save As
    await saveFileAs(jsonString);
  } else {
    // Fallback to download
    downloadJSON();
  }

  // Update localStorage
  localStorage.setItem("jsonEditorData", jsonString);
}

// Save As using File System Access API
async function saveFileAs(jsonString) {
  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: currentFilePath || 'data.json',
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] }
      }]
    });

    const writable = await fileHandle.createWritable();
    await writable.write(jsonString);
    await writable.close();

    // Update file handle for future saves
    currentFileHandle = fileHandle;
    currentFilePath = (await fileHandle.getFile()).name;

    showSaveNotification("Saved to " + currentFilePath);

  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error saving file:', err);
      alert('Error saving file. Falling back to download.');
      downloadJSON();
    }
  }
}

// Show a brief save notification
function showSaveNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'save-notification';
  notification.innerHTML = `
    <span class="material-symbols-outlined" style="font-size: 18px;">check_circle</span>
    ${message}
  `;
  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 10);

  // Remove after delay
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Clear file handle since we're using traditional file input (can't save back)
  currentFileHandle = null;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      // Validate structure
      if (!Array.isArray(data)) {
        alert("Error: JSON must be an array of objects");
        return;
      }

      if (
        data.length === 0 ||
        !data.every((item) => typeof item === "object" && !Array.isArray(item))
      ) {
        alert("Error: JSON must contain only objects");
        return;
      }

      jsonData = data;
      currentIndex = 0;
      currentFilePath = file.name;
      collapsedSections.clear();
      displayCurrentObject();
    } catch (error) {
      alert("Error parsing JSON: " + error.message);
    }
  };

  reader.readAsText(file);
}

function reloadFile() {
  const savedData = localStorage.getItem("jsonEditorData");
  if (savedData) {
    try {
      jsonData = JSON.parse(savedData);
      currentIndex = 0;
      collapsedSections.clear();
      displayCurrentObject();
      alert("Reloaded from last save");
    } catch (e) {
      alert("No saved data to reload");
    }
  } else {
    alert("No saved data to reload. Please open a file first.");
  }
}

function saveToLocalStorage() {
  if (jsonData.length === 0) {
    alert("No data to save");
    return;
  }

  updateDataFromUI();
  localStorage.setItem("jsonEditorData", JSON.stringify(jsonData));
  localStorage.setItem("jsonEditorIndex", currentIndex.toString());
  alert(
    "Changes saved to browser storage!\n\nUse Download button to save as file."
  );
}

function downloadJSON() {
  if (jsonData.length === 0) {
    alert("No data to download");
    return;
  }

  updateDataFromUI();
  const jsonString = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonString + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = currentFilePath || "edited.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function navigateObject(direction) {
  if (jsonData.length === 0) return;

  updateDataFromUI();
  currentIndex = (currentIndex + direction + jsonData.length) % jsonData.length;
  displayCurrentObject();
}

function displayCurrentObject(updatePreviewPane = true) {
  if (jsonData.length === 0) {
    document.getElementById("form-container").innerHTML = `
            <div class="placeholder">
                <p>👆 Open a JSON file to start editing</p>
                <p class="placeholder-hint">File must be an array of objects</p>
            </div>
        `;
    const preview = document.getElementById("json-preview");
    preview.value = JSON.stringify(
      { message: "Load a JSON file to see preview" },
      null,
      2
    );
    syntaxHighlight(preview);
    updateNavigationButtons();
    return;
  }

  const obj = jsonData[currentIndex];
  entryMap.clear();

  const formContainer = document.getElementById("form-container");
  formContainer.innerHTML = "";

  buildFormRecursive(obj, [], formContainer, 0);
  if (updatePreviewPane) {
    updatePreview();
  }
  updateNavigationButtons();

  // Update object counter
  document.getElementById("object-counter").textContent = `Object ${currentIndex + 1
    } / ${jsonData.length}`;
}

function buildFormRecursive(obj, pathKeys, container, depth) {
  const entries = Object.entries(obj);

  entries.forEach(([key, value]) => {
    const currentPath = [...pathKeys, key];
    const pathStr = currentPath.join(".");

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      // Nested object
      const nestedDiv = document.createElement("div");
      nestedDiv.className = "nested-object";
      nestedDiv.style.position = "relative";
      // Removed manual marginLeft calculation to fix spacing issue

      // Color for this nesting level
      const color = nestColors[depth % nestColors.length];

      // Header
      const header = document.createElement("div");
      header.className = "nested-header";
      header.style.borderLeftColor = color;
      header.style.borderLeftWidth = "4px";

      const isCollapsed = collapsedSections.has(pathStr);
      if (isCollapsed) {
        nestedDiv.classList.add("collapsed");
      }

      const isEmpty = Object.keys(value).length === 0;
      const emptyIndicator = isEmpty
        ? ' <span style="color: var(--text-secondary); font-size: 11px; font-style: italic;">{empty object}</span>'
        : "";

      header.innerHTML = `
                <span class="material-symbols-outlined collapse-arrow">expand_more</span>
                <span class="nested-title" style="color: ${color}">
                    <span class="material-symbols-outlined nested-icon" style="font-size: 18px; vertical-align: middle; margin-right: 4px;">data_object</span>
                    ${key}${emptyIndicator}
                </span>
                <button class="add-nested-prop" data-path="${pathStr}">
                    <span class="material-symbols-outlined" style="font-size: 14px;">add</span>
                </button>
            `;

      header.addEventListener("click", (e) => {
        if (!e.target.closest(".add-nested-prop")) {
          toggleCollapse(pathStr, nestedDiv);
        }
      });

      // Add property button
      header
        .querySelector(".add-nested-prop")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          showAddPropertyDialog(currentPath);
        });

      nestedDiv.appendChild(header);

      // Content wrapper for indentation
      const contentWrapper = document.createElement("div");
      contentWrapper.className = "nested-content-wrapper";
      contentWrapper.style.position = "relative";
      contentWrapper.style.paddingLeft = "30px";

      // Indent guide - positioned to span from top to bottom of content
      const guide = document.createElement("div");
      guide.className = "indent-guide";
      guide.style.backgroundColor = color;
      guide.style.position = "absolute";
      guide.style.left = "15px";
      guide.style.top = "0";
      guide.style.bottom = "0";
      guide.style.width = "2px";
      contentWrapper.appendChild(guide);

      // Content
      const content = document.createElement("div");
      content.className = "nested-content";
      if (!isEmpty) {
        buildFormRecursive(value, currentPath, content, depth + 1);
      }
      contentWrapper.appendChild(content);

      nestedDiv.appendChild(contentWrapper);
      container.appendChild(nestedDiv);
    } else if (
      Array.isArray(value) &&
      (value.length === 0 || value.every((item) => typeof item !== "object"))
    ) {
      // Horizontal Primitive Array (Tag-style)
      const fieldRow = document.createElement("div");
      fieldRow.className = "field-row";
      // Removed manual marginLeft calculation to fix spacing issue

      const label = document.createElement("div");
      label.className = "field-label";
      label.textContent = key;
      if (depth > 0) {
        const parentColor = nestColors[(depth - 1) % nestColors.length];
        label.style.color = parentColor;
      }

      const inputsContainer = document.createElement("div");
      inputsContainer.className = "array-inputs-container";

      value.forEach((item, index) => {
        const itemWrapper = document.createElement("div");
        itemWrapper.className = "array-item-wrapper";

        const input = document.createElement("input");
        input.className = "array-item-input";
        input.type = "text";
        input.value = item;
        input.dataset.path = pathStr + "." + index;
        input.dataset.type = typeof item;

        // Auto-width
        input.style.width = Math.max(60, item.toString().length * 9 + 25) + "px";

        input.addEventListener("input", (e) => {
          e.target.style.width = Math.max(60, e.target.value.length * 9 + 25) + "px";
          updatePreview();
        });

        // Store in entry map
        entryMap.set(pathStr + "." + index, {
          element: input,
          originalType: typeof item,
          path: [...currentPath, index],
        });

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-array-delete";
        deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 14px;">close</span>';
        deleteBtn.title = "Remove item";
        deleteBtn.addEventListener("click", () => {
          value.splice(index, 1);
          displayCurrentObject();
        });

        itemWrapper.appendChild(input);
        itemWrapper.appendChild(deleteBtn);
        inputsContainer.appendChild(itemWrapper);
      });

      // Add Item Button
      const addBtn = document.createElement("button");
      addBtn.className = "btn-array-add";
      addBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">add</span>';
      addBtn.title = "Add item";
      addBtn.addEventListener("click", () => {
        const newValue = (value.length > 0 && typeof value[0] === 'number') ? 0 : "";
        value.push(newValue);
        displayCurrentObject();
      });
      inputsContainer.appendChild(addBtn);

      fieldRow.appendChild(label);
      fieldRow.appendChild(inputsContainer);
      container.appendChild(fieldRow);

    } else {
      // Simple field
      const fieldRow = document.createElement("div");
      fieldRow.className = "field-row";
      // Removed manual marginLeft calculation to fix spacing issue

      const label = document.createElement("div");
      label.className = "field-label";
      label.textContent = key;

      // Color label based on depth to match right pane
      const labelColor = nestColors[depth % nestColors.length];
      label.style.color = labelColor;

      const input = document.createElement("input");
      input.className = "field-input";
      input.type = "text";
      input.value = formatValue(value);
      input.dataset.path = pathStr;
      input.dataset.type = Array.isArray(value) ? "array" : typeof value;

      // Store in entry map
      entryMap.set(pathStr, {
        element: input,
        originalType: Array.isArray(value) ? "array" : typeof value,
        path: currentPath,
      });

      // Live update on input
      input.addEventListener("input", updatePreview);

      fieldRow.appendChild(label);
      fieldRow.appendChild(input);
      container.appendChild(fieldRow);
    }
  });
}

function toggleCollapse(pathStr, element) {
  if (collapsedSections.has(pathStr)) {
    collapsedSections.delete(pathStr);
    element.classList.remove("collapsed");
  } else {
    collapsedSections.add(pathStr);
    element.classList.add("collapsed");
  }
}

function formatValue(value) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    // Better array formatting
    if (value.length === 0) return "[]";
    if (
      value.every(
        (item) =>
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
      )
    ) {
      return JSON.stringify(value);
    }
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function updatePreview() {
  updateDataFromUI();
  const preview = document.getElementById("json-preview");
  const jsonString = JSON.stringify(jsonData[currentIndex], null, 2);
  preview.value = jsonString;
  syntaxHighlight(preview);
}

function syntaxHighlight(textarea) {
  const json = textarea.value;

  // Create or get the highlight overlay div
  let highlightDiv = textarea.nextElementSibling;
  if (!highlightDiv || !highlightDiv.classList.contains('json-highlight')) {
    highlightDiv = document.createElement('div');
    highlightDiv.className = 'json-highlight';
    textarea.parentNode.insertBefore(highlightDiv, textarea.nextSibling);
  }

  // Sync scroll position
  highlightDiv.scrollTop = textarea.scrollTop;
  highlightDiv.scrollLeft = textarea.scrollLeft;

  // Calculate indentation depth for each line to color keys
  const lines = json.split('\n');
  const coloredLines = lines.map(line => {
    // Count leading spaces to determine depth
    const leadingSpaces = line.match(/^\s*/)[0].length;
    const depth = Math.floor(leadingSpaces / 2); // 2 spaces per indent level
    // Subtract 1 to match left pane depth (which doesn't count the root object container)
    const adjustedDepth = depth > 0 ? depth - 1 : 0;
    const colorIndex = adjustedDepth % nestColors.length;

    // Syntax highlight with depth-aware key coloring
    return line.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            // Use nested color for keys based on depth
            return `<span class="json-key" style="color: ${nestColors[colorIndex]}">${match}</span>`;
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  });

  highlightDiv.innerHTML = coloredLines.join('\n');
}

function updateDataFromUI() {
  if (jsonData.length === 0) return;

  const obj = jsonData[currentIndex];

  entryMap.forEach((entry, pathStr) => {
    const input = entry.element;
    const path = entry.path;
    const rawValue = input.value;

    let typedValue;
    const originalType = entry.originalType;

    try {
      if (originalType === "array") {
        typedValue = JSON.parse(rawValue);
      } else if (originalType === "boolean") {
        typedValue = rawValue.toLowerCase() === "true";
      } else if (originalType === "number") {
        typedValue = parseFloat(rawValue);
        if (isNaN(typedValue)) typedValue = 0;
      } else if (
        rawValue.trim().startsWith("[") ||
        rawValue.trim().startsWith("{")
      ) {
        typedValue = JSON.parse(rawValue);
      } else {
        typedValue = rawValue;
      }
    } catch (e) {
      typedValue = rawValue;
    }

    // Navigate to the nested location and set value
    let target = obj;
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]];
    }
    target[path[path.length - 1]] = typedValue;
  });
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById("btn-prev");
  const nextBtn = document.getElementById("btn-next");

  prevBtn.disabled = jsonData.length <= 1;
  nextBtn.disabled = jsonData.length <= 1;
}

function changeTheme(theme) {
  if (theme === "light") {
    document.body.setAttribute("data-theme", "light");
  } else {
    document.body.removeAttribute("data-theme");
  }

  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });

  // Refresh display to update colors
  displayCurrentObject();
}

// CRUD Operations
function showAddObjectDialog() {
  if (jsonData.length === 0) {
    alert("Please load a JSON file first");
    return;
  }

  document.getElementById("add-obj-key").value = "";
  document.getElementById("add-obj-value").value = "";
  document.getElementById("add-object-dialog").classList.add("active");
  document.getElementById("add-obj-key").focus();
}

function confirmAddObject() {
  const key = document.getElementById("add-obj-key").value.trim();
  const value = document.getElementById("add-obj-value").value.trim();

  if (!key) {
    alert("Property name cannot be empty");
    return;
  }

  let parsedValue;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    parsedValue = value;
  }

  const newObj = { [key]: parsedValue };
  jsonData.push(newObj);
  currentIndex = jsonData.length - 1;
  displayCurrentObject();

  document.getElementById("add-object-dialog").classList.remove("active");
}

function copyLastObject() {
  if (jsonData.length === 0) {
    alert("Please load a JSON file first");
    return;
  }

  updateDataFromUI();
  const lastObject = JSON.parse(JSON.stringify(jsonData[jsonData.length - 1]));
  jsonData.push(lastObject);
  currentIndex = jsonData.length - 1;
  displayCurrentObject();

  alert(
    `Copied object ${jsonData.length - 1} to create object ${jsonData.length}`
  );
}

let currentAddPropertyPath = [];

function showAddPropertyDialog(pathKeys) {
  currentAddPropertyPath = pathKeys;

  const pathDisplay =
    pathKeys.length === 0 ? "Root object" : pathKeys.join(" → ");

  document.getElementById(
    "add-prop-path"
  ).textContent = `Adding to: ${pathDisplay}`;
  document.getElementById("add-prop-key").value = "";
  document.getElementById("add-prop-value").value = "";
  document.getElementById("add-prop-dialog").classList.add("active");
  document.getElementById("add-prop-key").focus();
}

function confirmAddProperty() {
  const key = document.getElementById("add-prop-key").value.trim();
  const value = document.getElementById("add-prop-value").value.trim();

  if (!key) {
    alert("Property name cannot be empty");
    return;
  }

  let parsedValue;

  // Handle special keywords
  if (value.toLowerCase() === "object" || value === "{}") {
    parsedValue = {};
  } else if (value.toLowerCase() === "true") {
    parsedValue = true;
  } else if (value.toLowerCase() === "false") {
    parsedValue = false;
  } else {
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }
  }

  // Navigate to target object
  let target = jsonData[currentIndex];
  for (const pathKey of currentAddPropertyPath) {
    target = target[pathKey];
  }

  // Add property
  target[key] = parsedValue;

  displayCurrentObject();
  document.getElementById("add-prop-dialog").classList.remove("active");
}

function deleteProperty(pathKeys) {
  if (jsonData.length === 0) {
    alert("No data loaded");
    return;
  }

  const propertyName = pathKeys[pathKeys.length - 1];
  if (confirm(`Delete property "${propertyName}"?`)) {
    // Navigate to the target object
    let target = jsonData[currentIndex];
    for (let i = 0; i < pathKeys.length - 1; i++) {
      target = target[pathKeys[i]];
    }

    // Delete the property
    delete target[propertyName];

    displayCurrentObject();
  }
}

function showDeletePropertyDialog() {
  if (jsonData.length === 0 || !jsonData[currentIndex]) {
    alert("No data to delete properties from");
    return;
  }

  const obj = jsonData[currentIndex];

  // Collect all properties including nested ones
  const allProperties = [];
  function collectProperties(obj, path = []) {
    for (const key in obj) {
      const currentPath = [...path, key];
      const pathStr = currentPath.join(".");
      allProperties.push({ path: currentPath, display: pathStr });

      if (
        obj[key] !== null &&
        typeof obj[key] === "object" &&
        !Array.isArray(obj[key])
      ) {
        collectProperties(obj[key], currentPath);
      }
    }
  }
  collectProperties(obj);

  if (allProperties.length === 0) {
    alert("No properties to delete");
    return;
  }

  const propertyList = allProperties
    .map((prop, idx) => `${idx + 1}. ${prop.display}`)
    .join("\n");
  const selection = prompt(
    `Select property to delete (enter full path):\n\n${propertyList}`
  );

  const selectedProp = allProperties.find((p) => p.display === selection);
  if (selectedProp) {
    if (confirm(`Delete property "${selection}"?`)) {
      deleteProperty(selectedProp.path);
    }
  } else if (selection) {
    alert("Invalid property path");
  }
}

function deleteCurrentObject() {
  if (jsonData.length === 0) {
    alert("No objects to delete");
    return;
  }

  if (jsonData.length === 1) {
    alert("Cannot delete the last object. At least one object must remain.");
    return;
  }

  if (confirm(`Delete object ${currentIndex + 1} of ${jsonData.length}?`)) {
    jsonData.splice(currentIndex, 1);
    if (currentIndex >= jsonData.length) {
      currentIndex = jsonData.length - 1;
    }
    displayCurrentObject();
  }
}

function initializeResizer() {
  const resizer = document.getElementById("resizer");
  if (!resizer) return; // Guard clause

  const leftPane = document.querySelector(".left-pane");
  const container = document.querySelector(".main-content");

  let isResizing = false;

  resizer.addEventListener("mousedown", (e) => {
    isResizing = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    const containerRect = container.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    const minWidth = 300;
    const maxWidth = containerRect.width - 300;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      leftPane.style.width = newWidth + "px";
    }
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  });
}

// Font size controls
let editorFontSize = 14; // Default font size for editor in pixels
let previewFontSize = 13; // Default font size for preview in pixels

function changeEditorFontSize(delta) {
  const newSize = editorFontSize + delta;
  if (newSize >= 10 && newSize <= 24) {
    editorFontSize = newSize;
    applyEditorFontSize();
    localStorage.setItem("jsonEditorEditorFontSize", editorFontSize);
  }
}

function changePreviewFontSize(delta) {
  const newSize = previewFontSize + delta;
  if (newSize >= 10 && newSize <= 24) {
    previewFontSize = newSize;
    applyPreviewFontSize();
    localStorage.setItem("jsonEditorPreviewFontSize", previewFontSize);
  }
}

function applyEditorFontSize() {
  const formContainer = document.getElementById("form-container");
  if (formContainer) {
    formContainer.style.fontSize = editorFontSize + "px";
    // Apply to all input fields, labels, and nested headers
    const inputs = formContainer.querySelectorAll('.field-input, .array-item-input');
    const labels = formContainer.querySelectorAll('.field-label');
    const headers = formContainer.querySelectorAll('.nested-title');

    inputs.forEach(input => input.style.fontSize = editorFontSize + "px");
    labels.forEach(label => label.style.fontSize = editorFontSize + "px");
    headers.forEach(header => header.style.fontSize = editorFontSize + "px");
  }
}

function applyPreviewFontSize() {
  const preview = document.getElementById("json-preview");
  const highlight = preview ? preview.nextElementSibling : null;

  if (preview) {
    preview.style.fontSize = previewFontSize + "px";
  }
  if (highlight && highlight.classList.contains('json-highlight')) {
    highlight.style.fontSize = previewFontSize + "px";
  }
}

// Load from localStorage on startup if available
window.addEventListener("load", () => {
  const savedData = localStorage.getItem("jsonEditorData");
  const savedIndex = localStorage.getItem("jsonEditorIndex");
  const savedEditorFontSize = localStorage.getItem("jsonEditorEditorFontSize");
  const savedPreviewFontSize = localStorage.getItem("jsonEditorPreviewFontSize");
  const savedTableFontSize = localStorage.getItem("jsonEditorTableFontSize");

  if (savedEditorFontSize) {
    editorFontSize = parseInt(savedEditorFontSize);
    applyEditorFontSize();
  }

  if (savedPreviewFontSize) {
    previewFontSize = parseInt(savedPreviewFontSize);
    applyPreviewFontSize();
  }

  if (savedTableFontSize) {
    tableFontSize = parseInt(savedTableFontSize);
  }

  if (savedData) {
    try {
      jsonData = JSON.parse(savedData);
      currentIndex = savedIndex ? parseInt(savedIndex) : 0;
      displayCurrentObject();
    } catch (e) {
      console.error("Failed to load saved data:", e);
    }
  }
});

// ===================================
// TABLE VIEW FUNCTIONS
// ===================================

// Switch between form and table view
function switchViewMode(mode) {
  if (currentViewMode === mode) return;

  // Save current data before switching
  if (currentViewMode === 'form') {
    updateDataFromUI();
  }

  currentViewMode = mode;

  // Update button states
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });

  // Toggle pane visibility
  const leftPane = document.querySelector('.left-pane');
  const rightPane = document.querySelector('.right-pane');
  const resizer = document.getElementById('resizer');
  const tablePane = document.querySelector('.table-pane');

  if (mode === 'table') {
    leftPane.style.display = 'none';
    rightPane.style.display = 'none';
    resizer.style.display = 'none';
    tablePane.style.display = 'flex';
    renderTableView();
  } else {
    leftPane.style.display = '';
    rightPane.style.display = '';
    resizer.style.display = '';
    tablePane.style.display = 'none';
    displayCurrentObject();
  }
}

// Collect all unique property paths from all objects using dot notation
// Preserves the order properties appear in the JSON file
function collectAllPropertyPaths(objects) {
  const pathsSet = new Set();
  const pathsArray = [];

  function traverse(obj, prefix = '') {
    if (obj === null || obj === undefined) return;

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const path = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      // If it's a nested object (not array, not null), traverse deeper
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value, path);
      } else {
        // It's a leaf value (primitive, array, or null)
        // Only add if we haven't seen this path before (preserve first occurrence order)
        if (!pathsSet.has(path)) {
          pathsSet.add(path);
          pathsArray.push(path);
        }
      }
    }
  }

  objects.forEach(obj => traverse(obj));
  return pathsArray;
}


// Get value from object using dot notation path
function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }

  return current;
}

// Set value in object using dot notation path
function setValueByPath(obj, path, value) {
  if (!obj || !path) return;

  const keys = path.split('.');
  let current = obj;

  // Navigate to parent
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  // Set the value
  current[keys[keys.length - 1]] = value;
}

// Format value for display in table cell
function formatCellValue(value) {
  if (value === undefined) return { text: '', className: 'cell-empty' };
  if (value === null) return { text: 'null', className: 'cell-null' };

  if (Array.isArray(value)) {
    // Primitive arrays: show as comma-separated
    if (value.every(item => typeof item !== 'object' || item === null)) {
      return { text: value.join(', '), className: 'cell-array' };
    }
    // Complex arrays: show as JSON
    return { text: JSON.stringify(value), className: 'cell-array' };
  }

  if (typeof value === 'object') {
    return { text: JSON.stringify(value), className: 'cell-object' };
  }

  if (typeof value === 'boolean') {
    return { text: String(value), className: value ? 'cell-boolean-true' : 'cell-boolean-false' };
  }

  if (typeof value === 'number') {
    return { text: String(value), className: 'cell-number' };
  }

  return { text: String(value), className: '' };
}

// Parse edited cell value back to appropriate type
function parseEditedValue(newValue, originalValue) {
  const trimmed = newValue.trim();

  // Handle null
  if (trimmed.toLowerCase() === 'null') return null;

  // Handle booleans
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;

  // Handle arrays (comma-separated for primitives, or JSON)
  if (Array.isArray(originalValue)) {
    // Try parsing as JSON first
    if (trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        // Fall through to comma-separated parsing
      }
    }
    // Parse as comma-separated values
    if (trimmed === '') return [];
    const items = trimmed.split(',').map(item => {
      const t = item.trim();
      // Try to preserve types for array items
      if (t.toLowerCase() === 'true') return true;
      if (t.toLowerCase() === 'false') return false;
      if (t.toLowerCase() === 'null') return null;
      const num = parseFloat(t);
      if (!isNaN(num) && String(num) === t) return num;
      return t;
    });
    return items;
  }

  // Handle JSON objects
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return newValue;
    }
  }

  // Handle numbers - preserve type if original was number
  if (typeof originalValue === 'number') {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) return num;
  }

  // Default: return as string
  return newValue;
}

// Render the table view
function renderTableView() {
  const container = document.getElementById('table-container');
  if (!container) return;

  if (jsonData.length === 0) {
    container.innerHTML = `
      <div class="table-empty-state">
        <span class="material-symbols-outlined">upload_file</span>
        <p>Open a JSON file to view as table</p>
        <p style="font-size: 14px; opacity: 0.7;">File must be an array of objects</p>
      </div>
    `;
    return;
  }

  // Collect all property paths
  const columns = collectAllPropertyPaths(jsonData);

  if (columns.length === 0) {
    container.innerHTML = `
      <div class="table-empty-state">
        <span class="material-symbols-outlined">table_chart</span>
        <p>No properties found in the data</p>
      </div>
    `;
    return;
  }

  // Build table HTML
  let html = '<table class="data-table">';

  // Header row
  html += '<thead><tr>';
  html += '<th class="index-col select-col"><input type="checkbox" class="row-checkbox" id="select-all-rows" title="Select All"></th>';
  html += '<th class="index-col">#</th>';

  columns.forEach(col => {
    const isSorted = sortColumn === col;
    const arrow = isSorted ? (sortDirection === 'asc' ? '↑' : '↓') : '';
    const arrowClass = isSorted ? 'sort-indicator' : 'sort-indicator hidden';
    html += `<th data-column="${col}" title="${col}">${col}<span class="${arrowClass}">${arrow}</span></th>`;
  });

  html += '</tr></thead>';

  // Body rows
  html += '<tbody>';
  jsonData.forEach((obj, rowIndex) => {
    const isSelected = selectedRows.has(rowIndex);
    html += `<tr data-row="${rowIndex}" class="${isSelected ? 'selected' : ''}">`;
    html += `<td class="index-col select-col"><input type="checkbox" class="row-checkbox" data-row="${rowIndex}" ${isSelected ? 'checked' : ''}></td>`;
    html += `<td class="index-col">${rowIndex}</td>`;

    columns.forEach(col => {
      const value = getValueByPath(obj, col);
      const formatted = formatCellValue(value);
      html += `<td data-row="${rowIndex}" data-column="${col}" class="${formatted.className}" title="${formatted.text}">${escapeHtml(formatted.text)}</td>`;
    });

    html += '</tr>';
  });
  html += '</tbody>';

  html += '</table>';
  container.innerHTML = html;

  // Apply font size
  applyTableFontSize();

  // Add event listeners
  setupTableEventListeners();
}

// Escape HTML characters
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Setup event listeners for table interactions
function setupTableEventListeners() {
  const container = document.getElementById('table-container');
  if (!container) return;

  // Column header click for sorting
  container.querySelectorAll('th[data-column]').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.column;
      if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = column;
        sortDirection = 'asc';
      }
      sortTableData(column, sortDirection);
      renderTableView();
    });
  });

  // Cell click for editing
  container.querySelectorAll('td[data-column]').forEach(td => {
    td.addEventListener('click', () => {
      startCellEdit(td);
    });
  });

  // Row checkbox change
  container.querySelectorAll('.row-checkbox[data-row]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const rowIndex = parseInt(e.target.dataset.row);
      if (e.target.checked) {
        selectedRows.add(rowIndex);
      } else {
        selectedRows.delete(rowIndex);
      }
      updateRowSelection(rowIndex, e.target.checked);
    });
  });

  // Select all checkbox
  const selectAll = document.getElementById('select-all-rows');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      if (e.target.checked) {
        jsonData.forEach((_, idx) => selectedRows.add(idx));
      } else {
        selectedRows.clear();
      }
      renderTableView();
    });
  }
}

// Update row selection styling
function updateRowSelection(rowIndex, isSelected) {
  const row = document.querySelector(`tr[data-row="${rowIndex}"]`);
  if (row) {
    row.classList.toggle('selected', isSelected);
  }
}

// Start editing a cell
function startCellEdit(td) {
  // Don't edit if already editing
  if (td.querySelector('.cell-input')) return;

  const rowIndex = parseInt(td.dataset.row);
  const column = td.dataset.column;
  const currentValue = getValueByPath(jsonData[rowIndex], column);

  // Get display value
  const formatted = formatCellValue(currentValue);
  const displayValue = formatted.text;

  // Store original content
  const originalContent = td.innerHTML;
  const originalClass = td.className;

  // Create input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cell-input';
  input.value = displayValue;

  // Replace cell content with input
  td.innerHTML = '';
  td.className = '';
  td.appendChild(input);
  input.focus();
  input.select();

  // Handle blur (save)
  const saveEdit = () => {
    const newValue = parseEditedValue(input.value, currentValue);
    setValueByPath(jsonData[rowIndex], column, newValue);

    // Re-render the cell
    const newFormatted = formatCellValue(newValue);
    td.innerHTML = escapeHtml(newFormatted.text);
    td.className = newFormatted.className;
    td.title = newFormatted.text;

    // Update preview if we switch back
    localStorage.setItem("jsonEditorData", JSON.stringify(jsonData));
  };

  // Handle cancel
  const cancelEdit = () => {
    td.innerHTML = originalContent;
    td.className = originalClass;
  };

  input.addEventListener('blur', saveEdit);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      input.removeEventListener('blur', saveEdit);
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      input.blur();
      // Move to next/previous cell
      const cells = Array.from(document.querySelectorAll('td[data-column]'));
      const currentIndex = cells.indexOf(td);
      const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
      if (cells[nextIndex]) {
        startCellEdit(cells[nextIndex]);
      }
    }
  });
}

// Sort table data by column
function sortTableData(column, direction) {
  jsonData.sort((a, b) => {
    const aVal = getValueByPath(a, column);
    const bVal = getValueByPath(b, column);

    // Handle undefined/null - sort to bottom
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    // Compare based on type
    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  // Clear current index since order changed
  currentIndex = 0;
  selectedRows.clear();
}

// Add a new row to the table
function addTableRow() {
  if (jsonData.length === 0) {
    // No data, can't determine structure
    jsonData.push({});
  } else {
    // Clone structure from first object with empty/default values
    const template = jsonData[0];
    const newObj = createEmptyObject(template);
    jsonData.push(newObj);
  }

  selectedRows.clear();
  renderTableView();

  // Scroll to bottom
  const container = document.getElementById('table-container');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// Create empty object with same structure as template
function createEmptyObject(template, depth = 0) {
  const result = {};

  for (const key in template) {
    if (!template.hasOwnProperty(key)) continue;

    const value = template[key];

    if (value === null) {
      result[key] = null;
    } else if (Array.isArray(value)) {
      result[key] = [];
    } else if (typeof value === 'object') {
      result[key] = createEmptyObject(value, depth + 1);
    } else if (typeof value === 'number') {
      result[key] = 0;
    } else if (typeof value === 'boolean') {
      result[key] = false;
    } else {
      result[key] = '';
    }
  }

  return result;
}

// Delete selected rows
function deleteSelectedRows() {
  if (selectedRows.size === 0) {
    alert('No rows selected. Click the checkboxes to select rows to delete.');
    return;
  }

  if (selectedRows.size === jsonData.length) {
    alert('Cannot delete all rows. At least one object must remain.');
    return;
  }

  if (!confirm(`Delete ${selectedRows.size} selected row(s)?`)) {
    return;
  }

  // Delete in reverse order to maintain indices
  const indices = Array.from(selectedRows).sort((a, b) => b - a);
  indices.forEach(idx => {
    jsonData.splice(idx, 1);
  });

  selectedRows.clear();
  currentIndex = 0;
  sortColumn = null;
  sortDirection = 'asc';

  renderTableView();
  localStorage.setItem("jsonEditorData", JSON.stringify(jsonData));
}

// Table font size control
function changeTableFontSize(delta) {
  const newSize = tableFontSize + delta;
  if (newSize >= 10 && newSize <= 24) {
    tableFontSize = newSize;
    applyTableFontSize();
    localStorage.setItem("jsonEditorTableFontSize", tableFontSize);
  }
}

function applyTableFontSize() {
  const table = document.querySelector('.data-table');
  if (table) {
    table.style.fontSize = tableFontSize + 'px';
  }
}
