const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log('Tables:', tables.rows.map(r => r.table_name));
  
  for (const t of tables.rows.map(r => r.table_name)) {
    const count = await pool.query(`SELECT COUNT(*) FROM "${t}"`);
    console.log(`- ${t}: ${count.rows[0].count}`);
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
