// =====================================================
// CONFIGURATION
// =====================================================
const csvFile = "data/hasil_webstory.csv";
const geojsonFile = "data/kecamatan_jatim.geojson";

// =====================================================
// GLOBAL VARIABLE
// =====================================================
let dataset = [];
let geojsonData = null;
let map;
let geoLayer;

// =====================================================
// START
// =====================================================
document.addEventListener("DOMContentLoaded", loadCSV);

// =====================================================
// LOAD CSV
// =====================================================
async function loadCSV() {
    try {
        const response = await fetch(csvFile);
        const text = await response.text();

        dataset = Papa.parse(text, {
            header: true,
            dynamicTyping: false
        }).data;

        // bersihkan data kosong
        dataset = dataset.filter(d => d.kode_kecamatan_kemendagri);

        // normalisasi kode
        dataset.forEach(d => {
            d.kode_kecamatan_kemendagri = String(d.kode_kecamatan_kemendagri).trim();
            d.kab_kota = String(d.kab_kota).trim();
            d.tahun = Number(d.tahun);
            d.EBLUP_ST = Number(d.EBLUP_ST);
            d.RRMSE_ST = Number(d.RRMSE_ST);
            d.pengeluaran_mean = Number(d.pengeluaran_mean);
        });

        console.log("Data CSV:", dataset.length);
        initializeDashboard();
    } catch (e) {
        console.error("Error loading CSV:", e);
    }
}

// =====================================================
// FILTER TAHUN
// =====================================================
function createFilter() {
    let tahunSelect = document.getElementById("tahun-filter");
    let tahunList = [...new Set(dataset.map(d => d.tahun))].sort();

    tahunList.forEach(tahun => {
        let option = document.createElement("option");
        option.value = tahun;
        option.text = tahun;
        tahunSelect.appendChild(option);
    });
    tahunSelect.value = Math.max(...tahunList);

    let kabSelect = document.getElementById("kab-filter");
    let kabList = ["Semua Kabupaten/Kota"];
    let daftarKab = [...new Set(dataset.map(d => d.kab_kota))].sort();
    kabList.push(...daftarKab);

    kabList.forEach(kab => {
        let option = document.createElement("option");
        option.value = kab;
        option.text = kab;
        kabSelect.appendChild(option);
    });

    tahunSelect.addEventListener("change", updateMap);
    kabSelect.addEventListener("change", updateMap);
    
    let variableSelect = document.getElementById("variable-filter");
    variableSelect.addEventListener("change", updateMap);
}

// =====================================================
// CHART
// =====================================================
function createCharts() {
    let tahun = [...new Set(dataset.map(d => d.tahun))].sort();
    let direct = [];
    let st = [];

    tahun.forEach(t => {
        let data = dataset.filter(d => d.tahun === t);
        direct.push(mean(data.map(d => d.pengeluaran_mean)));
        st.push(mean(data.map(d => d.EBLUP_ST)));
    });

    Plotly.newPlot("grafik-model", [
        { x: tahun, y: direct, name: "Direct Estimate", type: "scatter", mode: 'lines+markers', line: {shape: 'spline', width: 3}, marker: {size: 8} },
        { x: tahun, y: st, name: "ST-SAE", type: "scatter", mode: 'lines+markers', line: {shape: 'spline', color: '#2563EB', width: 3}, marker: {size: 8} }
    ], {
        template: "plotly_white",
        title: "Perkembangan Nilai Pengeluaran Per Kapita",
        margin: {t: 60, b: 100, l: 60, r: 30},
        xaxis: { automargin: true },
        yaxis: { automargin: true },
        legend: { orientation: "h", yanchor: "top", y: -0.2, xanchor: "center", x: 0.5 },
        hovermode: "x unified",
        height: 500
    }, {responsive: true});

    createRRMSETable();
}

function createRRMSETable() {
    let models = [
        { nama: "Direct Estimate", kolom: "RRMSE_direct" },
        { nama: "Spatial SAE", kolom: "RRMSE_Spatial" },
        { nama: "Temporal SAE", kolom: "RRMSE_Temporal" },
        { nama: "ST-SAE", kolom: "RRMSE_ST" }
    ];

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Model</th>
                    <th>Rata-rata RRMSE</th>
                    <th>Kategori</th>
                </tr>
            </thead>
            <tbody>
    `;

    models.forEach(m => {
        let nilai = mean(dataset.map(d => Number(d[m.kolom]) || 0));
        let cat = kategoriRRMSE(nilai);
        html += `
            <tr>
                <td>${m.nama}</td>
                <td>${nilai.toFixed(2)} %</td>
                <td><span class="badge ${cat.toLowerCase().replace(' ', '-')}">${cat}</span></td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    document.getElementById("rrmse-table").innerHTML = html;
}

