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
let selectedKecamatan = null;

// =====================================================
// START
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    loadCSV
);



// =====================================================
// LOAD CSV
// =====================================================

async function loadCSV(){


    const response =
    await fetch(csvFile);


    const text =
    await response.text();



    dataset =
    Papa.parse(
        text,
        {
            header:true,
            dynamicTyping:false
        }
    ).data;



    // bersihkan data kosong

    dataset =
    dataset.filter(
        d =>
        d.kode_kecamatan_kemendagri
    );



    // normalisasi kode

    dataset.forEach(
        d=>{

            d.kode_kecamatan_kemendagri =
            String(
                d.kode_kecamatan_kemendagri
            )
            .trim();

            d.kab_kota =
            String(
                d.kab_kota
            )
            .trim();


            d.tahun =
            Number(
                d.tahun
            );


            d.EBLUP_ST =
            Number(
                d.EBLUP_ST
            );


            d.RRMSE_ST =
            Number(
                d.RRMSE_ST
            );

        }
    );



    console.log(
        "Data CSV:",
        dataset.length
    );

    initializeDashboard();

}




// =====================================================
// FILTER TAHUN
// =====================================================


function createFilter(){


    let tahunSelect =
    document.getElementById(
        "tahun-filter"
    );


    let tahunList =
    [
        ...new Set(
            dataset.map(
                d=>d.tahun
            )
        )
    ]
    .sort();

    tahunList.forEach(
        tahun=>{
            let option =
            document.createElement(
                "option"
            );

            option.value =
            tahun;

            option.text =
            tahun;

            tahunSelect
            .appendChild(
                option
            );

        }
    );

    tahunSelect.value =
    Math.max(
        ...tahunList
    );

    let kabSelect =
    document.getElementById(
        "kab-filter"
    );

    let kabList =
    [
    "Semua Kabupaten/Kota"
];

    let daftarKab =
    [
        ...new Set(
            dataset.map(
                d=>d.kab_kota
            )
        )
    ]
    .sort();

    kabList.push(
        ...daftarKab
    );

    kabList.forEach(
        kab=>{

            let option =
            document.createElement(
                "option"
            );

            option.value =
            kab;

            option.text =
            kab;

            kabSelect
            .appendChild(
                option
            );
        }
    );

    tahunSelect.addEventListener(
        "change",
        updateMap
    );
    kabSelect.addEventListener(
        "change",
        updateMap
    );
    let variableSelect =
    document.getElementById(
    "variable-filter"
    );

    variableSelect.addEventListener(
        "change",
        updateMap
    );
}


// =====================================================
// CHART
// =====================================================


function createCharts(){

    let tahun =
    [
        ...new Set(
            dataset.map(
                d=>d.tahun
            )
        )
    ]
    .sort();

    let direct = [];
    let st = [];

    tahun.forEach(
        t=>{
            let data =
            dataset.filter(
                d=>d.tahun===t
            );

            direct.push(
                mean(
                    data.map(
                        d=>
                        Number(
                            d.pengeluaran_mean
                        )
                    )
                )
            );

            st.push(
                mean(
                    data.map(
                        d=>
                        d.EBLUP_ST
                    )
                )
            );
        }
    );

    Plotly.newPlot(
        "grafik-model",
        [
            {
            x:tahun,
            y:direct,

            name:
            "Direct Estimate",

            type:
            "scatter"
            },

            {
            x:tahun,
            y:st,
            name:
            "ST-SAE",

            type:
            "scatter"
            }
        ],
        {

        template:
        "plotly_white",

        title:
        "Perkembangan Nilai Pengeluaran Per Kapita"
        }
    );

    createRRMSETable();

}

function createRRMSETable(){
    let models =
[
    {
        nama:"Direct Estimate",
        kolom:"RRMSE_direct"
    },

    {
        nama:"Spatial SAE",
        kolom:"RRMSE_Spatial"
    },

    {
        nama:"Temporal SAE",
        kolom:"RRMSE_Temporal"
    },

    {
        nama:"ST-SAE",
        kolom:"RRMSE_ST"
    }
];

let html = `
<table>
<tr>
<th>
Model
</th>
<th>
Rata-rata RRMSE
</th>
<th>
Kategori
</th>
</tr>
`;

models.forEach(
m=>{

let nilai =
mean(
dataset.map(
d=>Number(d[m.kolom])
)
);
html +=
`
<tr>
<td>
${m.nama}
</td>
<td>
${nilai.toFixed(2)} %
</td>
<td>
${kategoriRRMSE(nilai)}
</td>
</tr>
`;

});

html += "</table>";

document.getElementById(
"rrmse-table"
)
.innerHTML=html;
}

