// 1. LOAD ASSET KECAMATAN (OUTPUT2)
var kec = ee.FeatureCollection("projects/skripsi-508300/assets/kecamatan_jatim");

Map.setCenter(112.5, -7.5, 8);
Map.addLayer(kec, {}, "Kecamatan di Jawa Timur");

// Rentang Tahun (2018–2025 agar variabel CO dari Sentinel-5P memiliki nilai lengkap)
var years = ee.List.sequence(2018, 2025);

// 2. PROSES EKSTRAKSI MULTI-VARIABLE PER TAHUN
var combined_result = ee.FeatureCollection(years.map(function(year){
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = start.advance(1, 'year');

  // A. NDVI (MODIS)
  var ndvi = ee.ImageCollection("MODIS/061/MOD13Q1")
    .filterDate(start, end)
    .select("NDVI")
    .mean()
    .multiply(0.0001)
    .rename("NDVI");

  // B. LST (MODIS)
  var lst = ee.ImageCollection("MODIS/061/MOD11A2")
    .filterDate(start, end)
    .select("LST_Day_1km")
    .mean()
    .multiply(0.02)
    .subtract(273.15)
    .rename("LST");

  // C. NTL (VIIRS)
  var ntl = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG")
    .filterDate(start, end)
    .select("avg_rad")
    .mean()
    .rename("NTL");

  // D. NDBI (Sentinel-2)
  var s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate(start, end)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    .median();
  var ndbi = s2.normalizedDifference(["B11", "B8"]).rename("NDBI");

  // E. CO (Sentinel-5P)
  var co = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CO")
    .filterDate(start, end)
    .select("CO_column_number_density")
    .mean()
    .rename("CO");

  // Gabungkan semua raster menjadi 1 Multiband Image
  var multiBandImage = ee.Image.cat([ndvi, lst, ntl, ndbi, co]);

  // Ekstraksi nilai rata-rata langsung pada asset output2
  return multiBandImage.reduceRegions({
    collection: kec,
    reducer: ee.Reducer.mean(),
    scale: 250 // Skala diatur ke 250m agar proses berjalan efisien tanpa memory error
  }).map(function(f){
    return f.set("tahun", year);
  });

})).flatten();

// Tampilkan contoh sampel data hasil di console
print("Sampel Hasil Ekstraksi Kecamatan di Provinsi Jawa Timur:", combined_result.first());

// 3. EXPORT SINGLE CSV TO DRIVE
Export.table.toDrive({
  collection: combined_result,
  description: "data_satelit_kecamatan_2018_2025",
  fileFormat: "CSV"
});
