// Browser-compatible database operations
// Uses localStorage for now, but structured for easy API migration later

import type { LoanApplication, ChatMessage, NewChatMessage, NewLoanApplication } from './database';

// Storage keys for localStorage
const STORAGE_KEYS = {
  CHAT_MESSAGES: 'loanwise_chat_messages',
  LOAN_APPLICATIONS: 'loanwise_loan_applications'
};

// Helper functions for localStorage
const loadFromStorage = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading from storage:', error);
    return [];
  }
};

const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
};

// Generate UUID-like IDs (compatible with PostgreSQL UUID format)
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Chat Messages Operations (localStorage implementation)
export const chatOperations = {
  // Get all chat messages for a user
  getChatMessages: async (userId: string): Promise<ChatMessage[]> => {
    try {
      console.log('getChatMessages: Fetching messages for user:', userId);
      const messages = await sql<ChatMessage[]>`
        SELECT id, content, sender, timestamp, type, user_id 
        FROM chat_messages 
        WHERE user_id = ${userId} 
        ORDER BY timestamp ASC
      `;
      console.log('getChatMessages: Found', messages.length, 'messages');
      return messages;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  },

  // Add a new chat message
  addChatMessage: async (message: NewChatMessage): Promise<ChatMessage | null> => {
    try {
      console.log('addChatMessage: Adding message:', message);
      const [newMessage] = await sql<ChatMessage[]>`
        INSERT INTO chat_messages (content, sender, type, user_id, timestamp)
        VALUES (${message.content}, ${message.sender}, ${message.type}, ${message.user_id}, ${message.timestamp || new Date()})
        RETURNING id, content, sender, timestamp, type, user_id
      `;
      console.log('addChatMessage: Message added with ID:', newMessage.id);
      return newMessage;
    } catch (error) {
      console.error('Error adding chat message:', error);
      return null;
    }
  },

  // Clear all chat messages for a user
  clearChatMessages: async (userId: string): Promise<boolean> => {
    try {
      console.log('clearChatMessages: Clearing all messages for user:', userId);
      const result = await sql`
        DELETE FROM chat_messages 
        WHERE user_id = ${userId}
      `;
      console.log('clearChatMessages: Deleted', result.count, 'messages');
      return true;
    } catch (error) {
      console.error('Error clearing chat messages:', error);
      return false;
    }
  }
};

// Loan Applications Operations
export const loanOperations = {
  // Get all loan applications for a user
  getLoanApplications: async (userId: string): Promise<LoanApplication[]> => {
    try {
      console.log('getLoanApplications: Fetching applications for user:', userId);
      const applications = await sql<LoanApplication[]>`
        SELECT id, applicant_name, loan_amount, loan_type, status, application_date, 
               credit_score, monthly_income, employment_status, loan_purpose, 
               interest_rate, loan_term, user_id 
        FROM loan_applications 
        WHERE user_id = ${userId} 
        ORDER BY application_date DESC
      `;
      console.log('getLoanApplications: Found', applications.length, 'applications');
      return applications;
    } catch (error) {
      console.error('Error fetching loan applications:', error);
      return [];
    }
  },

  // Add a new loan application
  addLoanApplication: async (application: NewLoanApplication): Promise<LoanApplication | null> => {
    try {
      console.log('addLoanApplication: Adding application:', application);
      const [newApplication] = await sql<LoanApplication[]>`
        INSERT INTO loan_applications (
          applicant_name, loan_amount, loan_type, status, credit_score, 
          monthly_income, employment_status, loan_purpose, interest_rate, 
          loan_term, user_id, application_date
        )
        VALUES (
          ${application.applicant_name}, ${application.loan_amount}, ${application.loan_type}, 
          ${application.status}, ${application.credit_score}, ${application.monthly_income}, 
          ${application.employment_status}, ${application.loan_purpose}, ${application.interest_rate}, 
          ${application.loan_term}, ${application.user_id}, ${application.application_date || new Date()}
        )
        RETURNING id, applicant_name, loan_amount, loan_type, status, application_date, 
                  credit_score, monthly_income, employment_status, loan_purpose, 
                  interest_rate, loan_term, user_id
      `;
      console.log('addLoanApplication: Application added with ID:', newApplication.id);
      return newApplication;
    } catch (error) {
      console.error('Error adding loan application:', error);
      return null;
    }
  },

  // Update loan application status
  updateLoanApplicationStatus: async (id: string, status: string): Promise<boolean> => {
    try {
      console.log('updateLoanApplicationStatus: Updating application', id, 'to status:', status);
      const result = await sql`
        UPDATE loan_applications 
        SET status = ${status} 
        WHERE id = ${id}
      `;
      console.log('updateLoanApplicationStatus: Updated', result.count, 'applications');
      return result.count > 0;
    } catch (error) {
      console.error('Error updating loan application status:', error);
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
    await sql`SELECT 1 as test`;
    console.log('✅ Database operations module loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed in operations module:', error);
    return false;
  }
};
