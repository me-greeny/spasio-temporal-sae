// 1. KONFIGURASI DATA: ganti lokasi ini jika CSV dipindahkan.
const CSV_FILE = "data/hasil_olah_data_all.csv";
// Opsional: file batas kecamatan tanpa/ dengan atribut per tahun.
// GeoJSON lama masih didukung SEBAGAI GEOMETRI, bukan sumber estimasi.
const GEOJSON_FILES = [
  "data/batas_kecamatan.geojson",
  "data/hasil_peta_STSAE_M87_simple.geojson"
];

const FIELDS = Object.freeze({
  year: "tahun",
  direct: "pengeluaran_mean",
  selected: "EBLUP_Selected",
  full: "EBLUP_STFH",
  directRrmse: "RRMSE_direct",
  stfhRrmse: "RRMSE_STFH",
  directMse: "MSE_direct",
  stfhMse: "MSE_STFH_pbmse"
});

let rows = [];
let geometry = null;
let leafletMap = null;
let polygons = null;
let selectedYear = null;
let selectedKode = "all";
let selectedKab = "all";
let years = [];
let geoMatchCount = 0;

const $ = id => document.getElementById(id);
const numberFormatter = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 2});
const integerFormatter = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0});
const moneyFormatter = new Intl.NumberFormat("id-ID", {style: "currency", currency: "IDR", maximumFractionDigits: 0});