function kategoriRRMSE(x) {
    if (x <= 10) return "Sangat Baik";
    if (x <= 25) return "Baik";
    if (x <= 50) return "Kurang";
    return "Sangat Kurang";
}

// =====================================================
// MAP
// =====================================================
async function createMap() {
    map = L.map("map").setView([-7.75, 112.5], 8);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "OpenStreetMap"
    }).addTo(map);

    let legend = L.control({ position: "bottomright" });
    legend.onAdd = function () {
        let div = L.DomUtil.create("div", "legend");
        div.innerHTML = `
            <b>Legenda Pengeluaran</b><br>
            <div class="legend-item"><span class="box low"></span>&lt; 1 Juta</div>
            <div class="legend-item"><span class="box mid1"></span>1 Juta - 1.5 Juta</div>
            <div class="legend-item"><span class="box mid2"></span>1.5 Juta - 2 Juta</div>
            <div class="legend-item"><span class="box high"></span>&gt; 2 Juta</div>
        `;
        return div;
    };
    legend.addTo(map);

    try {
        let response = await fetch(geojsonFile);
        geojsonData = await response.json();

        geoLayer = L.geoJSON(geojsonData, {
            style: {
                color: "#ffffff",
                weight: 1,
                fillColor: "#CBD5E1",
                fillOpacity: 0.8
            },
            onEachFeature: function (feature, layer) {
                layer.bindTooltip(feature.properties.kecamata || "Tidak diketahui");
            }
        }).addTo(map);

        updateMap();
    } catch (e) {
        console.error("Error loading GeoJSON:", e);
    }
}

// =====================================================
// UPDATE MAP
// =====================================================
function updateMap() {
    if (!geoLayer) return;

    let tahun = Number(document.getElementById("tahun-filter").value);
    let kab = document.getElementById("kab-filter").value;
    let variable = document.getElementById("variable-filter").value;

    let filtered = dataset.filter(d => d.tahun === tahun);
    if (kab !== "Semua Kabupaten/Kota") {
        filtered = filtered.filter(d => d.kab_kota === kab);
    }

    let valueMap = {};
    filtered.forEach(d => {
        valueMap[d.kode_kecamatan_kemendagri] = Number(d[variable]) || 0;
    });

    geoLayer.eachLayer(layer => {
        let kode = String(layer.feature.properties.kode_kec).trim();
        let value = valueMap[kode];

        layer.setStyle({
            fillColor: getColor(value, variable),
            fillOpacity: 0.85
        });

        let kecName = layer.feature.properties.kecamata || "Tidak diketahui";
        let valText = value ? (variable.includes('RRMSE') ? value.toFixed(2) + '%' : 'Rp ' + formatNumber(value)) : 'Tidak ada data';
        let varNameText = document.querySelector(`#variable-filter option[value="${variable}"]`).text;

        layer.bindPopup(`
            <div style="font-family: Inter, sans-serif;">
                <b style="font-size: 16px; color: #1e3a8a;">${kecName}</b><br>
                <span style="font-size: 13px; color: #64748b;">${varNameText}:</span><br>
                <b style="font-size: 14px;">${valText}</b><br>
                <button class="btn-primary" onclick="showKecamatan('${kode}')" style="margin-top: 10px; width: 100%;">Lihat Tren Detail</button>
            </div>
        `);
    });

    if (kab !== "Semua Kabupaten/Kota") {
        let kodeKec = filtered.map(d => d.kode_kecamatan_kemendagri);
        let bounds = [];
        geoLayer.eachLayer(layer => {
            let kode = String(layer.feature.properties.kode_kec).trim();
            if (kodeKec.includes(kode)) {
                bounds.push(layer.getBounds());
            }
        });
        if (bounds.length) {
            let group = L.featureGroup(bounds);
            map.fitBounds(group.getBounds(), { padding: [20, 20] });
        }
    } else {
        map.fitBounds(geoLayer.getBounds());
    }
}

