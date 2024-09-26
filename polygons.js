const { pool } = require('./pools');

const query = async (req, res, query) => {
  const lat = +req.query.lat || +req.body.lat;
  const lon = +req.query.lon || +req.body.lon;
  const point = `POINT(${lon} ${lat})`;
  const polygon = (req.query.polygon || req.body.polygon) === 'true';

  query = query.replace('POLYGON', polygon ? ', ST_AsText(geometry) as polygon' : '');

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).send({ error: 'Invalid or missing latitude/longitude' });
  }

  try {
    const results = await pool.query(query, [point]);

    if (results.rows.length) {
      res.send(results.rows[0]);
    } else {
      res.send({});
    }
  } catch (err) {
    res.status(500).send({ error: 'Database error', details: err.message });
    console.error(err);
  }
}; // query

const routeCounty = (req, res) => {
  query(req, res, `
    SELECT
      statefips,
      countyfips,
      county,
      state_code,
      state,
      Box2D(geometry) as bbox
      POLYGON
    FROM polygons.counties
    WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeCounty

const routeEcoregion = (req, res) => {
  query(req, res, `
    SELECT
      ecoregion_code,
      ecoregion,
      Box2D(geometry) as bbox
      POLYGON
    FROM polygons.ecoregions
    WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeEcoregion

const routeHardiness = (req, res) => {
  query(req, res, `
    SELECT
      ogc_fid,
      id,
      gridcode,
      zone,
      trange,
      Box2D(geometry) as bbox
      POLYGON
    FROM polygons.hardiness_zones
    WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeHardiness

const routeLRU = (req, res) => {
  query(req, res, `
    SELECT
      lru,
      lru_description,
      lru.seeding_start,
      lru.seeding_end,
      Box2D(geometry) as bbox
      POLYGON
    FROM polygons.lru
    WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeLRU

const routeMLRA = (req, res) => {
  query(req, res, `
    SELECT
      mlrarsym,
      name,
      lrrsym,
      lrrname,
      Box2D(geometry) as bbox
      POLYGON
    FROM polygons.mlra
    WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeMLRA

const routeWatershed = (req, res) => {
  query(req, res, `
    SELECT
      huc12,
      watershed,
      huc10,
      huc10name,
      huc8,
      huc8name,
      huc6,
      huc6name,
      huc4,
      huc4name,
      huc2,
      huc2name,
      Box2D(geometry) as bbox
      POLYGON
    FROM polygons.watersheds
    WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeWatershed

const routeInfo = (req, res) => {
  query(req, res, `
    SELECT
      counties.statefips,
      counties.countyfips,
      counties.county,
      counties.state_code,
      counties.state,
      Box2D(counties.geometry) as county_bbox,

      mlra.mlrarsym,
      mlra.name as mlra_name,
      mlra.lrrsym,
      mlra.lrrname,
      Box2D(mlra.geometry) as mlra_bbox,

      hardiness_zones.gridcode,
      hardiness_zones.zone,
      hardiness_zones.trange,
      Box2D(hardiness_zones.geometry) as hardiness_bbox,

      watersheds.huc12,
      watersheds.watershed,
      watersheds.huc10,
      watersheds.huc10name,
      watersheds.huc8,
      watersheds.huc8name,
      watersheds.huc6,
      watersheds.huc6name,
      watersheds.huc4,
      watersheds.huc4name,
      watersheds.huc2,
      watersheds.huc2name,
      Box2D(watersheds.geometry) as watershed_bbox,

      ecoregions.ecoregion_code,
      ecoregions.ecoregion,
      Box2D(ecoregions.geometry) as ecoregion_bbox,

      lru.lru,
      lru.lru_description,
      lru.seeding_start,
      lru.seeding_end,
      Box2D(lru.geometry) as lru_bbox

    FROM polygons.counties AS counties
    LEFT JOIN polygons.mlra AS mlra
      ON ST_Contains(mlra.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN polygons.hardiness_zones AS hardiness_zones
      ON ST_Contains(hardiness_zones.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN polygons.watersheds AS watersheds
      ON ST_Contains(watersheds.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN polygons.ecoregions AS ecoregions
      ON ST_Contains(ecoregions.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN polygons.lru AS lru
      ON ST_Contains(lru.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))

    WHERE ST_Contains(counties.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeInfo

module.exports = {
  routeInfo,
  routeCounty,
  routeEcoregion,
  routeHardiness,
  routeLRU,
  routeMLRA,
  routeWatershed,
};
