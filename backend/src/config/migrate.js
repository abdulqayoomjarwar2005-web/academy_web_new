const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db');
require('dotenv').config();

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running schema migration...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('Schema migration completed.');

    // Seed default owner account if none exists
    const ownerCheck = await client.query(
      `SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'owner') LIMIT 1`
    );

    if (ownerCheck.rows.length === 0) {
      const defaultPassword = process.env.DEFAULT_OWNER_PASSWORD || 'Aqayoom7878';
      const hash = await bcrypt.hash(defaultPassword, 10);

      await client.query(
        `INSERT INTO users (full_name, email, password_hash, role_id, must_change_password)
         VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = 'owner'), TRUE)`,
        [process.env.DEFAULT_OWNER_NAME || 'Abdul Qayoom', process.env.DEFAULT_OWNER_EMAIL || 'abdulqayoom@nb', hash]
      );

      console.log('-----------------------------------------------------');
      console.log('Default Owner account created:');
      console.log(`  Email:    ${process.env.DEFAULT_OWNER_EMAIL || 'abdulqayoom@nb'}`);
      console.log(`  Password: ${defaultPassword}`);
      console.log('  Please log in and change this password immediately.');
      console.log('-----------------------------------------------------');
    } else {
      console.log('Owner account already exists. Skipping seed.');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