function kategoriRRMSE(x){
    if(x<=10)
    return "Sangat Baik";

    else if(x<=25)
    return "Baik";

    else if(x<=50)
    return "Kurang";

    else
    return "Sangat Kurang";
}

// =====================================================
// MAP
// =====================================================


async function createMap(){
    map =
    L.map(
        "map"
    )
    .setView(
        [-7.75,112.5],
        8
    );

    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
        attribution:
        "OpenStreetMap"
        }
    )

    .addTo(map);

    let legend =
    L.control(
    {
    position:"bottomright"
    }
    );

    legend.onAdd =
    function(){

    let div =
    L.DomUtil.create(
    "div",
    "legend"
    );

    div.innerHTML=
    `
    <b>
    Legenda
    </b>

    <br>

    <span class="box low"></span>
    Rendah

    <br>

    <span class="box mid"></span>
    Sedang

    <br>
    <span class="box high"></span>
    Tinggi
    `;
        return div;
        };

    legend.addTo(map);

    let response =
    await fetch(
        geojsonFile
    );

    geojsonData =
    await response.json();

    geoLayer =
    L.geoJSON(
        geojsonData,
        {
        style:
        {
        color:"#ffffff",
        weight:1,
        fillColor:"#CBD5E1",
        fillOpacity:0.8
        },

        onEachFeature:

        function(
            feature,
            layer
        ){


            layer.bindTooltip(

                feature.properties.kecamata

            );


        }


        }

    )

    .addTo(map);



    updateMap();


}






// =====================================================
// UPDATE MAP
// =====================================================


function updateMap(){
    if(!geoLayer)

    return;

    let tahun =
    Number(
        document.getElementById(
            "tahun-filter"
        ).value
    );

    let kab =
    document.getElementById(
        "kab-filter"
    ).value;

    let filtered;
    if(
        kab === "Semua Kabupaten/Kota"
){
        filtered =
        dataset.filter(
            d =>
            d.tahun===tahun
    );
}
    else{
        filtered =
        dataset.filter(
            d =>
            d.tahun===tahun
            &&
            d.kab_kota===kab
    );
}

    let valueMap = {};

    filtered.forEach(
        d=>{
            valueMap[
                d.kode_kecamatan_kemendagri
            ]
            =
            d.EBLUP_ST;
        }
    );

    let variable =
    document.getElementById(
        "variable-filter"
    )
    .value;

    valueMap[
    d.kode_kecamatan_kemendagri
    ]
    =
    Number(
        d[variable]
);

    geoLayer.eachLayer(
        layer=>{
            let kode =
            String(
                layer.feature.properties.kode_kec
            )
            .trim();

            let value =
            valueMap[kode];

            layer.setStyle(
                {
                fillColor:
                getColor(value),

                fillOpacity:
                0.75

                }

            );

            layer.bindPopup(
                `
                <b>
                ${layer.feature.properties.kecamata}
                </b>
                <br>
                
                <button onclick="showKecamatan('${kode}')">

                Lihat Tren
                </button>
                `
            );

        }

    );

    if(
kab !== "Semua Kabupaten/Kota"
){

let kodeKec =
filtered.map(
d=>d.kode_kecamatan_kemendagri
);

let bounds=[];

geoLayer.eachLayer(
layer=>{

let kode =
String(
layer.feature.properties.kode_kec
)
.trim();

if(
kodeKec.includes(kode)
){
bounds.push(
layer.getBounds()
);
}
}
);

if(bounds.length){
let group =
L.featureGroup(bounds);

map.fitBounds(
group.getBounds(),
{
padding:[20,20]
}
);
}
}
else{
    map.fitBounds(
    geoLayer.getBounds()
    );
}

}

