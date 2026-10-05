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

    createFilter();

    createCharts();

    createMap();


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
        "Semua Kabupaten/Kota",
        ...[...new Set(
            dataset.map(
                d=>d.kab_kota
            )
        )].sort()
    ];

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

            kabSelect.value =
            "Semua Kabupaten/Kota";
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
        "Perkembangan Pengeluaran Per Kapita"
        }
    );

    createRRMSEChart();

}

function createRRMSEChart(){
    let models = [

        "RRMSE_direct",
        "RRMSE_Spatial",
        "RRMSE_Temporal",
        "RRMSE_ST"
    ];

    let values=[];

    models.forEach(
        m=>{
            let avg =
            mean(
                dataset.map(
                    d=>Number(d[m])
                )
            );

            values.push(avg);
        }
    );

    Plotly.newPlot(

        "grafik-rrmse-model",

        [

            {

            x:
            [
            "Direct",
            "Spatial SAE",
            "Temporal SAE",
            "ST-SAE"
            ],


            y:values,


            type:"bar"

            }

        ],


        {

        template:
        "plotly_white",

        title:
        "Perbandingan RRMSE Model"

        }

    );

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

    let bounds =
    [];

    geoLayer.eachLayer(
        layer=>{
            if(
                layer.feature.properties.kab_kota
                ===
                kab
            ){
                bounds.push(
                    layer.getBounds()
                );
            }
        }
    );

    if(bounds.length>0){
        let group =
        L.featureGroup(
            bounds
        );

        map.fitBounds(
            group.getBounds()
        );
    }
}
else{
    map.setView(
        [-7.75,112.5],
        8
    );
}

document.getElementById(
"map-info"
)
.innerHTML =

`
Menampilkan 
<b>
${filtered.length}
</b>
kecamatan
pada tahun
<b>
${tahun}
</b>
`;
}

function showKecamatan(kode){


    let data = dataset.filter(

        d=>

        d.kode_kecamatan_kemendagri
        ==
        kode

    );



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
        "Perkembangan ST-SAE Kecamatan"

        }
    );

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
    Rata-rata estimasi ST-SAE
    selama periode penelitian adalah:

    <h3>

    ${formatNumber(avgST)}

    </h3>

    rupiah per kapita.

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
        d=>d.kecamata
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