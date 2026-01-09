const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

process.on('uncaughtException', (err) => {
  console.error(err);
  console.log('Node NOT Exiting...');
});

app.use(cors());              // handles all origins
app.options('*', cors());     // handles preflight, possible fix for USDA???
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use((err, req, res, next) => { // next is unused but required!
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(`${__dirname}/static`, { dotfiles: 'allow' }));

// routes
const polygons = require('./polygons');
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.all('/info', polygons.routeInfo);
app.all('/county', polygons.routeCounty);
app.all('/counties', polygons.routeCounties);
app.all('/ecoregion', polygons.routeEcoregion);
app.all('/hardiness', polygons.routeHardiness);
app.all('/lru', polygons.routeLRU);
app.all('/mlra', polygons.routeMLRA);
app.all('/state', polygons.routeState);
app.all('/states', polygons.routeStates);
app.all('/watershed', polygons.routeWatershed);
app.all('/validmlra', polygons.routeValidMLRA);

// start the server
app.listen(80, () => {
  console.log('Running!');
  console.log('_'.repeat(process.stdout.columns));
});