function escapeHTML(input) {
  return String(input ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

// CSV selalu dibaca sebagai STRING agar kode wilayah tidak berubah/kehilangan nol depan.
function numeric(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined) return null;
  let s = String(value).trim().replace(/\s|Rp|%/gi, "");
  if (!s || /^(NA|N\/A|NaN|null|undefined|-)$/i.test(s)) return null;
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Kode tanpa tanda titik/spasi. Tidak memangkas nol di awal.
function normalizeCode(value) {
  const raw = String(value ?? "").trim();
  // Kasus ekspor spreadsheet: 3501010.0 seharusnya tetap 3501010.
  if (/^\d+\.0+$/.test(raw)) return raw.split(".")[0];
  return raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}
function labelKecamatan(row) {
  return row?.nama_kecamatan_bps || row?.nama_kecamatan_kemendagri || row?.kecamatan_clean || row?.kode_kecamatan_bps || row?.kode_kecamatan_kemendagri || "Nama tidak tersedia";
}
function rowCode(row) {
  return normalizeCode(row.kode_kecamatan_kemendagri) || normalizeCode(row.kode_kecamatan_bps) || normalizeCode(row.kode_clean);
}
function codesFor(row) {
  return [row.kode_kecamatan_kemendagri, row.kode_kecamatan_bps, row.kode_clean]
    .map(normalizeCode).filter(Boolean);
}
function geoCodes(feature) {
  const p = feature?.properties ?? {};
  return [
    p.kode_kecamatan_kemendagri, p.kode_kecamatan_bps, p.kode_clean,
    p.KODE_KEC, p.KODE_BPS, p.kode_kec, p.kd_kec, p.kd_bps
  ].map(normalizeCode).filter(Boolean);
}
function geoKab(feature) {
  const p = feature?.properties ?? {};
  return String(p.kab_kota || p.nama_kabupaten || p.nama_kab_kota || p.KAB_KOTA || "").trim();
}
function fmt(value) { return value === null || !Number.isFinite(value) ? "—" : numberFormatter.format(value); }
function fmtInt(value) { return value === null || !Number.isFinite(value) ? "—" : integerFormatter.format(value); }
function fmtRp(value) { return value === null || !Number.isFinite(value) ? "—" : moneyFormatter.format(value); }
function fmtPct(value) { return value === null || !Number.isFinite(value) ? "—" : `${fmt(value)}%`; }
function average(values) {
  const clean = values.filter(v => v !== null && Number.isFinite(v));
  return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : null;
}
function median(values) {
  const clean = values.filter(v => v !== null && Number.isFinite(v)).sort((a,b) => a-b);
  if (!clean.length) return null;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid-1] + clean[mid]) / 2;
}
function showMessage(id, msg) {
  const el = $(id);
  if (el) el.innerHTML = `<p class="placeholder">${escapeHTML(msg)}</p>`;
}
function status(text, kind = "info") {
  const el = $("data-status");
  el.textContent = text;
  el.dataset.kind = kind;
}
function plot(target, traces, layout) {
  if (typeof Plotly === "undefined") {
    showMessage(target, "Pustaka Plotly tidak termuat. Periksa koneksi internet atau CDN.");
    return;
  }
  const el = $(target);
  try {
    const result = Plotly.newPlot(el, traces, {
      ...layout,
      template: "plotly_white",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      margin: {l: 68, r: 22, t: 48, b: 68, ...(layout.margin || {})},
      font: {family: "Inter, Arial, sans-serif", color: "#28445f"},
      legend: {orientation: "h", y: -0.24, x: 0}
    }, {responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"]});
    if (result?.catch) result.catch(() => showMessage(target, "Visualisasi tidak dapat dibuat dari data ini."));
  } catch (e) {
    console.error(`Plotly ${target}:`, e);
    showMessage(target, "Visualisasi tidak dapat dibuat dari data ini.");
  }
}

async function loadCsv() {
  if (typeof Papa === "undefined") throw new Error("PapaParse belum termuat. Periksa koneksi internet ke CDN.");
  const response = await fetch(CSV_FILE, {cache: "no-cache"});
  if (!response.ok) throw new Error(`CSV tidak dapat ditemukan (${response.status}): ${CSV_FILE}`);
  const text = await response.text();
  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: "greedy",
    transformHeader: h => h.replace(/^\uFEFF/, "").trim()
  });
  const headers = parsed.meta.fields || [];
  const required = ["tahun", "pengeluaran_mean"];
  const missing = required.filter(k => !headers.includes(k));
  if (!headers.some(k => ["kode_kecamatan_kemendagri", "kode_kecamatan_bps", "kode_clean"].includes(k))) {
    missing.push("salah satu kode kecamatan");
  }
  if (!headers.includes("EBLUP_Selected") && !headers.includes("EBLUP_STFH")) {
    missing.push("EBLUP_Selected atau EBLUP_STFH");
  }
  if (missing.length) throw new Error(`Kolom CSV yang diperlukan belum ditemukan: ${missing.join(", ")}.`);
  if (parsed.errors.length) console.warn("Catatan pembacaan CSV:", parsed.errors.slice(0, 8));

  const numericColumns = [
    "pengeluaran_mean", "EBLUP_Selected", "EBLUP_STFH", "MSE_direct", "MSE_STFH_pbmse",
    "RRMSE_direct", "RRMSE_STFH", "CV_direct", "CV_STFH_pbmse", "RMSE_direct", "RMSE_STFH_pbmse",
    "efek_spasial", "efek_temporal", "CI_LOWER", "CI_UPPER", "jumlah_rt", "jumlah_individu",
    "NTL", "LST", "NDBI", "NDVI", "CO", "pendidikan", "ekonomi", "listrik"
  ];
  rows = parsed.data.map(item => {
    const row = {...item};
    row.tahun = numeric(row.tahun);
    for (const col of numericColumns) row[col] = numeric(row[col]);
    row._code = rowCode(row);
    row._label = labelKecamatan(row);
    row._kab = "";
    return row;
  }).filter(row => Number.isInteger(row.tahun) && row.tahun >= 1900 && row.tahun <= 2100 && row._code);
  if (!rows.length) throw new Error("CSV terbaca, tetapi tidak ditemukan baris dengan tahun dan kode kecamatan yang valid.");
  years = [...new Set(rows.map(row => row.tahun))].sort((a, b) => a - b);
  selectedYear = years[years.length - 1];
}

