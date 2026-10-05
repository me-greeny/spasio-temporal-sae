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
        ...new Set(
            dataset.map(
                d=>d.kab_kota
            )
        )
    ]
    .sort();



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



    let filtered =
    dataset.filter(

        d =>

        d.tahun===tahun

        &&

        d.kab_kota===kab

    );



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

            Kabupaten/Kota:
            ${layer.feature.properties.kab_kota}

            <br><br>

            ST-SAE:
            ${value ? formatNumber(value) : "Tidak tersedia"}

            `

            );


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