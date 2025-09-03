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
      const allMessages = loadFromStorage(STORAGE_KEYS.CHAT_MESSAGES);
      const userMessages = allMessages
        .filter((msg: ChatMessage) => msg.user_id === userId)
        .map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        .sort((a: ChatMessage, b: ChatMessage) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      console.log('getChatMessages: Found', userMessages.length, 'messages');
      return userMessages;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  },

  // Add a new chat message
  addChatMessage: async (message: NewChatMessage): Promise<ChatMessage | null> => {
    try {
      console.log('addChatMessage: Adding message:', message);
      const newMessage: ChatMessage = {
        ...message,
        id: generateId(),
        timestamp: message.timestamp || new Date()
      };

      const allMessages = loadFromStorage(STORAGE_KEYS.CHAT_MESSAGES);
      allMessages.push(newMessage);
      saveToStorage(STORAGE_KEYS.CHAT_MESSAGES, allMessages);

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
      const allMessages = loadFromStorage(STORAGE_KEYS.CHAT_MESSAGES);
      const filteredMessages = allMessages.filter((msg: ChatMessage) => msg.user_id !== userId);
      saveToStorage(STORAGE_KEYS.CHAT_MESSAGES, filteredMessages);

      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.CHAT_MESSAGES,
        newValue: JSON.stringify(filteredMessages),
        storageArea: localStorage
      }));

      console.log('clearChatMessages: Cleared messages for user:', userId);
      return true;
    } catch (error) {
      console.error('Error clearing chat messages:', error);
      return false;
    }
  }
};

// Loan Applications Operations (localStorage implementation)
export const loanOperations = {
  // Get all loan applications for a user
  getLoanApplications: async (userId: string): Promise<LoanApplication[]> => {
    try {
      console.log('getLoanApplications: Fetching applications for user:', userId);
      const allApplications = loadFromStorage(STORAGE_KEYS.LOAN_APPLICATIONS);
      const userApplications = allApplications
        .filter((app: LoanApplication) => app.user_id === userId)
        .map((app: any) => ({
          ...app,
          application_date: new Date(app.application_date)
        }))
        .sort((a: LoanApplication, b: LoanApplication) =>
          new Date(b.application_date).getTime() - new Date(a.application_date).getTime()
        );
      console.log('getLoanApplications: Found', userApplications.length, 'applications');
      return userApplications;
    } catch (error) {
      console.error('Error fetching loan applications:', error);
      return [];
    }
  },

  // Add a new loan application
  addLoanApplication: async (application: NewLoanApplication): Promise<LoanApplication | null> => {
    try {
      console.log('addLoanApplication: Adding application:', application);
      const newApplication: LoanApplication = {
        ...application,
        id: generateId(),
        application_date: application.application_date || new Date()
      };

      const allApplications = loadFromStorage(STORAGE_KEYS.LOAN_APPLICATIONS);
      allApplications.push(newApplication);
      saveToStorage(STORAGE_KEYS.LOAN_APPLICATIONS, allApplications);

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
      const allApplications = loadFromStorage(STORAGE_KEYS.LOAN_APPLICATIONS);
      const applicationIndex = allApplications.findIndex((app: LoanApplication) => app.id === id);

      if (applicationIndex !== -1) {
        allApplications[applicationIndex].status = status;
        saveToStorage(STORAGE_KEYS.LOAN_APPLICATIONS, allApplications);
        console.log('updateLoanApplicationStatus: Updated application status');
        return true;
      } else {
        console.warn('updateLoanApplicationStatus: Application not found:', id);
        return false;
      }
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

// Test database connection (always returns true for localStorage)
export const testDatabaseConnection = async () => {
  try {
    // Test localStorage availability
    const testKey = 'loanwise_test';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    console.log('✅ LocalStorage database operations module loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ LocalStorage not available:', error);
    return false;
  }
};
