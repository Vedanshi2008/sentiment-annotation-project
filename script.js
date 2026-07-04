const STORAGE_KEY = "sentimentlab.dataset.v2";
const THEME_KEY = "sentimentlab.theme";
const PROFILE_KEY = "sentimentlab.profile";

const labels = ["Positive", "Negative", "Neutral"];
const labelClass = {
  Positive: "positive",
  Negative: "negative",
  Neutral: "neutral",
  Unlabelled: "unlabelled"
};

const state = {
  rows: [],
  filteredRows: [],
  currentIndex: 0,
  page: 1,
  pageSize: 20,
  search: "",
  filter: "All",
  datasetName: "annotated_sentences.csv",
  charts: {
    pie: null,
    bar: null
  },
  activity: []
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  applyStoredTheme();
  renderProfile();

  const stored = loadStoredDataset();
  if (stored?.rows?.length) {
    state.rows = normalizeRows(stored.rows);
    state.datasetName = stored.datasetName || state.datasetName;
    state.activity = stored.activity || [];
    toast("Local autosave restored.");
    refresh();
    return;
  }

  await loadDefaultCsv();
}

function cacheElements() {
  [
    "positiveCount",
    "negativeCount",
    "neutralCount",
    "totalCount",
    "completionRate",
    "saveStatus",
    "datasetName",
    "activityList",
    "currentPosition",
    "currentLabel",
    "sentenceText",
    "prevBtn",
    "nextBtn",
    "searchInput",
    "filterSelect",
    "pageSizeSelect",
    "resetFiltersBtn",
    "sentenceTable",
    "tableSummary",
    "pageInfo",
    "pagePrevBtn",
    "pageNextBtn",
    "sentimentPie",
    "sentimentBar",
    "metricCompletion",
    "metricUnlabelled",
    "metricLongest",
    "metricAverage",
    "balanceBars",
    "csvUpload",
    "exportBtn",
    "themeToggle",
    "mobileMenuBtn",
    "loadSampleBtn",
    "clearStorageBtn",
    "downloadRawBtn",
    "copyReportBtn",
    "loginForm",
    "loginName",
    "loginRole",
    "profileText",
    "toastArea"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });

  els.sidebar = document.querySelector(".sidebar");
  els.navLinks = [...document.querySelectorAll("[data-view-link]")];
  els.views = [...document.querySelectorAll("[data-view]")];
  els.labelButtons = [...document.querySelectorAll("[data-label]")];
  els.quickButtons = [...document.querySelectorAll("[data-quick-label]")];
}

function bindEvents() {
  els.navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const view = link.dataset.viewLink;
      if (!view) return;
      event.preventDefault();
      showView(view);
    });
  });

  els.mobileMenuBtn.addEventListener("click", () => {
    els.sidebar.classList.toggle("open");
  });

  els.labelButtons.forEach((button) => {
    button.addEventListener("click", () => annotateCurrent(button.dataset.label));
  });

  els.quickButtons.forEach((button) => {
    button.addEventListener("click", () => annotateCurrent(button.dataset.quickLabel));
  });

  els.prevBtn.addEventListener("click", () => moveCurrent(-1));
  els.nextBtn.addEventListener("click", () => moveCurrent(1));
  els.searchInput.addEventListener("input", () => {
    state.search = els.searchInput.value.trim().toLowerCase();
    state.page = 1;
    refresh();
  });
  els.filterSelect.addEventListener("change", () => {
    state.filter = els.filterSelect.value;
    state.page = 1;
    refresh();
  });
  els.pageSizeSelect.addEventListener("change", () => {
    state.pageSize = Number(els.pageSizeSelect.value);
    state.page = 1;
    refresh();
  });
  els.resetFiltersBtn.addEventListener("click", resetFilters);
  els.pagePrevBtn.addEventListener("click", () => changePage(-1));
  els.pageNextBtn.addEventListener("click", () => changePage(1));
  els.csvUpload.addEventListener("change", handleUpload);
  els.exportBtn.addEventListener("click", () => downloadCsv("annotated_sentences_export.csv", state.rows, true));
  els.downloadRawBtn.addEventListener("click", () => downloadCsv("raw_sentences_export.csv", state.rows, false));
  els.themeToggle.addEventListener("click", toggleTheme);
  els.loadSampleBtn.addEventListener("click", loadSampleDataset);
  els.clearStorageBtn.addEventListener("click", clearLocalSave);
  els.copyReportBtn.addEventListener("click", copyReport);
  els.loginForm.addEventListener("submit", saveProfile);

  document.addEventListener("keydown", handleShortcuts);
}

