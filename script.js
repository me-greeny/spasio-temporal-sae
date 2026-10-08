// =====================================================
// KONFIGURASI FILE DATA
// =====================================================


const path = "data/";


const fileEstimasi =
    path + 
    "hasil_estimasi_STSAE_M87_level_kecamatan.csv";


const fileEvaluasi =
    path +
    "evaluasi_MSE_RRMSE_M87_tahunan.csv";


const fileCompare =
    path +
    "perbandingan_RRMSE_Direct_vs_M87.csv";


const fileModel =
    path +
    "evaluasi_semua_model_STSAE.csv";


const fileSpesifikasi =
    path +
    "spesifikasi_model_STSAE.csv";


const geojsonFile =
    path +
    "hasil_peta_STSAE_M87_simple.geojson";




// =====================================================
// GLOBAL VARIABLE
// =====================================================


let dataEstimasi = [];

let dataEvaluasi = [];

let dataCompare = [];

let dataModel = [];

let dataSpesifikasi = [];

let geoData;

let map;

let geoLayer;




// =====================================================
// START
// =====================================================


document.addEventListener(
    "DOMContentLoaded",
    loadAllData
);




// =====================================================
// LOAD SEMUA DATA
// =====================================================


async function loadAllData(){


    try{


        dataEstimasi =
            await loadCSV(fileEstimasi);


        dataEvaluasi =
            await loadCSV(fileEvaluasi);


        dataCompare =
            await loadCSV(fileCompare);


        dataModel =
            await loadCSV(fileModel);


        dataSpesifikasi =
            await loadCSV(fileSpesifikasi);



        geojsonData =
            await fetch(geojsonFile)
            .then(res=>res.json());



        console.log(
            "Estimasi:",
            dataEstimasi.length
        );


        console.log(
            "Evaluasi:",
            dataEvaluasi.length
        );


        console.log(
            "Model:",
            dataModel.length
        );



        cleanData();



        initializeDashboard();



    }

    catch(error){

        console.error(
            "Gagal membaca data:",
            error
        );

    }


}




// =====================================================
// PEMBACA CSV
// =====================================================


function loadCSV(file){


    return fetch(file)

    .then(response=>response.text())

    .then(text=>{


        return Papa.parse(
            text,
            {
                header:true,
                dynamicTyping:true,
                skipEmptyLines:true
            }

        ).data;


    });


}




// =====================================================
// MEMBERSIHKAN DATA
// =====================================================


function cleanData(){



    dataEstimasi =
        dataEstimasi.filter(
            d =>
            d.kode_kecamatan_kemendagri
        );



    dataEstimasi.forEach(d=>{


        d.kode_kecamatan_kemendagri =
            String(
                d.kode_kecamatan_kemendagri
            ).trim();



        d.tahun =
            Number(d.tahun);



        d.Direct_Estimate =
            Number(
                d.Direct_Estimate
            );



        d.STSAE_M87 =
            Number(
                d.STSAE_M87
            );



        d.RRMSE_M87 =
            Number(
                d.RRMSE_M87
            );



        d.RRMSE_Direct =
            Number(
                d.RRMSE_Direct
            );



    });



}

// =====================================================
// INITIAL DASHBOARD
// =====================================================


function initializeDashboard(){
    createFilter();

    createEvaluationTable();

    createCompareChart();

    createModelTable();

    createModelSpecification();

    initializeMap();

    createInsight();
}


// =====================================================
// FILTER
// =====================================================

