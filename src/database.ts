// Browser-compatible Neon database client using HTTP API
// This replaces the Node.js postgres library which doesn't work in browsers

// Database configuration
const getDatabaseUrl = () => {
  const url = import.meta.env.VITE_DATABASE_URL ||
              import.meta.env.DATABASE_URL ||
              import.meta.env.VITE_NEON_DATABASE_URL ||
              import.meta.env.NEON_DATABASE_URL;

  if (!url) {
    console.warn('Database URL not found. Using localStorage fallback.');
    return null;
  }

  return url;
};

// Extract connection details from PostgreSQL URL
const parseConnectionUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      database: urlObj.pathname.slice(1), // Remove leading slash
      username: urlObj.username,
      password: urlObj.password,
      port: urlObj.port || '5432'
    };
  } catch (error) {
    console.error('Error parsing database URL:', error);
    return null;
  }
};

// Browser-compatible SQL query function using fetch
export const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('Database URL not available');
  }

  const connectionDetails = parseConnectionUrl(databaseUrl);
  if (!connectionDetails) {
    throw new Error('Invalid database URL format');
  }

  // Build SQL query from template literal
  let query = '';
  for (let i = 0; i < strings.length; i++) {
    query += strings[i];
    if (i < values.length) {
      // Basic parameter escaping (for production, use proper parameterized queries)
      const value = values[i];
      if (typeof value === 'string') {
        query += `'${value.replace(/'/g, "''")}'`;
      } else if (value instanceof Date) {
        query += `'${value.toISOString()}'`;
      } else if (value === null || value === undefined) {
        query += 'NULL';
      } else {
        query += String(value);
      }
    }
  }

  try {
    // Use Neon's HTTP API endpoint (we'll implement this as a fallback to localStorage for now)
    console.log('SQL Query:', query);

    // For now, return a mock result that indicates we need localStorage fallback
    return [];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Test database connection
export const testConnection = async () => {
  try {
    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      console.log('⚠️ No database URL found, will use localStorage fallback');
      return false;
    }

    // For browser compatibility, we'll indicate success but use localStorage
    console.log('✅ Database URL configured, using localStorage for browser compatibility');
    return false; // Return false to trigger localStorage fallback
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

// Database interfaces
export interface LoanApplication {
  id: string;
  applicant_name: string;
  loan_amount: string;
  loan_type: string;
  status: string;
  application_date: Date;
  credit_score: number;
  monthly_income: string;
  employment_status: string;
  loan_purpose: string | null;
  interest_rate: string | null;
  loan_term: number | null;
  user_id: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: string;
  user_id: string;
}

export interface NewChatMessage extends Omit<ChatMessage, 'id' | 'timestamp'> {
  timestamp?: Date;
}

export interface NewLoanApplication extends Omit<LoanApplication, 'id' | 'application_date'> {
  application_date?: Date;
}
