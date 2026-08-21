/**
 * Simple sequential migration runner.
 * Reads all .sql files from /migrations in order and executes them.
 * Tracks applied migrations in a `schema_migrations` table.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { pool } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
  return new Set(rows.map((r) => r.filename));
}

async function runMigrations(closePool = true) {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // lexicographic = numeric order via 001_, 002_ prefix

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  [skip] ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`  [run]  ${file}`);
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      count++;
    }

    await client.query('COMMIT');
    console.log(`\nMigrations complete. ${count} new migration(s) applied.\n`);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('\nMigration failed — rolled back.\n', err.message);
    if (closePool) process.exit(1);
    throw err;
  } finally {
    if (client) client.release();
    if (closePool) await pool.end();
  }
}

if (require.main === module) {
  runMigrations(true);
}

module.exports = { runMigrations };