window.showKecamatan = function(kode) {
    let data = dataset.filter(d => d.kode_kecamatan_kemendagri === kode);
    if (data.length === 0) return;

    let terbaru = data.sort((a, b) => b.tahun - a.tahun)[0];
    
    let profilKecamatan = document.getElementById("profil-kecamatan");
    profilKecamatan.style.display = "block";

    profilKecamatan.innerHTML = `
        <h2 style="margin-bottom: 5px; font-size: 28px;">${terbaru.nama_kecamatan_bps}</h2>
        <p style="color: #64748b; font-size: 16px;">Kabupaten/Kota: <b>${terbaru.kab_kota}</b></p>

        <div class="mini-stat">
            <div>
                <h3 style="font-size: 24px;">Rp ${formatNumber(terbaru.EBLUP_ST)}</h3>
                <p>Estimasi ST-SAE (${terbaru.tahun})</p>
            </div>
            <div>
                <h3 style="font-size: 24px;">${Number(terbaru.RRMSE_ST).toFixed(2)}%</h3>
                <p>RRMSE</p>
            </div>
            <div>
                <h3 style="font-size: 24px;">${terbaru.kategori_RRMSE_ST || kategoriRRMSE(terbaru.RRMSE_ST)}</h3>
                <p>Kategori RRMSE</p>
            </div>
        </div>
    `;

    // Ensure chart container is displayed properly before plotting
    document.getElementById("grafik-kecamatan").style.display = "block";
    
    let tahun = data.map(d => d.tahun).sort();
    let nilai = data.map(d => d.EBLUP_ST);

    Plotly.newPlot("grafik-kecamatan", [{
        x: tahun,
        y: nilai,
        mode: "lines+markers",
        name: "ST-SAE",
        line: {shape: 'spline', color: '#2563EB', width: 3},
        marker: {size: 8}
    }], {
        template: "plotly_white",
        title: `Tren Estimasi ST-SAE ${terbaru.nama_kecamatan_bps}`,
        margin: {t: 60, b: 100, l: 60, r: 30},
        xaxis: { automargin: true },
        yaxis: { automargin: true },
        legend: { orientation: "h", yanchor: "top", y: -0.2, xanchor: "center", x: 0.5 },
        hovermode: "x unified",
        height: 500
    }, {responsive: true});

    profilKecamatan.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// =====================================================
// COLOR
// =====================================================
function getColor(value, variable) {
    if (!value) return "#E5E7EB";

    if (variable && variable.includes('RRMSE')) {
        if (value <= 10) return "#DBEAFE"; // Sangat baik
        if (value <= 25) return "#60A5FA"; // Baik
        if (value <= 50) return "#2563EB"; // Kurang
        return "#1E3A8A"; // Sangat Kurang
    }

    if (value < 1000000) return "#DBEAFE";
    if (value < 1500000) return "#60A5FA";
    if (value < 2000000) return "#2563EB";
    return "#1E3A8A";
}

// =====================================================
// UTIL
// =====================================================
function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatNumber(num) {
    return Number(num).toLocaleString("id-ID", {
        maximumFractionDigits: 0
    });
}

function generateInsight() {
    let avgST = mean(dataset.map(d => d.EBLUP_ST));
    document.getElementById("insight-text").innerHTML = `
        Rata-rata estimasi Spasio-Temporal SAE selama periode penelitian adalah:
        <h3 style="color: #1e40af; font-size: 32px; margin: 15px 0;">Rp ${formatNumber(avgST)}</h3>
        rupiah per kapita.
    `;
}

function initializeDashboard() {
    createFilter();
    createCharts();
    createMap();
    createRanking();
    generateInsight();
    createInsight();
    
    // Hide empty elements initially
    document.getElementById("grafik-kecamatan").style.display = "none";
}

function createRanking() {
    let tahun = Math.max(...dataset.map(d => d.tahun));
    let data = dataset.filter(d => d.tahun == tahun);
    data.sort((a, b) => b.EBLUP_ST - a.EBLUP_ST);
    let top = data.slice(0, 10).reverse(); // Reverse for horizontal bar chart

    Plotly.newPlot("ranking", [{
        y: top.map(d => d.nama_kecamatan_bps),
        x: top.map(d => d.EBLUP_ST),
        type: "bar",
        orientation: 'h',
        marker: { color: '#2563EB' }
    }], {
        template: "plotly_white",
        title: `10 Kecamatan dengan Estimasi ST-SAE Tertinggi (${tahun})`,
        margin: {t: 60, b: 90, l: 40, r: 40},
        xaxis: { automargin: true },
        yaxis: { automargin: true },
        height: 500
    }, {responsive: true});
}

function createInsight() {
    let tahun = Math.max(...dataset.map(d => d.tahun));
    let data = dataset.filter(d => d.tahun === tahun);
    let tertinggi = data.sort((a, b) => b.EBLUP_ST - a.EBLUP_ST)[0];

    if (!tertinggi) return;

    let div = document.createElement("div");
    div.innerHTML = `
        <p style="margin-top: 15px;">Pada tahun ${tahun}, estimasi ST-SAE tertinggi ditemukan pada Kecamatan <b>${tertinggi.nama_kecamatan_bps}</b> dengan estimasi <b>Rp ${formatNumber(tertinggi.EBLUP_ST)}</b> per kapita.</p>
    `;
    document.getElementById("insight-text").appendChild(div);
}

// Intersection Observer for scroll animations
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll(".fade").forEach(el => observer.observe(el));