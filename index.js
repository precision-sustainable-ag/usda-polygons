const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

process.on('uncaughtException', (err) => {
  console.error(err);
  console.log('Node NOT Exiting...');
});

app.use(cors());
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
app.all('/info', polygons.routeInfo);
app.all('/county', polygons.routeCounty);
app.all('/mlra', polygons.routeMLRA);

// start the server
app.listen(80, () => {
  console.log('Running!');
  console.log('_'.repeat(process.stdout.columns));
});