async function loadDefaultCsv() {
  try {
    const response = await fetch("annotated_sentences.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("CSV request failed");
    const text = await response.text();
    loadCsvText(text, "annotated_sentences.csv", false);
  } catch (error) {
    state.rows = buildGeneratedDataset(120);
    state.datasetName = "generated-sample";
    toast("Using generated sample data. Run from a local server to load CSV.");
    refresh();
  }
}

function loadSampleDataset() {
  localStorage.removeItem(STORAGE_KEY);
  loadDefaultCsv();
}

function loadCsvText(text, name, shouldToast = true) {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase()
  });

  if (parsed.errors.length) {
    toast("CSV parsed with warnings. Check unusual rows.");
  }

  const rows = parsed.data
    .map((row, index) => ({
      id: String(row.id || row.ID || index + 1).trim(),
      text: String(row.text || row.sentence || row.content || "").trim(),
      label: cleanLabel(row.label || row.sentiment || "")
    }))
    .filter((row) => row.text);

  if (!rows.length) {
    toast("No usable text rows found in the CSV.");
    return;
  }

  state.rows = normalizeRows(rows);
  state.datasetName = name;
  state.currentIndex = 0;
  state.page = 1;
  state.activity = [];
  recordActivity("Dataset loaded", `${rows.length} rows from ${name}`);
  persist();
  refresh();
  if (shouldToast) toast(`Loaded ${rows.length} rows from ${name}.`);
}

function normalizeRows(rows) {
  return rows.map((row, index) => ({
    id: String(row.id || index + 1),
    text: String(row.text || "").trim(),
    label: cleanLabel(row.label)
  }));
}

function cleanLabel(label) {
  const value = String(label || "").trim().toLowerCase();
  if (value === "positive") return "Positive";
  if (value === "negative") return "Negative";
  if (value === "neutral") return "Neutral";
  return "Unlabelled";
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadCsvText(String(reader.result || ""), file.name);
  reader.onerror = () => toast("Could not read that CSV file.");
  reader.readAsText(file);
  event.target.value = "";
}

function refresh() {
  applyFilters();
  renderStats();
  renderCurrentSentence();
  renderTable();
  renderCharts();
  renderActivity();
  renderMetrics();
  renderBalanceBars();
  els.datasetName.textContent = state.datasetName;
}

function applyFilters() {
  state.filteredRows = state.rows.filter((row) => {
    const matchesSearch =
      !state.search ||
      row.text.toLowerCase().includes(state.search) ||
      row.id.toLowerCase().includes(state.search) ||
      row.label.toLowerCase().includes(state.search);
    const matchesFilter = state.filter === "All" || row.label === state.filter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = getTotalPages();
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;
}

function renderStats() {
  const counts = getCounts();
  els.positiveCount.textContent = counts.Positive;
  els.negativeCount.textContent = counts.Negative;
  els.neutralCount.textContent = counts.Neutral;
  els.totalCount.textContent = state.rows.length;
  els.completionRate.textContent = `${counts.completion}%`;
  els.saveStatus.textContent = "Auto-saved";
}

function renderCurrentSentence() {
  if (!state.rows.length) {
    els.currentPosition.textContent = "Sentence 0 of 0";
    els.currentLabel.textContent = "Unlabelled";
    els.currentLabel.className = "label-chip unlabelled";
    els.sentenceText.textContent = "Load a dataset to begin annotating.";
    return;
  }

  state.currentIndex = clamp(state.currentIndex, 0, state.rows.length - 1);
  const row = state.rows[state.currentIndex];
  els.currentPosition.textContent = `Sentence ${state.currentIndex + 1} of ${state.rows.length}`;
  els.currentLabel.textContent = row.label;
  els.currentLabel.className = `label-chip ${labelClass[row.label] || "unlabelled"}`;
  els.sentenceText.textContent = row.text;
}

function renderTable() {
  const start = (state.page - 1) * state.pageSize;
  const pageRows = state.filteredRows.slice(start, start + state.pageSize);
  els.sentenceTable.innerHTML = pageRows.map(renderRow).join("");

  els.sentenceTable.querySelectorAll("[data-row-id]").forEach((row) => {
    row.addEventListener("click", () => selectRow(row.dataset.rowId));
  });

  els.sentenceTable.querySelectorAll("[data-set-label]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      annotateRow(button.dataset.rowId, button.dataset.setLabel);
    });
  });

  els.tableSummary.textContent = `${state.filteredRows.length} matching rows`;
  els.pageInfo.textContent = `Page ${state.page} of ${getTotalPages()}`;
  els.pagePrevBtn.disabled = state.page <= 1;
  els.pageNextBtn.disabled = state.page >= getTotalPages();
}

