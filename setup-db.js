#!/usr/bin/env node

/**
 * Database Setup Script for LoanWise
 *
 * This script helps you set up your Neon database with the required tables.
 * Make sure you have your NEON_DATABASE_URL environment variable set.
 */

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      for (const envVar of envVars) {
        const [key, ...valueParts] = envVar.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          process.env[key.trim()] = value;
        }
      }
      console.log('✅ Environment variables loaded from .env file');
    } else {
      console.log('⚠️ No .env file found');
    }
  } catch (error) {
    console.log('⚠️ Could not load .env file:', error.message);
  }
}

async function setupDatabase() {
  // Load environment variables
  loadEnv();

  const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.env.VITE_NEON_DATABASE_URL || process.env.NEON_DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: Database URL not found!');
    console.log('Please set VITE_DATABASE_URL, DATABASE_URL, VITE_NEON_DATABASE_URL or NEON_DATABASE_URL environment variable in your .env file');
    console.log('Example: postgresql://username:password@hostname/database?sslmode=require');
    process.exit(1);
  }

  console.log('🚀 Setting up LoanWise database...');

  try {
    // Connect to database
    const sql = postgres(databaseUrl);
    console.log('✅ Connected to database');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
        await sql.unsafe(statement);
      }
    }

    console.log('✅ Database setup completed successfully!');
    console.log('🎉 Your LoanWise database is ready to use.');

    // Close connection
    await sql.end();

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}

export { setupDatabase };
