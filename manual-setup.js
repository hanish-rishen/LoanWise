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

async function manualSetup() {
  loadEnv();

  const databaseUrl = process.env.VITE_NEON_DATABASE_URL || process.env.NEON_DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: Database URL not found!');
    return;
  }

  console.log('🚀 Setting up LoanWise database manually...');

  try {
    const sql = postgres(databaseUrl);
    console.log('✅ Connected to database');

    // Create loan_applications table
    console.log('📝 Creating loan_applications table...');
    await sql`
      CREATE TABLE IF NOT EXISTS loan_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        applicant_name VARCHAR(255) NOT NULL,
        loan_amount DECIMAL(12,2) NOT NULL,
        loan_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        application_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        credit_score INTEGER NOT NULL,
        monthly_income DECIMAL(10,2) NOT NULL,
        employment_status VARCHAR(100) NOT NULL,
        loan_purpose TEXT,
        interest_rate DECIMAL(5,2),
        loan_term INTEGER,
        user_id VARCHAR(255) NOT NULL
      )
    `;

    // Create chat_messages table
    console.log('📝 Creating chat_messages table...');
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        sender VARCHAR(10) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        type VARCHAR(20) NOT NULL DEFAULT 'text',
        user_id VARCHAR(255) NOT NULL
      )
    `;

    // Create indexes
    console.log('📝 Creating indexes...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_loan_applications_date ON loan_applications(application_date DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp ASC)
    `;

    console.log('✅ Database setup completed successfully!');
    console.log('🎉 Your LoanWise database is ready to use.');

    await sql.end();

  } catch (error) {
    console.error('❌ Error setting up database:', error);
  }
}

manualSetup();
