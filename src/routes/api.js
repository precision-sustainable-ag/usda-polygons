import { pool } from 'simple-route';
import { makeSimpleRoute } from 'simple-route';

export default async function apiRoutes(app) {
  const simpleRoute = makeSimpleRoute(app, pool, { public: true });

  const lat = { type: 'number', required: true, examples: [35.77],  description: 'Latitude' };
  const lon = { type: 'number', required: true, examples: [-105.54], description: 'Longitude' };
  const polygon = { type: 'boolean', examples: [true], description: 'Include polygon WKT in response' };
  const state = { required: true, examples: ['NC'], description: 'Two-letter state code' };
  const mlra = { type: 'string', description: 'MLRA symbol (mlrarsym), e.g. "148A"' };

  const defaultParms = { lat, lon, polygon };
  const defaultOptions = { object: true, excludeNulls: true };

  console.log({ defaultOptions });

  const polygonSql = `
    CASE
      WHEN $3::boolean THEN ST_AsText(geometry)
      ELSE NULL
    END AS polygon
  `;

  const whereSQL = 'WHERE ST_Covers(geometry, ST_SetSRID(ST_Point($2, $1), 4269))';

  // -----------------------------------------------------------------------------------------------------------------------
  await simpleRoute('/county',
    'Geographic Lookup Endpoints',
    'County',
    `
      SELECT
        statefips,
        countyfips,
        county,
        state_code,
        state,
        Box2D(geometry) as bbox,
        ${polygonSql}
      FROM polygons.counties
      ${whereSQL}
    `,
    defaultParms,
    { ...defaultOptions },
  );

  await simpleRoute('/ecoregion',
    'Geographic Lookup Endpoints',
    'Ecoregion',
    `
      SELECT 
        ecoregion_code,
        ecoregion,
        Box2D(geometry) as bbox,
        ${polygonSql}
      FROM polygons.ecoregions
      ORDER BY ST_Distance(geometry, ST_SetSRID(ST_Point($2, $1), 4269))
      LIMIT 1
    `,
    defaultParms,
    { ...defaultOptions },
  );

  // -----------------------------------------------------------------------------------------------------------------------
  await simpleRoute('/hardiness',
    'Geographic Lookup Endpoints',
    'USDA Hardiness Zone',
    `
      SELECT
        ogc_fid,
        id,
        gridcode,
        zone,
        trange,
        Box2D(geometry) as bbox,
        ${polygonSql}
      FROM polygons.hardiness_zones
      ${whereSQL}
    `,
    defaultParms,
    { ...defaultOptions },
  );

  // -----------------------------------------------------------------------------------------------------------------------
  await simpleRoute('/lru',
    'Geographic Lookup Endpoints',
    'Land Resource Unit (LRU)',
    `
      SELECT
        lru,
        lru_description,
        seeding_start,
        seeding_end,
        Box2D(geometry) as bbox,
        ${polygonSql}
      FROM polygons.lru
      ${whereSQL}
    `,
    defaultParms,
    { ...defaultOptions },
  );

  // -----------------------------------------------------------------------------------------------------------------------
  await simpleRoute(
    '/mlra',
    'Geographic Lookup Endpoints',
    'Major Land Resource Area (MLRA)',
    `
      WITH params AS (
        SELECT
          NULLIF($1::text, '') AS mlra,
          NULLIF($2::text, '')::float8 AS lat,
          NULLIF($3::text, '')::float8 AS lon,
          COALESCE($4::boolean, false) AS polygon
      )
      SELECT
        mlrarsym,
        name AS mlra_name,
        lrrsym,
        lrrname,
        Box2D(geometry) as bbox,
        CASE WHEN params.mlra IS NOT NULL THEN ST_X(ST_PointOnSurface(geometry)) ELSE NULL END AS lon,
        CASE WHEN params.mlra IS NOT NULL THEN ST_Y(ST_PointOnSurface(geometry)) ELSE NULL END AS lat,
        CASE WHEN params.polygon THEN ST_AsText(geometry) ELSE NULL END AS polygon
      FROM polygons.mlra2022, params
      WHERE
        (
          params.mlra IS NOT NULL AND mlrarsym = params.mlra
        )
        OR
        (
          params.mlra IS NULL AND params.lat IS NOT NULL AND params.lon IS NOT NULL
          AND ST_Covers(geometry, ST_SetSRID(ST_Point(params.lon, params.lat), 4269))
        )
    `,
    {
      mlra,
      lat: { type: 'number' },
      lon: { type: 'number' },
      polygon
    },
    { ...defaultOptions },
  );  

  // -----------------------------------------------------------------------------------------------------------------------
  await simpleRoute(
    '/state',
    'Geographic Lookup Endpoints',
    'State',
    `
      WITH params AS (
        SELECT
          NULLIF($1::text, '') AS st,
          NULLIF($2::text, '')::float8 AS lat,
          NULLIF($3::text, '')::float8 AS lon,
          COALESCE($4::boolean, false) AS polygon
      )
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
        Box2D(geometry) AS bbox,
        CASE WHEN params.polygon THEN ST_AsText(geometry) ELSE NULL END AS polygon
      FROM polygons.us_states, params
      WHERE
        (
          params.st IS NOT NULL
          AND (state_code ILIKE params.st OR state ILIKE params.st)
        )
        OR
        (
          params.st IS NULL
          AND params.lat IS NOT NULL
          AND params.lon IS NOT NULL
          AND ST_Covers(geometry, ST_SetSRID(ST_Point(params.lon, params.lat), 4269))
        )
      LIMIT 1
    `,
    { state: { }, lat: { type: 'number' }, lon: { type: 'number' }, polygon },
    { ...defaultOptions },
  );
  
  await simpleRoute('/watershed',
    'Geographic Lookup Endpoints',
    'Watershed (HUC)',
    `
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
        Box2D(geometry) AS bbox,
        ${polygonSql}
      FROM polygons.watersheds
      ${whereSQL}
    `,
    defaultParms,
    { ...defaultOptions },
  );

  await simpleRoute('/csb',
    'Geographic Lookup Endpoints',
    'Crop Sequence Boundaries (CSB)',
    `
      SELECT
        land_cover,
        csbacres AS acres,
        Box2D(shape) AS bbox,
        ST_AsText(shape) AS polygon
      FROM csb.national1724 n
      LEFT JOIN csb.cdl_code_lookup c
      ON cdl2024 = code
      WHERE ST_Covers(shape, ST_SetSRID(ST_MakePoint($2, $1), 4326))
      LIMIT 1
    `,
    { lat, lon },
    { ...defaultOptions },
  );

  // -----------------------------------------------------------------------------------------------------------------------
  await simpleRoute('/info',
    'Reference Endpoints',
    'Combined location summary',
    `
      WITH closest_ecoregion AS (
        SELECT 
          ecoregion_code,
          ecoregion,
          Box2D(geometry) AS ecoregion_bbox
        FROM polygons.ecoregions
        ORDER BY ST_Distance(geometry, ST_SetSRID(ST_Point($2, $1), 4269))
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
        ON ST_Covers(mlra.geometry, ST_SetSRID(ST_Point($2, $1), 4269))
      LEFT JOIN polygons.hardiness_zones AS hardiness_zones
        ON ST_Covers(hardiness_zones.geometry, ST_SetSRID(ST_Point($2, $1), 4269))
      LEFT JOIN polygons.watersheds AS watersheds
        ON ST_Covers(watersheds.geometry, ST_SetSRID(ST_Point($2, $1), 4269))
      LEFT JOIN polygons.ecoregions AS ecoregions
        ON ST_Covers(ecoregions.geometry, ST_SetSRID(ST_Point($2, $1), 4269))
      LEFT JOIN polygons.lru AS lru
        ON ST_Covers(lru.geometry, ST_SetSRID(ST_Point($2, $1), 4269))
      LEFT JOIN polygons.us_states AS states
        ON ST_Covers(states.geometry, ST_SetSRID(ST_Point($2, $1), 4269))
      LEFT JOIN closest_ecoregion ON TRUE  -- Ensures closest ecoregion is always considered

      WHERE ST_Covers(counties.geometry, ST_SetSRID(ST_Point($2, $1), 4269))
    `,
    { lat, lon },
    { ...defaultOptions },
  );

  // -----------------------------------------------------------------------------------------------------------------------
  await simpleRoute('/counties',
    'Reference Endpoints',
    'Counties by state',
    `
      SELECT county FROM polygons.counties
      WHERE state_code=$1
      ORDER BY county
    `,
    { state },
    { array: true },
  );

  // -----------------------------------------------------------------------------------------------------------------------
  await simpleRoute('/states',
    'Reference Endpoints',
    'List of U.S. States',
    `
      SELECT
        state, state_code, statefp as fips,
        capital,
        lat AS capital_lat,
        lon AS capital_lon,
        Box2D(geometry) as bbox,
        ST_AsText(ST_Centroid(geometry)) AS centroid
      FROM polygons.us_states
      LEFT JOIN polygons.capitals
      USING(state_code)
      ORDER BY state
    `,
  );

  // -----------------------------------------------------------------------------------------------------------------------
  await simpleRoute('/validmlra',
    'Reference Endpoints',
    'Valid MLRA symbols',
    'SELECT DISTINCT mlrarsym FROM mlra2022 ORDER BY 1',
    {},
    { array: true },
  );
}