function renderRow(row) {
  const active = state.rows[state.currentIndex]?.id === row.id ? "active-row" : "";
  return `
    <tr class="${active}" data-row-id="${escapeHtml(row.id)}">
      <td>${escapeHtml(row.id)}</td>
      <td>${escapeHtml(row.text)}</td>
      <td><span class="label-chip ${labelClass[row.label] || "unlabelled"}">${escapeHtml(row.label)}</span></td>
      <td>
        <div class="row-actions">
          ${labels.map((label) => `<button class="mini-button" type="button" data-row-id="${escapeHtml(row.id)}" data-set-label="${label}">${label[0]}</button>`).join("")}
        </div>
      </td>
    </tr>
  `;
}

function renderCharts() {
  if (!window.Chart) return;
  const counts = getCounts();
  const chartLabels = ["Positive", "Negative", "Neutral", "Unlabelled"];
  const chartData = chartLabels.map((label) => counts[label]);
  const colors = ["#22c55e", "#f43f5e", "#eab308", "#94a3b8"];

  const pieConfig = {
    type: "doughnut",
    data: {
      labels: chartLabels,
      datasets: [{ data: chartData, backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      cutout: "62%"
    }
  };

  const barConfig = {
    type: "bar",
    data: {
      labels: chartLabels,
      datasets: [{ label: "Rows", data: chartData, backgroundColor: colors, borderRadius: 8 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  };

  if (state.charts.pie) state.charts.pie.destroy();
  if (state.charts.bar) state.charts.bar.destroy();
  state.charts.pie = new Chart(els.sentimentPie, pieConfig);
  state.charts.bar = new Chart(els.sentimentBar, barConfig);
}

function renderActivity() {
  const items = state.activity.slice(0, 5);
  if (!items.length) {
    els.activityList.innerHTML = `<div class="activity-item"><p>No annotation activity yet.</p><small>Start labelling rows</small></div>`;
    return;
  }

  els.activityList.innerHTML = items.map((item) => `
    <div class="activity-item">
      <p>${escapeHtml(item.title)}<br><small>${escapeHtml(item.detail)}</small></p>
      <small>${escapeHtml(item.time)}</small>
    </div>
  `).join("");
}

function renderMetrics() {
  const counts = getCounts();
  const lengths = state.rows.map((row) => row.text.length);
  const longest = lengths.length ? Math.max(...lengths) : 0;
  const average = lengths.length ? Math.round(lengths.reduce((sum, length) => sum + length, 0) / lengths.length) : 0;
  els.metricCompletion.textContent = `${counts.completion}%`;
  els.metricUnlabelled.textContent = counts.Unlabelled;
  els.metricLongest.textContent = `${longest} chars`;
  els.metricAverage.textContent = `${average} chars`;
}

function renderBalanceBars() {
  const counts = getCounts();
  const total = Math.max(state.rows.length, 1);
  els.balanceBars.innerHTML = labels.map((label) => {
    const percent = Math.round((counts[label] / total) * 100);
    return `
      <div class="balance-row">
        <header><span>${label}</span><strong>${percent}%</strong></header>
        <div class="balance-track"><div class="balance-fill ${labelClass[label]}" style="width:${percent}%"></div></div>
      </div>
    `;
  }).join("");
}

function annotateCurrent(label) {
  if (!state.rows.length) return;
  annotateRow(state.rows[state.currentIndex].id, label);
  if (state.currentIndex < state.rows.length - 1) state.currentIndex += 1;
  refresh();
}

function annotateRow(id, label) {
  const row = state.rows.find((item) => item.id === id);
  if (!row) return;
  row.label = cleanLabel(label);
  state.currentIndex = state.rows.findIndex((item) => item.id === id);
  recordActivity("Label updated", `#${row.id} marked ${row.label}`);
  persist();
  refresh();
}

function moveCurrent(step) {
  if (!state.rows.length) return;
  state.currentIndex = clamp(state.currentIndex + step, 0, state.rows.length - 1);
  refresh();
}

function selectRow(id) {
  const index = state.rows.findIndex((row) => row.id === id);
  if (index === -1) return;
  state.currentIndex = index;
  showView("annotate");
  refresh();
}

function changePage(step) {
  state.page = clamp(state.page + step, 1, getTotalPages());
  renderTable();
}

function resetFilters() {
  state.search = "";
  state.filter = "All";
  state.page = 1;
  els.searchInput.value = "";
  els.filterSelect.value = "All";
  refresh();
}

function showView(viewName) {
  els.views.forEach((view) => view.classList.toggle("active", view.dataset.view === viewName));
  els.navLinks.forEach((link) => link.classList.toggle("active", link.dataset.viewLink === viewName));
  els.sidebar.classList.remove("open");
  history.replaceState(null, "", `#${viewName}`);
}

function getCounts() {
  const counts = { Positive: 0, Negative: 0, Neutral: 0, Unlabelled: 0 };
  state.rows.forEach((row) => {
    counts[row.label] = (counts[row.label] || 0) + 1;
  });
  const labelled = counts.Positive + counts.Negative + counts.Neutral;
  counts.completion = state.rows.length ? Math.round((labelled / state.rows.length) * 100) : 0;
  return counts;
}

function getTotalPages() {
  return Math.max(1, Math.ceil(state.filteredRows.length / state.pageSize));
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    datasetName: state.datasetName,
    rows: state.rows,
    activity: state.activity
  }));
}

function loadStoredDataset() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return null;
  }
}

