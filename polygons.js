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
      awater
      POLYGON
    FROM polygons.counties
    WHERE ST_Contains(geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeCounty

const routeMLRA = (req, res) => {
  query(req, res, `
    SELECT
      mlrarsym,
      name,
      lrrsym,
      lrrname
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

      mlra.mlrarsym,
      mlra.name as mlra_name,
      mlra.lrrsym,
      mlra.lrrname

    FROM polygons.counties AS counties
    LEFT JOIN polygons.mlra AS mlra
    ON ST_Contains(mlra.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))

    WHERE ST_Contains(counties.geometry, ST_SetSRID(ST_GeomFromText($1), 4269))
  `);
}; // routeInfo

module.exports = {
  routeInfo,
  routeCounty,
  routeMLRA,
};
