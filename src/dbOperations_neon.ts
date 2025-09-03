// Real Neon database implementation using HTTP API
// This works in the browser by making HTTP requests to Neon's API

import type { LoanApplication, ChatMessage, NewChatMessage, NewLoanApplication } from './database';

// Get database configuration
const getDatabaseConfig = () => {
  const databaseUrl = import.meta.env.VITE_DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ VITE_DATABASE_URL not found in environment variables');
    throw new Error('Database URL not configured');
  }

  // Parse the PostgreSQL connection URL
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      database: url.pathname.slice(1), // Remove leading slash
      username: url.username,
      password: url.password,
      port: url.port || '5432',
      ssl: url.searchParams.get('sslmode') === 'require'
    };
  } catch (error) {
    console.error('❌ Failed to parse database URL:', error);
    throw new Error('Invalid database URL format');
  }
};

// Execute SQL query using Neon's HTTP API
const executeQuery = async (query: string, params: any[] = []) => {
  const config = getDatabaseConfig();

  // Neon HTTP API endpoint
  const apiUrl = `https://${config.host}/sql`;

  try {
    console.log('🔄 Executing query:', query);
    console.log('📝 Parameters:', params);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.password}` // Neon uses password as API key
      },
      body: JSON.stringify({
        query: query,
        params: params
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Query result:', result);
    return result;
  } catch (error) {
    console.error('❌ Database query failed:', error);
    throw error;
  }
};

// Chat Messages Operations (Real Neon Database)
export const chatOperations = {
  // Get all chat messages for a user
  getChatMessages: async (userId: string): Promise<ChatMessage[]> => {
    try {
      console.log('🔍 getChatMessages: Fetching messages for user:', userId);

      const result = await executeQuery(
        'SELECT id, content, sender, timestamp, type, user_id FROM chat_messages WHERE user_id = $1 ORDER BY timestamp ASC',
        [userId]
      );

      const messages = result.rows || [];
      console.log('📨 getChatMessages: Found', messages.length, 'messages');

      return messages.map((row: any) => ({
        id: row.id,
        content: row.content,
        sender: row.sender,
        timestamp: new Date(row.timestamp),
        type: row.type,
        user_id: row.user_id
      }));
    } catch (error) {
      console.error('❌ Error fetching chat messages:', error);
      return [];
    }
  },

  // Add a new chat message
  addChatMessage: async (message: NewChatMessage): Promise<ChatMessage | null> => {
    try {
      console.log('➕ addChatMessage: Adding message:', message);

      const result = await executeQuery(
        'INSERT INTO chat_messages (content, sender, type, user_id, timestamp) VALUES ($1, $2, $3, $4, $5) RETURNING id, content, sender, timestamp, type, user_id',
        [
          message.content,
          message.sender,
          message.type,
          message.user_id,
          message.timestamp || new Date()
        ]
      );

      if (result.rows && result.rows.length > 0) {
        const newMessage = result.rows[0];
        console.log('✅ addChatMessage: Message added with ID:', newMessage.id);
        return {
          id: newMessage.id,
          content: newMessage.content,
          sender: newMessage.sender,
          timestamp: new Date(newMessage.timestamp),
          type: newMessage.type,
          user_id: newMessage.user_id
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error adding chat message:', error);
      return null;
    }
  },

  // Clear all chat messages for a user
  clearChatMessages: async (userId: string): Promise<boolean> => {
    try {
      console.log('🗑️ clearChatMessages: Clearing all messages for user:', userId);

      const result = await executeQuery(
        'DELETE FROM chat_messages WHERE user_id = $1',
        [userId]
      );

      console.log('✅ clearChatMessages: Cleared messages for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error clearing chat messages:', error);
      return false;
    }
  }
};

// Loan Applications Operations (Real Neon Database)
export const loanOperations = {
  // Get all loan applications for a user
  getLoanApplications: async (userId: string): Promise<LoanApplication[]> => {
    try {
      console.log('🔍 getLoanApplications: Fetching applications for user:', userId);

      const result = await executeQuery(
        'SELECT id, applicant_name, loan_amount, loan_type, status, application_date, credit_score, monthly_income, employment_status, loan_purpose, interest_rate, loan_term, user_id FROM loan_applications WHERE user_id = $1 ORDER BY application_date DESC',
        [userId]
      );

      const applications = result.rows || [];
      console.log('📋 getLoanApplications: Found', applications.length, 'applications');

      return applications.map((row: any) => ({
        id: row.id,
        applicant_name: row.applicant_name,
        loan_amount: row.loan_amount,
        loan_type: row.loan_type,
        status: row.status,
        application_date: new Date(row.application_date),
        credit_score: row.credit_score,
        monthly_income: row.monthly_income,
        employment_status: row.employment_status,
        loan_purpose: row.loan_purpose,
        interest_rate: row.interest_rate,
        loan_term: row.loan_term,
        user_id: row.user_id
      }));
    } catch (error) {
      console.error('❌ Error fetching loan applications:', error);
      return [];
    }
  },

  // Add a new loan application
  addLoanApplication: async (application: NewLoanApplication): Promise<LoanApplication | null> => {
    try {
      console.log('➕ addLoanApplication: Adding application:', application);

      const result = await executeQuery(
        'INSERT INTO loan_applications (applicant_name, loan_amount, loan_type, status, credit_score, monthly_income, employment_status, loan_purpose, interest_rate, loan_term, user_id, application_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, applicant_name, loan_amount, loan_type, status, application_date, credit_score, monthly_income, employment_status, loan_purpose, interest_rate, loan_term, user_id',
        [
          application.applicant_name,
          application.loan_amount,
          application.loan_type,
          application.status,
          application.credit_score,
          application.monthly_income,
          application.employment_status,
          application.loan_purpose,
          application.interest_rate,
          application.loan_term,
          application.user_id,
          application.application_date || new Date()
        ]
      );

      if (result.rows && result.rows.length > 0) {
        const newApplication = result.rows[0];
        console.log('✅ addLoanApplication: Application added with ID:', newApplication.id);
        return {
          id: newApplication.id,
          applicant_name: newApplication.applicant_name,
          loan_amount: newApplication.loan_amount,
          loan_type: newApplication.loan_type,
          status: newApplication.status,
          application_date: new Date(newApplication.application_date),
          credit_score: newApplication.credit_score,
          monthly_income: newApplication.monthly_income,
          employment_status: newApplication.employment_status,
          loan_purpose: newApplication.loan_purpose,
          interest_rate: newApplication.interest_rate,
          loan_term: newApplication.loan_term,
          user_id: newApplication.user_id
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error adding loan application:', error);
      return null;
    }
  },

  // Update loan application status
  updateLoanApplicationStatus: async (id: string, status: string): Promise<boolean> => {
    try {
      console.log('🔄 updateLoanApplicationStatus: Updating application', id, 'to status:', status);

      const result = await executeQuery(
        'UPDATE loan_applications SET status = $1 WHERE id = $2',
        [status, id]
      );

      console.log('✅ updateLoanApplicationStatus: Updated application status');
      return true;
    } catch (error) {
      console.error('❌ Error updating loan application status:', error);
      return false;
    }
  }
};

// Export individual functions for backward compatibility
export const getChatMessages = chatOperations.getChatMessages;
export const addChatMessage = chatOperations.addChatMessage;
export const clearChatMessages = chatOperations.clearChatMessages;
export const getLoanApplications = loanOperations.getLoanApplications;
export const addLoanApplication = loanOperations.addLoanApplication;
export const updateLoanApplicationStatus = loanOperations.updateLoanApplicationStatus;

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    console.log('🧪 Testing Neon database connection...');
    const result = await executeQuery('SELECT 1 as test');
    console.log('✅ Neon database connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Neon database connection failed:', error);
    return false;
  }
};