function clearLocalSave() {
  localStorage.removeItem(STORAGE_KEY);
  toast("Local save cleared. Reload sample data if needed.");
}

function recordActivity(title, detail) {
  state.activity.unshift({
    title,
    detail,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  state.activity = state.activity.slice(0, 20);
}

function downloadCsv(filename, rows, includeLabel) {
  const fields = includeLabel ? ["id", "text", "label"] : ["id", "text"];
  const csv = Papa.unparse(rows.map((row) => {
    const item = { id: row.id, text: row.text };
    if (includeLabel) item.label = row.label;
    return item;
  }), { columns: fields });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast(`${filename} exported.`);
}

function copyReport() {
  const counts = getCounts();
  const report = [
    `Dataset: ${state.datasetName}`,
    `Total rows: ${state.rows.length}`,
    `Completion: ${counts.completion}%`,
    `Positive: ${counts.Positive}`,
    `Negative: ${counts.Negative}`,
    `Neutral: ${counts.Neutral}`,
    `Unlabelled: ${counts.Unlabelled}`
  ].join("\n");

  navigator.clipboard?.writeText(report)
    .then(() => toast("Statistics report copied."))
    .catch(() => toast("Copy is unavailable in this browser."));
}

function saveProfile(event) {
  event.preventDefault();
  const profile = {
    name: els.loginName.value.trim(),
    role: els.loginRole.value
  };
  if (!profile.name) {
    toast("Enter an annotator name first.");
    return;
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  renderProfile();
  toast("Profile saved.");
}

function renderProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (!profile?.name) return;
    els.loginName.value = profile.name;
    els.loginRole.value = profile.role || "AI Data Annotator";
    els.profileText.textContent = `${profile.name} - ${profile.role || "AI Data Annotator"}`;
  } catch (error) {
    els.profileText.textContent = "No profile saved.";
  }
}

function applyStoredTheme() {
  const theme = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.dataset.theme = theme;
  els.themeToggle.innerHTML = theme === "dark" ? `<i class="fa-solid fa-sun"></i>` : `<i class="fa-solid fa-moon"></i>`;
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  els.themeToggle.innerHTML = next === "dark" ? `<i class="fa-solid fa-sun"></i>` : `<i class="fa-solid fa-moon"></i>`;
  renderCharts();
}

function handleShortcuts(event) {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  const keyMap = { "1": "Positive", "2": "Negative", "3": "Neutral" };
  if (keyMap[event.key]) annotateCurrent(keyMap[event.key]);
  if (event.key === "ArrowLeft") moveCurrent(-1);
  if (event.key === "ArrowRight") moveCurrent(1);
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `<i class="fa-solid fa-circle-info"></i><span>${escapeHtml(message)}</span>`;
  els.toastArea.appendChild(node);
  window.setTimeout(() => node.remove(), 3600);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildGeneratedDataset(size) {
  const templates = [
    ["Positive", "The support team solved my issue quickly and kindly."],
    ["Negative", "The checkout page failed twice before I could finish."],
    ["Neutral", "The order was placed at 9 AM and shipped later that day."],
    ["Positive", "I am impressed with how smooth the new dashboard feels."],
    ["Negative", "The battery drained much faster than the product page promised."],
    ["Neutral", "The customer changed the delivery address after purchase."]
  ];

  return Array.from({ length: size }, (_, index) => {
    const [label, text] = templates[index % templates.length];
    return { id: String(index + 1), text: `${text} Sample ${index + 1}.`, label };
  });
}

window.filterData = function filterData(label) {
  state.filter = label;
  els.filterSelect.value = label;
  state.page = 1;
  refresh();
};
