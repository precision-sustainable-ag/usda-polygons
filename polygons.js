const { pool } = require('./pools');

const query = async (req, res, query) => {
  const lat = +req.query.lat || +req.body.lat;
  const lon = +req.query.lon || +req.body.lon;
  const state = req.query.state || req.body.state;
  const point = state || `POINT(${lon} ${lat})`;
  const polygon = (req.query.polygon || req.body.polygon) === 'true';

  query = query.replace('POLYGON', polygon ? ', ST_AsText(geometry) as polygon' : '');

  if (!state && (isNaN(lat) || isNaN(lon))) {
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

const routeCounties = async (req, res) => {
  const { state } = req.query;
  const { rows } = await pool.query(`
    SELECT county FROM polygons.counties
    WHERE state_code=$1
    ORDER BY county
  `, [state]);

  res.json(rows.map((row) => row.county));
}; // routeCounties

const routeStates = async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      state, state_code, statefp as fips,
      Box2D(geometry) as bbox,
      ST_AsText(ST_Centroid(geometry)) AS centroid
    FROM polygons.us_states
    ORDER BY state
  `);

  res.json(rows);
}; // routeCounties

const routeEcoregion = (req, res) => {
  query(req, res, `
    SELECT 
      ecoregion_code,
      ecoregion,
      Box2D(geometry) as bbox,
      ST_AsText(geometry) AS polygon
    FROM polygons.ecoregions
    ORDER BY ST_Distance(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LIMIT 1;
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

const routeMLRA = async (req, res) => {
  if (req.query.mlra) {
    const results = await pool.query(`
      SELECT
        mlrarsym,
        name AS mlra_name,
        lrrsym,
        lrrname,
        Box2D(geometry) AS bbox,
        ST_X(ST_PointOnSurface(geometry)) AS lon,
        ST_Y(ST_PointOnSurface(geometry)) AS lat
      FROM polygons.mlra2022
      WHERE mlrarsym=$1
    `, [req.query.mlra]);
    
    res.json(results.rows[0]);
  } else {
    query(req, res, `
      SELECT
        mlrarsym,
        name AS mlra_name,
        lrrsym,
        lrrname,
        Box2D(geometry) as bbox
        POLYGON
      FROM polygons.mlra2022
      WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    `);
  }
}; // routeMLRA

const routeState = (req, res) => {
  const state = req.query.state || req.body.state
  if (state) {
    query(req, res, `
      SELECT
        state_code,
        state,
        region,
        division,
        statefp,
        statens,
        geoid,
        geoidfq,
        lsad,
        mtfcc,
        funcstat,
        aland,
        awater,
        intptlat,
        intptlon,
        Box2D(geometry) as bbox
        POLYGON
      FROM polygons.us_states
      WHERE
        state_code ilike $1 OR state ilike $1
    `);
  } else {
    query(req, res, `
      SELECT
        state_code,
        state,
        region,
        division,
        statefp,
        statens,
        geoid,
        geoidfq,
        lsad,
        mtfcc,
        funcstat,
        aland,
        awater,
        intptlat,
        intptlon,
        Box2D(geometry) as bbox
        POLYGON
      FROM polygons.us_states
      WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    `);
  }
}; // routeCounty

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
    WITH closest_ecoregion AS (
      SELECT 
        ecoregion_code,
        ecoregion,
        Box2D(geometry) as ecoregion_bbox
      FROM polygons.ecoregions
      ORDER BY ST_Distance(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
      LIMIT 1
    )
    
    SELECT 
      counties.statefips,
      counties.countyfips,
      counties.county,
      counties.state_code,
      counties.state,
      Box2D(counties.geometry) as county_bbox,

      mlra.mlrarsym,
      mlra.name AS mlra_name,
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

      COALESCE(ecoregions.ecoregion_code, closest_ecoregion.ecoregion_code) AS ecoregion_code,
      COALESCE(ecoregions.ecoregion, closest_ecoregion.ecoregion) AS ecoregion,
      COALESCE(Box2D(ecoregions.geometry), closest_ecoregion.ecoregion_bbox) AS ecoregion_bbox,

      lru.lru,
      lru.lru_description,
      lru.seeding_start,
      lru.seeding_end,
      Box2D(lru.geometry) as lru_bbox,

      Box2D(states.geometry) as state_bbox

    FROM polygons.counties AS counties
    LEFT JOIN polygons.mlra2022 AS mlra
      ON ST_Contains(mlra.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN polygons.hardiness_zones AS hardiness_zones
      ON ST_Contains(hardiness_zones.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN polygons.watersheds AS watersheds
      ON ST_Contains(watersheds.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN polygons.ecoregions AS ecoregions
      ON ST_Contains(ecoregions.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN polygons.lru AS lru
      ON ST_Contains(lru.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN polygons.us_states AS states
      ON ST_Contains(states.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN closest_ecoregion ON TRUE  -- Ensures closest ecoregion is always considered

    WHERE ST_Contains(counties.geometry, ST_SetSRID(ST_GeomFromText($1), 4269));
  `);
}; // routeInfo

const routeValidMLRA = async (req, res) => {
  try {
    const results = await pool.query('SELECT DISTINCT mlrarsym FROM mlra2022 ORDER BY 1;');

    if (results.rows.length) {
      res.send(results.rows.map((row) => row.mlrarsym));
    } else {
      res.send({});
    }
  } catch (err) {
    res.status(500).send({ error: 'Database error', details: err.message });
    console.error(err);
  }
}; // routeValidMLRA

module.exports = {
  routeInfo,
  routeCounty,
  routeCounties,
  routeEcoregion,
  routeHardiness,
  routeLRU,
  routeMLRA,
  routeState,
  routeStates,
  routeValidMLRA,
  routeWatershed,
};
