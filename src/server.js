import { setup } from 'simple-route';

import apiRoutes from './routes/api.js';

await setup({
  title: 'Polygons API',
  version: '1.0.0',
  trusted: ['https://polygons.vegspec.org', 'https://developpolygons.vegspec.org'],
  plugins: {
    '': apiRoutes,
  },
});
