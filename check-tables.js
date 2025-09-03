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
    }
  } catch (error) {
    console.log('Could not load .env file:', error.message);
  }
}

// Check if tables exist
async function checkTables() {
  loadEnv();

  const databaseUrl = process.env.VITE_NEON_DATABASE_URL || process.env.NEON_DATABASE_URL;

  if (!databaseUrl) {
    console.error('Database URL not found!');
    return;
  }

  try {
    const sql = postgres(databaseUrl);

    console.log('Checking if tables exist...');

    // Check loan_applications table
    const loanAppsResult = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'loan_applications'
      ) as exists
    `;

    console.log('loan_applications table exists:', loanAppsResult[0].exists);

    // Check chat_messages table
    const chatMsgsResult = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'chat_messages'
      ) as exists
    `;

    console.log('chat_messages table exists:', chatMsgsResult[0].exists);

    await sql.end();
  } catch (error) {
    console.error('Error checking tables:', error.message);
  }
}

checkTables();