function showKecamatan(kode){

    let data =
        dataset.filter(
        d=>
        d.kode_kecamatan_kemendagri
        ==
        kode
    );

    if(data.length===0)
    return;

    let terbaru =
        data.sort(
        (a,b)=>
        b.tahun-a.tahun
        )[0];

    document.getElementById(
    "profil-kecamatan"
    )
    .innerHTML =
    `
    <h2>
    ${terbaru.nama_kecamatan_bps}
    </h2>

    <p>
    Kabupaten/Kota:
    <b>
    ${terbaru.kab_kota}
    </b>
    </p>

    <div class="mini-stat">
    <div>
    <h3>
    Rp ${formatNumber(terbaru.EBLUP_ST)}
    </h3>

    <p>
    Estimasi ST-SAE (${terbaru.tahun})
    </p>

    </div>

    <div>

    <h3>
    ${Number(
    terbaru.RRMSE_ST
    ).toFixed(2)}%
    </h3>
    <p>
    RRMSE
    </p>
    </div>
    <div>
    <h3>
    ${terbaru.kategori_RRMSE_ST}
    </h3>
    <p>
    Kategori
    </p>
    </div>
    </div>
    `;

    let tahun =
    data.map(
    d=>d.tahun
    );

    let nilai =
    data.map(
    d=>d.EBLUP_ST
    );

    Plotly.newPlot(
    "grafik-kecamatan",

    [
    {
    x:tahun,
    y:nilai,
    mode:
    "lines+markers",
    name:
    "ST-SAE"
    }

    ],
    {

    template:
    "plotly_white",

    title:
    `Tren Estimasi ST-SAE ${terbaru.nama_kecamatan_bps}`
    }
    );

    let direct =
    Number(
    terbaru.pengeluaran_mean
    );

    let st =
    Number(
    terbaru.EBLUP_ST
    );

    let perubahan =
    (
    (st-direct)
    /
    direct
    )
    *100;
}


// =====================================================
// COLOR
// =====================================================


function getColor(value){


    if(!value)

    return "#E5E7EB";


    if(value < 1000000)

    return "#DBEAFE";


    if(value < 1500000)

    return "#60A5FA";


    if(value < 2000000)

    return "#2563EB";


    return "#1E3A8A";


}



// =====================================================
// UTIL
// =====================================================


function mean(arr){

    return arr.reduce(
        (a,b)=>a+b,
        0
    )
    /
    arr.length;

}


function formatNumber(num){

    return Number(num)
    .toLocaleString(
        "id-ID"
    );

}

function generateInsight(){
    let avgST =
    mean(

        dataset.map(
            d=>d.EBLUP_ST
        )

    );

    document.getElementById(
        "insight-text"
    )
    .innerHTML =

    `
    Rata-rata estimasi Spasio-Temporal SAE
    selama periode penelitian adalah:

    <h3>

    ${formatNumber(avgST)}

    </h3>

    juta rupiah per kapita.

    `;


}

function initializeDashboard(){
    createFilter();
    createCharts();
    createMap();
    createRanking();
    generateInsight();
    createInsight();

}

function createRanking(){

    let tahun=2025;

    let data =
    dataset.filter(
    d=>d.tahun==tahun
    );
    data.sort(
        (a,b)=>
            b.EBLUP_ST-a.EBLUP_ST
    );
    
    let top =
    data.slice(
        0,
        10
    );

Plotly.newPlot(

    "ranking",
    [{
        x:
        top.map(
        d=>d.nama_kecamatan_bps
    ),

        y:
        top.map(
        d=>d.EBLUP_ST
    ),
    
    type:"bar"

    }],

        {

        template:
            "plotly_white",

        title:
            "10 Kecamatan dengan Estimasi ST-SAE Tertinggi"

        }

    );
}

function createInsight(){

    let tahun =
    Math.max(
        ...dataset.map(
            d=>d.tahun
        )
    );


    let data =
    dataset.filter(
        d=>d.tahun===tahun
    );


    let tertinggi =
    data.sort(
        (a,b)=>
        b.EBLUP_ST-a.EBLUP_ST
    )[0];

    if(!tertinggi)
        return;

    document.getElementById(
        "insight-text"
    )
    .innerHTML =

    `
    Pada tahun ${tahun},
    estimasi ST-SAE tertinggi ditemukan
    pada Kecamatan
    <b>
    ${tertinggi.nama_kecamatan_bps}
    </b>
    dengan estimasi
    <b>
    Rp ${formatNumber(tertinggi.EBLUP_ST)}
    </b>
    per kapita.
    `;

}

const observer =
    new IntersectionObserver(
    entries=>{
        entries.forEach(
            entry=>{

    if(entry.isIntersecting){

    entry.target.classList.add(
    "show"
    );

    }

    });

    });


    document
    .querySelectorAll(".fade")
    .forEach(
    el=>observer.observe(el)
    );