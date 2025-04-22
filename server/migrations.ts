
import { db } from './db';
import * as schema from '@shared/schema';
import { sql } from 'drizzle-orm';

export async function runMigrations() {
  try {
    // Determine if we're using PostgreSQL or SQLite
    const isPostgres = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sqlite');

    if (isPostgres) {
      // Add columns to existing tables if they don't exist
      try {
        await db.execute(sql`
          ALTER TABLE courses ADD COLUMN IF NOT EXISTS creator_id INTEGER REFERENCES users(id);
          ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE NOT NULL;
          ALTER TABLE test_series ADD COLUMN IF NOT EXISTS creator_id INTEGER REFERENCES users(id);
        `);
        console.log('Added new columns for teacher features');
      } catch (e) {
        console.error('Error adding columns:', e);
      }

      // PostgreSQL migrations
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          full_name TEXT NOT NULL,
          phone TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS courses (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          duration TEXT NOT NULL,
          modules INTEGER NOT NULL,
          price INTEGER NOT NULL,
          discount_price INTEGER,
          image_url TEXT NOT NULL,
          categories TEXT[] NOT NULL,
          popular BOOLEAN DEFAULT FALSE,
          is_live BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS test_series (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          test_count INTEGER NOT NULL,
          price INTEGER NOT NULL,
          features TEXT[] NOT NULL,
          is_published BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS testimonials (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          testimonial TEXT NOT NULL,
          rating INTEGER NOT NULL,
          exam_name TEXT,
          rank TEXT,
          image_url TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS faqs (
          id SERIAL PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          "order" INTEGER DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS site_config (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value JSONB NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tests (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          test_series_id INTEGER REFERENCES test_series(id) ON DELETE CASCADE,
          duration INTEGER NOT NULL,
          total_marks INTEGER NOT NULL,
          passing_marks INTEGER NOT NULL,
          negative_marking DECIMAL NOT NULL,
          instructions TEXT,
          file_url TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS questions (
          id SERIAL PRIMARY KEY,
          test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
          question_text TEXT NOT NULL,
          marks INTEGER NOT NULL DEFAULT 1,
          question_type TEXT NOT NULL DEFAULT 'mcq',
          image_url TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS options (
          id SERIAL PRIMARY KEY,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
          option_text TEXT NOT NULL,
          is_correct BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS explanations (
          id SERIAL PRIMARY KEY,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
          explanation_text TEXT NOT NULL,
          image_url TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS test_attempts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE NOT NULL,
          start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          end_time TIMESTAMP,
          score DECIMAL,
          total_marks INTEGER NOT NULL,
          is_completed BOOLEAN NOT NULL DEFAULT FALSE,
          time_taken INTEGER,
          correct_answers INTEGER,
          incorrect_answers INTEGER,
          unanswered INTEGER,
          percentage DECIMAL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_answers (
          id SERIAL PRIMARY KEY,
          test_attempt_id INTEGER REFERENCES test_attempts(id) ON DELETE CASCADE NOT NULL,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
          answer TEXT NOT NULL,
          is_correct BOOLEAN,
          marks_obtained DECIMAL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS doubt_sessions (
          id SERIAL PRIMARY KEY,
          subject TEXT NOT NULL,
          date TEXT NOT NULL,
          time_slot TEXT NOT NULL,
          description TEXT NOT NULL,
          image_url TEXT,
          user_id INTEGER REFERENCES users(id),
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS course_videos (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          video_type TEXT NOT NULL,
          video_url TEXT,
          video_file TEXT,
          thumbnail TEXT,
          duration TEXT,
          "order" INTEGER DEFAULT 0 NOT NULL,
          is_published BOOLEAN DEFAULT FALSE NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      // Add columns to existing tables if they don't exist for SQLite
      try {
        await db.execute(sql`
          ALTER TABLE courses ADD COLUMN creator_id INTEGER REFERENCES users(id);
          ALTER TABLE courses ADD COLUMN is_published BOOLEAN DEFAULT FALSE NOT NULL;
          ALTER TABLE test_series ADD COLUMN creator_id INTEGER REFERENCES users(id);
        `);
        console.log('Added new columns for teacher features (SQLite)');
      } catch (e) {
        console.error('Error adding columns for SQLite:', e);
      }

      // SQLite migrations
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          full_name TEXT NOT NULL,
          phone TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          duration TEXT NOT NULL,
          modules INTEGER NOT NULL,
          price INTEGER NOT NULL,
          discount_price INTEGER,
          image_url TEXT NOT NULL,
          categories TEXT NOT NULL,
          popular BOOLEAN DEFAULT FALSE,
          is_live BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS test_series (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          test_count INTEGER NOT NULL,
          price INTEGER NOT NULL,
          features TEXT NOT NULL,
          is_published BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS testimonials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          testimonial TEXT NOT NULL,
          rating INTEGER NOT NULL,
          exam_name TEXT,
          rank TEXT,
          image_url TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS faqs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          "order" INTEGER DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS site_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS doubt_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject TEXT NOT NULL,
          date TEXT NOT NULL,
          time_slot TEXT NOT NULL,
          description TEXT NOT NULL,
          image_url TEXT,
          user_id INTEGER REFERENCES users(id),
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}
