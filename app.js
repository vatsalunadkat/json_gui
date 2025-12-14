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
  loadSampleData();
});

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

  // Font size controls
  document
    .getElementById("btn-font-increase")
    .addEventListener("click", increaseFontSize);
  document
    .getElementById("btn-font-decrease")
    .addEventListener("click", decreaseFontSize);

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
    if (e.key === "ArrowLeft" && !e.target.matches("input")) {
      navigateObject(-1);
    } else if (e.key === "ArrowRight" && !e.target.matches("input")) {
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
      name: "Sample Object",
      description: "This is a sample JSON object",
      settings: {
        enabled: true,
        count: 42,
      },
    },
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

function displayCurrentObject() {
  if (jsonData.length === 0) {
    document.getElementById("form-container").innerHTML = `
            <div class="placeholder">
                <p>👆 Open a JSON file to start editing</p>
                <p class="placeholder-hint">File must be an array of objects</p>
            </div>
        `;
    document.getElementById("json-preview").textContent = JSON.stringify(
      { message: "Load a JSON file to see preview" },
      null,
      2
    );
    updateNavigationButtons();
    return;
  }

  const obj = jsonData[currentIndex];
  entryMap.clear();

  const formContainer = document.getElementById("form-container");
  formContainer.innerHTML = "";

  buildFormRecursive(obj, [], formContainer, 0);
  updatePreview();
  updateNavigationButtons();

  // Update object counter
  document.getElementById("object-counter").textContent = `Object ${
    currentIndex + 1
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
      nestedDiv.style.marginLeft = `${depth * 30}px`;

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
                <span class="collapse-arrow">▼</span>
                <span class="nested-title" style="color: ${color}">📦 ${key}${emptyIndicator}</span>
                <button class="add-nested-prop" data-path="${pathStr}">+</button>
            `;

      header.addEventListener("click", (e) => {
        if (!e.target.classList.contains("add-nested-prop")) {
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
    } else {
      // Simple field
      const fieldRow = document.createElement("div");
      fieldRow.className = "field-row";
      if (depth > 0) {
        fieldRow.style.marginLeft = `${depth * 30}px`;
      }

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
  preview.textContent = JSON.stringify(jsonData[currentIndex], null, 2);
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
let currentFontSize = 13; // Default font size in pixels

function increaseFontSize() {
  if (currentFontSize < 24) {
    currentFontSize += 2;
    applyFontSize();
  }
}

function decreaseFontSize() {
  if (currentFontSize > 10) {
    currentFontSize -= 2;
    applyFontSize();
  }
}

function applyFontSize() {
  document.documentElement.style.setProperty(
    "--base-font-size",
    currentFontSize + "px"
  );
  localStorage.setItem("jsonEditorFontSize", currentFontSize);
}

// Load from localStorage on startup if available
window.addEventListener("load", () => {
  const savedData = localStorage.getItem("jsonEditorData");
  const savedIndex = localStorage.getItem("jsonEditorIndex");
  const savedFontSize = localStorage.getItem("jsonEditorFontSize");

  if (savedFontSize) {
    currentFontSize = parseInt(savedFontSize);
    applyFontSize();
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