function createFilter(){


const yearSelect =
document.getElementById(
"yearSelect"
);


const kabSelect =
document.getElementById(
"kab-filter"
);


const kecSelect =
document.getElementById(
"kec-filter"
);



// ===========================
// ISI FILTER KABUPATEN
// ===========================


let kabupaten = [

...new Set(

geoData.features.map(

f =>
f.properties.kab_kota

)

)

].sort();



kabupaten.forEach(kab=>{


let option =
document.createElement(
"option"
);


option.value = kab;

option.text = kab;


kabSelect.appendChild(option);


});





// ===========================
// EVENT TAHUN
// ===========================


yearSelect.addEventListener(

"change",

function(e){


selectedYear =
Number(
e.target.value
);



updateKecamatanFilter();


drawMap();



}

);





// ===========================
// EVENT KABUPATEN
// ===========================


kabSelect.addEventListener(

"change",

function(){


updateKecamatanFilter();


drawMap();



}

);





// ===========================
// EVENT KECAMATAN
// ===========================


kecSelect.addEventListener(

"change",

function(){


drawMap();


}

);



}

function updateKecamatanFilter(){


const kabSelect =
document.getElementById(
"kab-filter"
);



const kecSelect =
document.getElementById(
"kec-filter"
);



let kab =
kabSelect.value;




// reset

kecSelect.innerHTML = `

<option value="all">
Semua Kecamatan
</option>

`;





let kecamatan =
geoData.features

.filter(

f =>

f.properties.tahun
==
selectedYear

)

.filter(

f =>

kab=="all"

||

f.properties.kab_kota
==
kab

)

.map(

f=>

f.properties.kecamata

);



kecamatan = [

...new Set(kecamatan)

].sort();





kecamatan.forEach(kec=>{


let option =
document.createElement(
"option"
);


option.value=kec;

option.text=kec;


kecSelect.appendChild(option);



});


}

// =====================================================
// GRAFIK DIRECT VS ST-SAE
// =====================================================


function createTrendChart(){


let tahun =
[
...new Set(
dataEstimasi.map(
d=>d.tahun
))
]
.sort();



let direct=[];

let stsae=[];



tahun.forEach(t=>{


let subset =
dataEstimasi.filter(
d=>d.tahun===t
);



direct.push(
mean(
subset.map(
d=>d.Direct_Estimate
)
)
);



stsae.push(
mean(
subset.map(
d=>d.STSAE_M87
)
)
);



});




Plotly.newPlot(

"grafik-model",

[


{
x:tahun,

y:direct,

name:
"Direct Estimate",

type:"scatter",

mode:
"lines+markers"

},


{
x:tahun,

y:stsae,

name:
"ST-SAE M87",

type:"scatter",

mode:
"lines+markers"

}


],


{

title:
"Perbandingan Rata-rata Estimasi Direct dan ST-SAE M87",


template:
"plotly_white"

}



);


}

// =====================================================
// TABEL EVALUASI M87
// =====================================================


function createEvaluationTable(){


let container =
document.getElementById(
"rrmse-table"
);



let html = `


<table class="data-table">


<thead>

<tr>

<th>
Tahun
</th>

<th>
Mean MSE
</th>

<th>
Median MSE
</th>

<th>
Mean RRMSE
</th>

<th>
Median RRMSE
</th>

<th>
RRMSE < 25%
</th>


</tr>


</thead>



<tbody>


`;




dataEvaluasi.forEach(d=>{


html += `


<tr>


<td>
${d.tahun}
</td>


<td>
${formatNumber(d.Mean_MSE)}
</td>


<td>
${formatNumber(d.Median_MSE)}
</td>


<td>
${d.Mean_RRMSE.toFixed(2)}%
</td>


<td>
${d.Median_RRMSE.toFixed(2)}%
</td>


<td>
${d.Proporsi_RRMSE_kurang25.toFixed(2)}%
</td>


</tr>



`;



});



html += `

</tbody>

</table>


`;



container.innerHTML =
html;


}







// =====================================================
// GRAFIK PERBANDINGAN RRMSE
// =====================================================


