// Global state
let jsonData = [];
let currentIndex = 0;
let currentFilePath = null;
let entryMap = new Map();
let collapsedSections = new Set();

// Color palette for nested levels (matching Python app)
const nestColors = [
  "var(--nest-color-0)",
  "var(--nest-color-1)",
  "var(--nest-color-2)",
  "var(--nest-color-3)",
  "var(--nest-color-4)",
  "var(--nest-color-5)",
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
  document.getElementById("btn-open").addEventListener("click", () => {
    document.getElementById("file-input").click();
  });

  document
    .getElementById("file-input")
    .addEventListener("change", handleFileSelect);
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

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

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

      // Color label based on depth (base level stays default, nested gets parent color)
      if (depth > 0) {
        const parentColor = nestColors[(depth - 1) % nestColors.length];
        label.style.color = parentColor;
      }

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
    const colorIndex = depth % nestColors.length;
    
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

  if (savedEditorFontSize) {
    editorFontSize = parseInt(savedEditorFontSize);
    applyEditorFontSize();
  }
  
  if (savedPreviewFontSize) {
    previewFontSize = parseInt(savedPreviewFontSize);
    applyPreviewFontSize();
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
