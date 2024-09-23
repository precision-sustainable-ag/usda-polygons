require('dotenv').config();

const { Pool } = require('pg');

const host = process.env.HOST;
const port = process.env.PORT;
const database = process.env.DATABASE;
const user = process.env.USER;
const password = process.env.PASSWORD;

// console.log({
//   host,
//   port,
//   database,
//   user,
//   password,
// });

const pool = new Pool({
  host,
  port,
  database,
  user,
  password,
  ssl: {
    rejectUnauthorized: false,
  },  
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Connected to the database at:', res.rows[0].now);
  }
});

module.exports = {
  pool,
};