async function loadGeoJsonOptional() {
  for (const file of GEOJSON_FILES) {
    try {
      const response = await fetch(file, {cache: "no-cache"});
      if (!response.ok) continue;
      const data = await response.json();
      if (data?.type === "FeatureCollection" && Array.isArray(data.features) && data.features.length) {
        return data;
      }
    } catch (error) {
      console.warn(`GeoJSON opsional ${file} tidak tersedia:`, error.message);
    }
  }
  return null;
}

// Menautkan atribut kabupaten/kota ke CSV memakai KODE, bukan nama yang mungkin berulang.
function enrichFromGeometry() {
  if (!geometry) return;
  const byCode = new Map();
  for (const feature of geometry.features) {
    for (const code of geoCodes(feature)) if (!byCode.has(code)) byCode.set(code, feature);
  }
  for (const row of rows) {
    const found = codesFor(row).map(k => byCode.get(k)).find(Boolean);
    if (found) row._kab = geoKab(found);
  }
}

function yearRows() {
  return rows.filter(r => r.tahun === selectedYear &&
    (selectedKab === "all" || r._kab === selectedKab));
}
function visibleRows() {
  return yearRows().filter(r => selectedKode === "all" || r._code === selectedKode);
}
function validFor(rowsIn, field) { return rowsIn.map(r => r[field]).filter(v => v !== null && Number.isFinite(v)); }
function allYearStats() {
  return years.map(tahun => {
    const subset = rows.filter(r => r.tahun === tahun);
    const a = field => validFor(subset, field);
    const available = a("RRMSE_STFH");
    return {
      tahun, n: subset.length,
      meanDirect: average(a(FIELDS.direct)),
      meanSelected: average(a(FIELDS.selected)),
      meanFull: average(a(FIELDS.full)),
      meanDirectMse: average(a(FIELDS.directMse)),
      meanStfhMse: average(a(FIELDS.stfhMse)),
      medianStfhMse: median(a(FIELDS.stfhMse)),
      meanDirectRrmse: average(a(FIELDS.directRrmse)),
      meanStfhRrmse: average(available),
      medianStfhRrmse: median(available),
      pctBelow25: available.length ? available.filter(v => v < 25).length / available.length * 100 : null,
      nRrmse: available.length
    };
  });
}