function createCompareChart(){



let tahun =
dataCompare.map(
d=>d.tahun
);



Plotly.newPlot(

"grafik-rrmse",


[


{

x:tahun,

y:dataCompare.map(
d=>d.Mean_RRMSE_Direct
),

name:
"Direct Estimate",

type:
"scatter",

mode:
"lines+markers"

},


{

x:tahun,

y:dataCompare.map(
d=>d.Mean_RRMSE_M87
),

name:
"ST-SAE M87",

type:
"scatter",

mode:
"lines+markers"

}


],



{


title:
"Perbandingan Mean RRMSE Direct Estimate dan ST-SAE M87",


yaxis:

{

title:
"RRMSE (%)"

},


template:
"plotly_white"


}



);



}








// =====================================================
// TABEL EVALUASI SEMUA MODEL
// =====================================================


function createModelTable(){



let section =
document.createElement(
"section"
);



section.className =
"section";



section.innerHTML = `


<h2>
Perbandingan Kandidat Model ST-SAE
</h2>


<div class="table-container">

<table class="data-table">


<thead>

<tr>

<th>
Model
</th>


<th>
AIC
</th>


<th>
BIC
</th>


<th>
Mean MSE
</th>


<th>
Mean RSE
</th>


<th>
RSE <25%
</th>


</tr>


</thead>


<tbody>


${

dataModel.map(d=>`


<tr>


<td>
${d.Model}
</td>


<td>
${Number(d.AIC).toFixed(2)}
</td>


<td>
${Number(d.BIC).toFixed(2)}
</td>


<td>
${formatNumber(d.Mean_MSE)}
</td>


<td>
${Number(d.Mean_RSE).toFixed(2)}%
</td>


<td>
${Number(d["RSE < 25%"]).toFixed(2)}%
</td>


</tr>


`).join("")


}


</tbody>



</table>


</div>


`;



document.body.insertBefore(

section,

document.querySelector(
"footer"
)

);


}







// =====================================================
// SPESIFIKASI MODEL
// =====================================================


function createModelSpecification(){



let section =
document.createElement(
"section"
);



section.className =
"section";



section.innerHTML = `


<h2>
Variabel Penyusun Model
</h2>



<div class="table-container">


<table class="data-table">


<thead>


<tr>


<th>
Model
</th>


<th>
Jumlah Variabel
</th>


<th>
Variabel
</th>


</tr>


</thead>


<tbody>



${


dataSpesifikasi.map(d=>`


<tr>


<td>
${d.Model}
</td>


<td>
${d["Jumlah Variabel"]}
</td>


<td>
${d.Variabel}
</td>


</tr>


`).join("")



}



</tbody>


</table>


</div>


`;



document.body.insertBefore(

section,

document.querySelector(
"footer"
)

);



}


// =====================================================
// PETA ST-SAE M87
// =====================================================

let geojsonLayer;

let selectedYear =
2018;

let selectedModel =
"STSAE_M87";

let trendChart;



// ===============================
// INISIALISASI MAP
// ===============================


function initializeMap(){


map =
L.map(
"map"
).setView(

[
-7.1,
113.2
],

10

);



L.tileLayer(

"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

{

maxZoom:18

}

).addTo(map);



loadGeoJSON();


}







// ===============================
// LOAD GEOJSON
// ===============================


function loadGeoJSON(){



fetch(
"data/hasil_peta_STSAE_M87_simple.geojson"
)



.then(
response=>response.json()
)



.then(
data=>{


geoData =
data;



drawMap();



}

);



}







// ===============================
// WARNA BERDASARKAN NILAI ESTIMASI
// ===============================


function getColor(value){


return value > 2000000 ? "#800026" :

value > 1500000 ? "#BD0026" :

value > 1000000 ? "#E31A1C" :

value > 750000 ? "#FC4E2A" :

value > 500000 ? "#FD8D3C" :

value > 300000 ? "#FEB24C" :

"#FFEDA0";


}








// ===============================
// STYLE POLYGON
// ===============================


