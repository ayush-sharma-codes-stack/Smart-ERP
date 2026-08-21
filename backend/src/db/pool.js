const { Pool } = require('pg');
require('dotenv').config();

const isLocal = process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'));
const useSSL = process.env.NODE_ENV === 'production' || !isLocal;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Run a query against the pool.
 * @param {string} text - SQL query
 * @param {Array}  params - Query parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a client from the pool for transactions.
 * IMPORTANT: Always call client.release() in a finally block.
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
