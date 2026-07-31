import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export async function query(text: string, params?: any[]) {
  if (!pool) {
    console.warn('Database URL not configured in env. Query execution skipped.');
    return { rows: [], rowCount: 0 };
  }
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.slice(0, 80), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function initDbSchema() {
  if (!pool) return;
  
  const createTablesQuery = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vocab_progress (
      id SERIAL PRIMARY KEY,
      user_id UUID,
      vocab_id VARCHAR(100) NOT NULL,
      learned BOOLEAN DEFAULT FALSE,
      times_reviewed INT DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id UUID,
      vocab_id VARCHAR(100) NOT NULL,
      note TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reading_passages (
      id SERIAL PRIMARY KEY,
      user_id UUID,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      questions_json JSONB NOT NULL,
      topic VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reading_results (
      id SERIAL PRIMARY KEY,
      user_id UUID,
      passage_id INT,
      user_answers_json JSONB NOT NULL,
      score INT NOT NULL,
      feedback_json JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS writing_submissions (
      id SERIAL PRIMARY KEY,
      user_id UUID,
      prompt_english TEXT NOT NULL,
      user_german_text TEXT NOT NULL,
      score INT NOT NULL,
      feedback_json JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS listening_results (
      id SERIAL PRIMARY KEY,
      user_id UUID,
      dialogue_title VARCHAR(255) NOT NULL,
      score INT NOT NULL,
      total_questions INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS youtube_transcripts (
      id SERIAL PRIMARY KEY,
      user_id UUID,
      video_url TEXT NOT NULL,
      video_title VARCHAR(255) NOT NULL,
      transcript TEXT NOT NULL,
      vocab_json JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await query(createTablesQuery);
    console.log('PostgreSQL database schema initialized successfully.');
  } catch (err) {
    console.error('Error initializing schema:', err);
  }
}
