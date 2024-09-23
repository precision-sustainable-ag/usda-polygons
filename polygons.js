const { pool } = require('./pools');

const routeMLRA = async (req, res) => {
  const lat = +req.query.lat || +req.body.lat;
  const lon = +req.query.lon || +req.body.lon;
  const polygon = (req.query.polygon || req.body.polygon) === 'true';

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).send({ error: 'Invalid or missing latitude/longitude' });
  }

  const point = `POINT(${lon} ${lat})`;

  const sq = `
    SELECT
      mlrarsym,
      name,
      lrrsym,
      lrrname
      ${polygon ? ', ST_AsText(geometry) as polygon' : ''}
    FROM polygons.mlra
    WHERE ST_Contains(geometry, ST_GeomFromText($1))
  `;

  try {
    const results = await pool.query(sq, [point]);

    if (results.rows.length) {
      res.send(results.rows[0]);
    } else {
      res.send({});
    }
  } catch (err) {
    res.status(500).send({ error: 'Database error', details: err.message });
    console.error(err);
  }
}; // routeMLRA

module.exports = {
  routeMLRA,
};
