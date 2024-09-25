# usda-polygons

**Date Created**: 09/23/2024

**Date Last Modified**: 09/25/2024

___

Examples:

- https://polygons.vegspec.org/county?lat=30.77&lon=-98.54&polygon=true
- https://polygons.vegspec.org/ecoregion?lat=30.77&lon=-98.54&polygon=true
- https://polygons.vegspec.org/hardiness?lat=30.77&lon=-98.54&polygon=true
- https://polygons.vegspec.org/mlra?lat=30.77&lon=-98.54&polygon=true
- https://polygons.vegspec.org/watershed?lat=30.77&lon=-98.54&polygon=true
- https://polygons.vegspec.org/info?lat=30.77&lon=-98.54

To exclude boundaries, remove `polygon=true`.

The **info** route contains data from all the routes *except* polygons, so use the other routes primarily when boundaries are needed.

___

## Data Sources
- MLRA 2006: [Dataset](https://aesl.ces.uga.edu/PSA/MLRA_2006_v.4.2.zip) - [Documentation](https://www.nrcs.usda.gov/resources/data-and-reports/major-land-resource-area-mlra)
- Counties: [Dataset](https://catalog.data.gov/dataset/2023-cartographic-boundary-file-kml-county-and-equivalent-for-united-states-1-500000/resource/2ccd7a0b-0752-4395-87ed-ee3762c37204) - [Documentation](https://www2.census.gov/geo/tiger/GENZ2023/description.pdf)
- Ecoregions: [Dataset](https://gaftp.epa.gov/EPADataCommons/ORD/Ecoregions/cec_na/na_cec_eco_l1.zip) - [Documentation](https://www.epa.gov/eco-research/ecoregions-north-america)

___

## Importing Steps

### Ecoregions

#### 1. Extract the Shapefile
- After extracting the contents of the Zip file, move to the directory where the shapefile is located.

#### 2. Convert Shapefile to CSV
- Run the following command to convert the shapefile to a CSV file with the geometry as WKT:

    ```
    ogr2ogr -f "CSV" ecoregions.csv NA_CEC_Eco_Level1.shp -lco GEOMETRY=AS_WKT -t_srs EPSG:4269
    ```

    *If you’re on Windows, you may need to open a GDAL command prompt first.*

#### 3. Import CSV into PostgreSQL using DBeaver
- Open DBeaver and connect to the database.
- Right-click the **polygons** schema and choose **Import Data**.
- Click **Next**, then select the `ecoregions.csv` file.
- Click **Next**, then click **Configure**.
- Change the **Target Type** of the `wkt` column to **text**.
- Click **OK**, then click **Next**, and finally click **Proceed** to complete the import.

#### 4. Run SQL Commands to Adjust the Table Structure
- After importing the CSV, run the following SQL commands to modify the table structure:

##### 4.1 Add a `geometry` column with SRID 4269:
```
ALTER TABLE ecoregions ADD COLUMN geometry geometry(Geometry, 4269);
```

##### 4.2 Populate the `geometry` column with the WKT data:
```
UPDATE ecoregions SET geometry = ST_SetSRID(ST_GeomFromText(wkt), 4269);
```

##### 4.3 Rename columns for clarity:
```
ALTER TABLE ecoregions RENAME COLUMN na_l1code TO ecoregion_code;
ALTER TABLE ecoregions RENAME COLUMN na_l1name TO ecoregion;
```

##### 4.4 Remove the `wkt` column:
```
ALTER TABLE ecoregions DROP COLUMN wkt;
```