function styleFeature(feature){



let value;



if(selectedModel=="Direct_Estimate"){


value =
feature.properties.Direct_Estimate;


}

else{


value =
feature.properties[selectedModel];


}



return {


fillColor:
getColor(value),


weight:
1,


opacity:
1,


color:
"white",


fillOpacity:
0.7



};



}








// ===============================
// GAMBAR PETA
// ===============================

function drawMap(){

if(geojsonLayer){
geojsonLayer.remove();
}

let filteredData =
{

type:"FeatureCollection",


features:

geoData.features.filter(

feature=>{


let prop =
feature.properties;



let tahunOK =
prop.tahun
==
selectedYear;



let kab =
document
.getElementById(
"kab-filter"
)
.value;



let kec =
document
.getElementById(
"kec-filter"
)
.value;



let kabOK =
(
kab=="all"
||
prop.kab_kota==kab
);



let kecOK =
(
kec=="all"
||
prop.kecamata==kec
);




return (

tahunOK

&&

kabOK

&&

kecOK

);



}

)


};

geojsonLayer = L.geoJSON(filteredData, {
  style: styleFeature,
  onEachFeature: function(feature, layer) {
    layer.on({
      mouseover: function() {
        layer.setStyle({
          weight: 3,
          color: "black"
        });
      },

      mouseout: function() {
        geojsonLayer.resetStyle(layer);
      },

      click: function() {
        showPopup(feature.properties, layer);
      }
    });
  }
}).addTo(map);

map.fitBounds(
  geojsonLayer.getBounds()
);

createLegend();

}



// ===============================
// POPUP
// ===============================


function showPopup(data, layer){



let direct =
data.Direct_Estimate;



let stsae =
data.STSAE_M87;



let peningkatan =

(
(direct-stsae)
/direct
*100

).toFixed(2);




let html = `


<h3>
${data.kecamata}
</h3>


Kabupaten:
${data.kab_kota}


<br>

Tahun:
${data.tahun}


<hr>


Direct Estimate:

<br>

<b>
Rp ${formatNumber(direct)}
</b>


<br><br>


ST-SAE M87:

<br>

<b>
Rp ${formatNumber(stsae)}
</b>



<br><br>


Perubahan:

<br>

${peningkatan}%


`;



L.popup()

.setLatLng(
map.getCenter()
)
.setContent(html)
.openOn(map);

L.popup()

.setLatLng(
layer.getBounds().getCenter()
)
.setContent(html)
.openOn(map);

}

// ===============================
// LEGEND
// ===============================


function createLegend(){



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



div.innerHTML=`

<b>
Pengeluaran per Kapita
</b>

<br>

> 2 juta
<br>

1.5 - 2 juta
<br>

1 - 1.5 juta
<br>

750 ribu - 1 juta
<br>

500 - 750 ribu
<br>

300 - 500 ribu


`;



return div;



};



legend.addTo(map);



}

document
.getElementById("yearSelect")
.addEventListener(

"change",

function(e){


selectedYear =
parseInt(e.target.value);



drawMap();



}

);

document
.getElementById("yearSelect")
.addEventListener(

"change",

function(e){


selectedYear =
parseInt(e.target.value);



drawMap();



}

);

function createTrendChart(kode){


let dataKec =

geoData.features.filter(

f =>

f.properties.kode_kecamatan_bps
==
kode

);




let tahun =
dataKec.map(

f=>f.properties.tahun

);



let estimasi =
dataKec.map(

f=>f.properties.STSAE_M87

);



if(trendChart){

trendChart.destroy();

}



trendChart =

new Chart(

document
.getElementById("trendChart"),


{


type:"line",


data:{


labels:tahun,


datasets:[

{


label:"ST-SAE M87",

data:estimasi

}


]


}



}

);


}

function mean(arr){

return arr.reduce(
(a,b)=>a+b,
0
)
/ arr.length;

}

function formatNumber(value){

return Number(value)
.toLocaleString(
"id-ID"
);

}
