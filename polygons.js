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
      countyns,
      affgeoid,
      geoid,
      county,
      namelsad,
      state_code,
      state,
      lsad,
      aland,
      awater,
      Box2D(geometry) as bbox
      POLYGON
    FROM polygons.counties
    WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeCounty

const routeHardiness = (req, res) => {
  query(req, res, `
    SELECT
      ogc_fid,
      id,
      gridcode,
      zone,
      trange,
      zonetitle,
      Box2D(geometry) as bbox
      POLYGON
    FROM polygons.hardiness_zones
    WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeHardiness

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

const routeInfo = (req, res) => {
  query(req, res, `
    SELECT
      counties.statefips,
      counties.countyfips,
      counties.countyns,
      counties.affgeoid,
      counties.geoid,
      counties.county,
      counties.namelsad,
      counties.state_code,
      counties.state,
      counties.lsad,
      counties.aland,
      counties.awater,
      Box2D(counties.geometry) as county_bbox,

      mlra.mlrarsym,
      mlra.name as mlra_name,
      mlra.lrrsym,
      mlra.lrrname,
      Box2D(mlra.geometry) as mlra_bbox,

      hardiness_zones.gridcode,
      hardiness_zones.zone,
      hardiness_zones.trange,
      hardiness_zones.zonetitle,
      Box2D(hardiness_zones.geometry) as hardiness_bbox

    FROM polygons.counties AS counties
    LEFT JOIN polygons.mlra AS mlra
      ON ST_Contains(mlra.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
    LEFT JOIN polygons.hardiness_zones AS hardiness_zones
      ON ST_Contains(hardiness_zones.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))

    WHERE ST_Contains(counties.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeInfo

module.exports = {
  routeInfo,
  routeCounty,
  routeHardiness,
  routeMLRA,
};
