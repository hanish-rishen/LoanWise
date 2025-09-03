// PostgreSQL database implementation using Neon
import {
  getChatMessages as dbGetChatMessages,
  addChatMessage as dbAddChatMessage,
  clearChatMessages as dbClearChatMessages,
  getLoanApplications as dbGetLoanApplications,
  addLoanApplication as dbAddLoanApplication,
  updateLoanApplicationStatus as dbUpdateLoanApplicationStatus,
  testDatabaseConnection
} from './dbOperations';

// Re-export types
export interface LoanApplication {
  id: string;
  applicant_name: string;
  loan_amount: string;
  loan_type: string;
  status: string;
  application_date: Date;
  credit_score: number | null; // Allow null when not provided
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

export interface NewLoanApplication extends Omit<LoanApplication, 'id' | 'application_date'> {
  application_date?: Date;
}

export interface NewChatMessage extends Omit<ChatMessage, 'id' | 'timestamp'> {
  timestamp?: Date;
}

// Test database connection on module load
let databaseAvailable = false;

const initDatabase = async () => {
  try {
    databaseAvailable = await testDatabaseConnection();
    if (databaseAvailable) {
      console.log('✅ Database connection established successfully');
    } else {
      console.error('❌ Database connection failed - falling back to localStorage');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    databaseAvailable = false;
  }
};

// Initialize database connection
initDatabase();

// Database operations using PostgreSQL
const databaseOperations = {
  // Chat Messages
  getChatMessages: async (userId: string): Promise<ChatMessage[]> => {
    if (!databaseAvailable) {
      console.warn('Database not available, returning empty array');
      return [];
    }
    return await dbGetChatMessages(userId);
  },

  addChatMessage: async (message: NewChatMessage): Promise<ChatMessage | null> => {
    if (!databaseAvailable) {
      console.warn('Database not available, cannot add message');
      return null;
    }
    return await dbAddChatMessage(message);
  },

  clearChatMessages: async (userId: string): Promise<boolean> => {
    if (!databaseAvailable) {
      console.warn('Database not available, cannot clear messages');
      return false;
    }
    return await dbClearChatMessages(userId);
  },

  // Loan Applications
  getLoanApplications: async (userId: string): Promise<LoanApplication[]> => {
    if (!databaseAvailable) {
      console.warn('Database not available, returning empty array');
      return [];
    }
    return await dbGetLoanApplications(userId);
  },

  addLoanApplication: async (application: NewLoanApplication): Promise<LoanApplication | null> => {
    if (!databaseAvailable) {
      console.warn('Database not available, cannot add application');
      return null;
    }
    return await dbAddLoanApplication(application);
  },

  updateLoanApplicationStatus: async (id: string, status: string): Promise<boolean> => {
    if (!databaseAvailable) {
      console.warn('Database not available, cannot update status');
      return false;
    }
    return await dbUpdateLoanApplicationStatus(id, status);
  }
};

// Export functions for use in components
export const getChatMessages = databaseOperations.getChatMessages;
export const addChatMessage = databaseOperations.addChatMessage;
export const clearChatMessages = databaseOperations.clearChatMessages;
export const getLoanApplications = databaseOperations.getLoanApplications;
export const addLoanApplication = databaseOperations.addLoanApplication;
export const updateLoanApplicationStatus = databaseOperations.updateLoanApplicationStatus;

// Export database availability status
export const isDatabaseAvailable = () => databaseAvailable;

// Export the database operations object for compatibility
export const db = {
  getChatMessages: databaseOperations.getChatMessages,
  addChatMessage: databaseOperations.addChatMessage,
  clearChatMessages: databaseOperations.clearChatMessages,
  getLoanApplications: databaseOperations.getLoanApplications,
  addLoanApplication: databaseOperations.addLoanApplication,
  updateLoanApplicationStatus: databaseOperations.updateLoanApplicationStatus,
  isAvailable: () => databaseAvailable
};
