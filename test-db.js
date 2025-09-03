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

// Test database connection
async function testConnection() {
  // Load environment variables
  loadEnv();

  const databaseUrl = process.env.VITE_NEON_DATABASE_URL || process.env.NEON_DATABASE_URL;

  console.log('Database URL:', databaseUrl ? 'Found' : 'Not found');

  if (!databaseUrl) {
    console.error('❌ Error: Database URL not found!');
    console.log('Please set VITE_NEON_DATABASE_URL or NEON_DATABASE_URL environment variable in your .env file');
    return;
  }

  try {
    console.log('🚀 Testing database connection...');
    const sql = postgres(databaseUrl);
    console.log('✅ Connected to database successfully!');

    // Test a simple query
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Query executed successfully:', result);

    await sql.end();
    console.log('✅ Connection closed successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();
