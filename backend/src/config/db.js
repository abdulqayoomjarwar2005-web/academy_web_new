const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

// Force IPv4 resolution: Railway's container network can't route IPv6,
// but Supabase hosts are dual-stack and Node prefers AAAA (IPv6) records
// by default, causing ENETUNREACH. Overriding lookup pins it to IPv4.
const forceIPv4Lookup = (hostname, options, callback) => {
  dns.lookup(hostname, { family: 4 }, callback);
};

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  lookup: forceIPv4Lookup,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

module.exports = pool;