function renderHeader() {
  const unique = new Set(rows.map(r => r._code));
  $("stat-kecamatan").textContent = fmtInt(unique.size);
  $("stat-tahun").textContent = fmtInt(years.length);
  const expectedPanel = unique.size === 661 && years.length === 8 ? "" : " (cakupan sesuai isi CSV)";
  status(`${fmtInt(rows.length)} baris data dimuat · ${fmtInt(unique.size)} kecamatan · ${years.join(", ")}${expectedPanel}`, "success");
}
function renderYearFilters() {
  $("yearSelect").innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
  $("yearSelect").value = String(selectedYear);
  const kabs = [...new Set(rows.map(r => r._kab).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"id"));
  $("kab-field").hidden = !kabs.length;
  $("kab-filter").innerHTML = `<option value="all">Semua kabupaten/kota</option>` +
    kabs.map(k => `<option value="${escapeHTML(k)}">${escapeHTML(k)}</option>`).join("");
  $("kab-filter").value = selectedKab;
  refreshKecamatanOptions();
  $("filter-note").textContent = geometry
    ? "Pilihan kabupaten/kota hanya tersedia apabila nama wilayah cocok dengan atribut pada GeoJSON."
    : "Filter kabupaten/kota memerlukan GeoJSON. Filter tahun dan kecamatan tetap aktif tanpa peta.";
}
function refreshKecamatanOptions() {
  const choices = new Map();
  for (const r of yearRows()) if (!choices.has(r._code)) choices.set(r._code, r._label);
  const sorted = [...choices.entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
  if (selectedKode !== "all" && !choices.has(selectedKode)) selectedKode = "all";
  $("kec-filter").innerHTML = `<option value="all">Semua kecamatan (${sorted.length})</option>` +
    sorted.map(([k, label]) => `<option value="${escapeHTML(k)}">${escapeHTML(label)} · ${escapeHTML(k)}</option>`).join("");
  $("kec-filter").value = selectedKode;
}

function renderMainChart(stats) {
  if (!stats.some(s => s.meanDirect !== null || s.meanSelected !== null || s.meanFull !== null)) {
    showMessage("grafik-model", "Nilai estimasi langsung maupun model tidak tersedia pada CSV.");
    return;
  }
  const x = stats.map(s => String(s.tahun));
  const series = [
    ["Estimasi langsung", "meanDirect", "#e39a57"],
    ["EBLUP model terpilih", "meanSelected", "#187a96"],
    ["EBLUP model penuh (STFH)", "meanFull", "#6258a8"]
  ];
  plot("grafik-model", series.filter(([, key]) => stats.some(s => s[key] !== null)).map(([name, key, color]) => ({
    x, y: stats.map(s => s[key]), name, mode: "lines+markers", type: "scatter",
    line: {color, width: 3}, marker: {size: 8},
    hovertemplate: "%{x}: Rp %{y:,.0f}<extra>" + name + "</extra>"
  })), {xaxis: {title: "Tahun", type: "category"}, yaxis: {title: "Rupiah/orang/bulan", tickformat: ",.0f"}, hovermode: "x unified"});
}
function tableHTML(headers, tableRows) {
  return `<table class="data-table"><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${tableRows.join("")}</tbody></table>`;
}
function renderEstimasiTable() {
  const subset = yearRows().filter(r => r[FIELDS.selected] !== null || r[FIELDS.full] !== null || r[FIELDS.direct] !== null);
  subset.sort((a,b) => (b[FIELDS.selected] ?? b[FIELDS.full] ?? -Infinity) - (a[FIELDS.selected] ?? a[FIELDS.full] ?? -Infinity));
  if (!subset.length) return showMessage("estimasi-table", `Tidak ada nilai estimasi yang tersedia untuk tahun ${selectedYear}.`);
  const trs = subset.slice(0, 15).map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHTML(r._label)}</td><td>${escapeHTML(r._code)}</td><td>${fmtRp(r.pengeluaran_mean)}</td><td>${fmtRp(r.EBLUP_Selected)}</td><td>${fmtRp(r.EBLUP_STFH)}</td></tr>`);
  $("estimasi-table").innerHTML = tableHTML(["No.", "Kecamatan", "Kode", "Langsung", "EBLUP_Selected", "EBLUP_STFH"], trs) +
    `<p class="table-caption">${Math.min(subset.length,15)} dari ${subset.length} baris tersedia · Tahun ${selectedYear} · Rata-rata pengeluaran per orang per bulan.</p>`;
}
function renderEvaluation(stats) {
  if (!stats.some(s => s.meanDirectRrmse !== null || s.meanStfhRrmse !== null)) {
    showMessage("grafik-rrmse", "Kolom RRMSE_direct dan RRMSE_STFH belum memuat angka yang valid.");
  } else {
    const x = stats.map(s => String(s.tahun));
    plot("grafik-rrmse", [
      {x, y: stats.map(s => s.meanDirectRrmse), name: "RRMSE_direct", type: "scatter", mode: "lines+markers", line: {color: "#e39a57", width: 3}},
      {x, y: stats.map(s => s.meanStfhRrmse), name: "RRMSE_STFH", type: "scatter", mode: "lines+markers", line: {color: "#187a96", width: 3}},
      {x, y: stats.map(() => 25), name: "Batas 25%", type: "scatter", mode: "lines", line: {color: "#a1aab6", dash: "dash", width: 2}}
    ], {xaxis: {title: "Tahun", type: "category"}, yaxis: {title: "Rata-rata RRMSE (%)", rangemode: "tozero"}, hovermode: "x unified"});
  }
  if (!stats.some(s => s.meanDirectMse !== null || s.meanStfhMse !== null || s.meanStfhRrmse !== null)) {
    return showMessage("rrmse-table", "Kolom evaluasi belum memiliki angka yang dapat diringkas.");
  }
  const trs = stats.map(s => `<tr><td>${s.tahun}</td><td>${fmtInt(s.n)}</td><td>${fmt(s.meanDirectMse)}</td><td>${fmt(s.meanStfhMse)}</td><td>${fmt(s.medianStfhMse)}</td><td>${fmtPct(s.meanDirectRrmse)}</td><td>${fmtPct(s.meanStfhRrmse)}</td><td>${fmtPct(s.medianStfhRrmse)}</td><td>${fmtPct(s.pctBelow25)}</td></tr>`);
  $("rrmse-table").innerHTML = tableHTML([
    "Tahun", "Jumlah baris", "Mean MSE_direct", "Mean MSE_STFH", "Median MSE_STFH",
    "Mean RRMSE_direct", "Mean RRMSE_STFH", "Median RRMSE_STFH", "% RRMSE_STFH &lt; 25"
  ], trs) + `<p class="table-caption">Ringkasan hanya menggunakan nilai numerik yang tersedia. Persentase &lt;25 dihitung dengan penyebut jumlah baris yang memiliki RRMSE_STFH valid pada setiap tahun. RRMSE dalam CSV diasumsikan sudah dalam satuan persen (contoh: 8,5 berarti 8,5%).</p>`;
}
function renderFallbackTable() {
  const subset = visibleRows().slice().sort((a,b) => a._label.localeCompare(b._label, "id"));
  if (!subset.length) return showMessage("map-fallback-table", "Tidak ada baris yang sesuai filter tahun dan wilayah ini.");
  const trs = subset.slice(0, 20).map(r => `<tr><td>${escapeHTML(r._label)}</td><td>${escapeHTML(r._code)}</td><td>${fmtRp(r.pengeluaran_mean)}</td><td>${fmtRp(r.EBLUP_Selected ?? r.EBLUP_STFH)}</td></tr>`);
  $("map-fallback-table").innerHTML = tableHTML(["Kecamatan", "Kode", "Estimasi langsung", "Estimasi model"], trs) +
    `<p class="table-caption">Menampilkan ${Math.min(subset.length, 20)} dari ${subset.length} baris sesuai filter. Pilih kecamatan untuk profil rinci.</p>`;
}

function renderProfileTrend() {
  const profile = $("profil-kecamatan");
  const trend = $("trend-panel");
  if (selectedKode === "all") {
    profile.hidden = true;
    trend.hidden = true;
    return;
  }
  const now = visibleRows().find(r => r._code === selectedKode);
  if (!now) { profile.hidden = true; trend.hidden = true; return; }
  const sampling = [
    ["Rumah tangga sampel", fmtInt(now.jumlah_rt)],
    ["Individu sampel", fmtInt(now.jumlah_individu)],
    ["RRMSE langsung", fmtPct(now.RRMSE_direct)],
    ["RRMSE STFH", fmtPct(now.RRMSE_STFH)],
    ["Efek spasial", fmt(now.efek_spasial)],
    ["Efek temporal", fmt(now.efek_temporal)]
  ];
  const auxiliaries = ["NTL", "LST", "NDVI", "NDBI", "CO", "pendidikan", "ekonomi"];
  profile.hidden = false;
  profile.innerHTML = `<div class="profile-heading"><div><span class="section-kicker">Profil kecamatan · ${selectedYear}</span><h3>${escapeHTML(now._label)}</h3><p>${escapeHTML(now._kab || "Jawa Timur")} · Kode ${escapeHTML(now._code)}</p></div></div>
    <div class="profile-values"><div><span>Estimasi langsung</span><strong>${fmtRp(now.pengeluaran_mean)}</strong></div><div><span>EBLUP model terpilih</span><strong>${fmtRp(now.EBLUP_Selected)}</strong></div><div><span>EBLUP model penuh</span><strong>${fmtRp(now.EBLUP_STFH)}</strong></div></div>
    <h4>Informasi tambahan</h4><div class="detail-grid">${sampling.map(([label,v])=>`<div><span>${escapeHTML(label)}</span><strong>${escapeHTML(v)}</strong></div>`).join("")}</div>
    <h4>Tujuh variabel pada model terpilih</h4><div class="variable-chips">${auxiliaries.map(k=>`<span>${escapeHTML(k)}: <strong>${fmt(now[k])}</strong></span>`).join("")}</div>
    <p class="fine-print">RRMSE_STFH berasal dari model STFH sebagaimana dinamai dalam CSV dan tidak otomatis merupakan RRMSE khusus EBLUP_Selected.</p>`;
  const trendRows = rows.filter(r => r._code === selectedKode).sort((a,b)=>a.tahun-b.tahun);
  if (!trendRows.some(r => r.EBLUP_Selected !== null || r.EBLUP_STFH !== null || r.pengeluaran_mean !== null)) {
    trend.hidden = true;
    return;
  }
  trend.hidden = false;
  plot("grafik-kecamatan", [
    {x: trendRows.map(r=>String(r.tahun)), y: trendRows.map(r=>r.pengeluaran_mean), name:"Estimasi langsung",type:"scatter",mode:"lines+markers",line:{color:"#e39a57",width:3}},
    {x: trendRows.map(r=>String(r.tahun)), y: trendRows.map(r=>r.EBLUP_Selected), name:"EBLUP_Selected",type:"scatter",mode:"lines+markers",line:{color:"#187a96",width:3}},
    {x: trendRows.map(r=>String(r.tahun)), y: trendRows.map(r=>r.EBLUP_STFH), name:"EBLUP_STFH",type:"scatter",mode:"lines+markers",line:{color:"#6258a8",width:2}}
  ], {xaxis: {title:"Tahun",type:"category"},yaxis:{title:"Rupiah/orang/bulan",tickformat:",.0f"},hovermode:"x unified"});
}

// Peta selalu memakai angka CSV. GeoJSON hanya menyediakan poligon + nama kabupaten/kota.
function mappingFeatures() {
  if (!geometry) return [];
  const byAnyCode = new Map();
  for (const row of visibleRows()) {
    for (const key of codesFor(row)) if (!byAnyCode.has(key)) byAnyCode.set(key, row);
  }
  const seen = new Set();
  const features = [];
  for (const f of geometry.features) {
    const row = geoCodes(f).map(k => byAnyCode.get(k)).find(Boolean);
    if (!row || seen.has(row._code) || !f.geometry) continue;
    seen.add(row._code);
    features.push({type: "Feature", geometry: f.geometry, properties: {_key: row._code, _label: row._label, _kab: row._kab, _value: row.EBLUP_Selected ?? row.EBLUP_STFH, _direct: row.pengeluaran_mean}});
  }
  return features;
}
const CHOROPLETH_COLORS = ["#dceff5", "#9bd5dc", "#59afb9", "#288696", "#185c77"];
function colorFor(v, min, max) {
  if (v === null || !Number.isFinite(v)) return "#e2e8f0";
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return CHOROPLETH_COLORS[2];
  const index = Math.min(4, Math.max(0, Math.floor((v-min) / (max-min) * 5)));
  return CHOROPLETH_COLORS[index];
}
function drawMap() {
  const features = mappingFeatures();
  geoMatchCount = features.length;
  const canRender = !!features.length && typeof L !== "undefined";
  $("map-panel").hidden = !canRender;
  $("map-fallback").hidden = canRender;
  if (!canRender) {
    const message = !geometry
      ? "GeoJSON batas kecamatan belum ditemukan, sehingga ditampilkan alternatif tabel."
      : typeof L === "undefined"
        ? "Leaflet tidak termuat. Tabel kecamatan tetap tersedia sebagai alternatif."
        : "Kode wilayah pada GeoJSON belum cocok dengan CSV untuk pilihan ini. Periksa atribut kode kecamatan.";
    $("map-fallback").querySelector("p").textContent = message;
    renderFallbackTable();
    if (leafletMap) { leafletMap.remove(); leafletMap = null; polygons = null; }
    return;
  }
  if (!leafletMap) {
    leafletMap = L.map("map", {scrollWheelZoom: false}).setView([-7.6, 112.4], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "&copy; OpenStreetMap contributors"
    }).addTo(leafletMap);
  }
  if (polygons) polygons.remove();
  const vals = features.map(f => f.properties._value).filter(v => v !== null && Number.isFinite(v));
  const min = vals.length ? Math.min(...vals) : null;
  const max = vals.length ? Math.max(...vals) : null;
  polygons = L.geoJSON({type:"FeatureCollection",features}, {
    style: f => ({
      color: f.properties._key === selectedKode ? "#0c344e" : "#ffffff",
      weight: f.properties._key === selectedKode ? 3 : 1,
      fillColor: colorFor(f.properties._value, min, max),
      fillOpacity: 0.84
    }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`<strong>${escapeHTML(p._label)}</strong><br>${escapeHTML(p._kab || "Jawa Timur")}<br>Tahun ${selectedYear}<br>Estimasi langsung: ${fmtRp(p._direct)}<br>Estimasi model: <strong>${fmtRp(p._value)}</strong>`);
      layer.on("click", () => {
        selectedKode = p._key;
        $("kec-filter").value = selectedKode;
        renderProfileTrend();
      });
    }
  }).addTo(leafletMap);
  if (polygons.getLayers().length) {
    const bounds = polygons.getBounds();
    if (bounds.isValid()) leafletMap.fitBounds(bounds, {padding: [18,18], maxZoom: 11});
  }
  const legend = $("map-legend");
  if (!vals.length) legend.textContent = "Nilai estimasi tidak tersedia; wilayah ditampilkan tanpa klasifikasi.";
  else legend.innerHTML = `<strong>EBLUP terpilih (Rp/orang/bulan)</strong><div class="legend-gradient">${CHOROPLETH_COLORS.map(c => `<i style="background:${c}"></i>`).join("")}</div><div class="legend-range"><span>${fmtRp(min)}</span><span>${fmtRp(max)}</span></div><p>Klasifikasi relatif berdasarkan rentang nilai yang tampil pada tahun dan filter aktif.</p>`;
  requestAnimationFrame(() => leafletMap?.invalidateSize());
}
function renderCurrentView() {
  renderEstimasiTable();
  drawMap();
  renderProfileTrend();
}
function attachListeners() {
  $("yearSelect").addEventListener("change", event => {
    selectedYear = Number(event.target.value);
    selectedKode = "all";
    refreshKecamatanOptions();
    renderCurrentView();
  });
  $("kab-filter").addEventListener("change", event => {
    selectedKab = event.target.value;
    selectedKode = "all";
    refreshKecamatanOptions();
    renderCurrentView();
  });
  $("kec-filter").addEventListener("change", event => {
    selectedKode = event.target.value;
    drawMap();
    renderProfileTrend();
  });
}
function renderError(error) {
  console.error("Kesalahan pembacaan data:", error);
  const message = `Data belum dapat ditampilkan. ${error.message} Letakkan hasil_olah_data_all.csv di folder data/ pada repositori GitHub Pages.`;
  status(message, "error");
  ["grafik-model", "estimasi-table", "grafik-rrmse", "rrmse-table"].forEach(id => showMessage(id, message));
  $("yearSelect").innerHTML = `<option value="">Data tidak tersedia</option>`;
  $("yearSelect").disabled = true;
  $("kec-filter").innerHTML = `<option value="all">Data belum tersedia</option>`;
  $("kec-filter").disabled = true;
  $("map-panel").hidden = true;
  $("map-fallback").hidden = false;
  $("map-fallback").querySelector("p").textContent = "CSV belum tersedia; peta dan tabel wilayah belum dapat ditampilkan.";
  showMessage("map-fallback-table", `Sumber yang diharapkan: ${CSV_FILE}`);
}

async function main() {
  try {
    await loadCsv();
    geometry = await loadGeoJsonOptional();
    enrichFromGeometry();
    renderHeader();
    renderYearFilters();
    const stats = allYearStats();
    renderMainChart(stats);
    renderEvaluation(stats);
    attachListeners();
    renderCurrentView();
  } catch (error) {
    renderError(error);
  }
}
document.addEventListener("DOMContentLoaded", main);
