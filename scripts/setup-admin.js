const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) connectionString = match[1].trim();
  }
}

if (!connectionString) {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) connectionString = match[1].trim();
  }
}

async function setupAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] || 'awaistahseenaccoun@gmail.com';
  const password = args[1] || 'Awaistahseenawais@123';

  if (!connectionString) {
    console.error('Error: DATABASE_URL is not set in environment, .env.local, or .env file.');
    process.exit(1);
  }

  console.log(`Connecting to Neon PostgreSQL database...`);
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();

    // 2. Upsert user with UUID
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) 
       DO UPDATE SET password_hash = $3
       RETURNING id, email, created_at;`,
      [userId, email, hash]
    );

    console.log('====================================================');
    console.log(' SUCCESS: Admin User Setup Complete with UUID in Neon DB!');
    console.log(` Email   : ${result.rows[0].email}`);
    console.log(` UUID ID : ${result.rows[0].id}`);
    console.log('====================================================');
  } catch (err) {
    console.error('Failed to setup admin user:', err.message);
  } finally {
    await pool.end();
  }
}

setupAdmin();
