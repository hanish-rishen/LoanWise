// Mock database implementation for browser compatibility
// The postgres library doesn't work well in browser environments

interface LoanApplication {
  id: string;
  applicantName: string;
  loanAmount: string;
  loanType: string;
  status: string;
  applicationDate: Date;
  creditScore: number;
  monthlyIncome: string;
  employmentStatus: string;
  loanPurpose: string | null;
  interestRate: string | null;
  loanTerm: number | null;
  userId: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: string;
  userId: string;
}

interface NewLoanApplication extends Omit<LoanApplication, 'id' | 'applicationDate'> {
  applicationDate?: Date;
}

interface NewChatMessage extends Omit<ChatMessage, 'id' | 'timestamp'> {
  timestamp?: Date;
}

// Mock data storage (in browser localStorage)
const STORAGE_KEYS = {
  LOAN_APPLICATIONS: 'loanwise_loan_applications',
  CHAT_MESSAGES: 'loanwise_chat_messages'
};

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

// Database operations
export const databaseOperations = {
  // Loan Applications
  getLoanApplications: async (userId: string): Promise<LoanApplication[]> => {
    try {
      const allApplications = loadFromStorage(STORAGE_KEYS.LOAN_APPLICATIONS);
      return allApplications
        .filter((app: LoanApplication) => app.userId === userId)
        .map((app: any) => ({
          ...app,
          applicationDate: new Date(app.applicationDate)
        }))
        .sort((a: LoanApplication, b: LoanApplication) =>
          new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()
        );
    } catch (error) {
      console.error('Error fetching loan applications:', error);
      return [];
    }
  },

  addLoanApplication: async (application: NewLoanApplication): Promise<LoanApplication | null> => {
    try {
      const allApplications = loadFromStorage(STORAGE_KEYS.LOAN_APPLICATIONS);
      const newApp: LoanApplication = {
        ...application,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        applicationDate: application.applicationDate || new Date()
      };

      allApplications.push(newApp);
      saveToStorage(STORAGE_KEYS.LOAN_APPLICATIONS, allApplications);
      return newApp;
    } catch (error) {
      console.error('Error adding loan application:', error);
      return null;
    }
  },

  // Chat Messages
  getChatMessages: async (userId: string): Promise<ChatMessage[]> => {
    try {
      const allMessages = loadFromStorage(STORAGE_KEYS.CHAT_MESSAGES);
      console.log('getChatMessages: All messages in storage:', allMessages);
      const userMessages = allMessages
        .filter((msg: ChatMessage) => msg.userId === userId)
        .map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        .sort((a: ChatMessage, b: ChatMessage) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      console.log('getChatMessages: User messages for', userId, ':', userMessages);
      return userMessages;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  },

  addChatMessage: async (message: NewChatMessage): Promise<ChatMessage | null> => {
    try {
      const allMessages = loadFromStorage(STORAGE_KEYS.CHAT_MESSAGES);
      const newMsg: ChatMessage = {
        ...message,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: message.timestamp || new Date()
      };

      allMessages.push(newMsg);
      saveToStorage(STORAGE_KEYS.CHAT_MESSAGES, allMessages);
      return newMsg;
    } catch (error) {
      console.error('Error adding chat message:', error);
      return null;
    }
  },

  clearChatMessages: async (userId: string): Promise<boolean> => {
    try {
      console.log('clearChatMessages: Clearing messages for user:', userId);
      const allMessages = loadFromStorage(STORAGE_KEYS.CHAT_MESSAGES);
      console.log('clearChatMessages: All messages before clear:', allMessages);

      const filteredMessages = allMessages.filter((msg: ChatMessage) => msg.userId !== userId);
      console.log('clearChatMessages: Filtered messages after clear:', filteredMessages);

      saveToStorage(STORAGE_KEYS.CHAT_MESSAGES, filteredMessages);

      // Force a browser storage event to ensure all tabs are updated
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.CHAT_MESSAGES,
        newValue: JSON.stringify(filteredMessages),
        storageArea: localStorage
      }));

      // Verify the storage was updated
      const verifyMessages = loadFromStorage(STORAGE_KEYS.CHAT_MESSAGES);
      console.log('clearChatMessages: Verified messages in storage:', verifyMessages);

      return true;
    } catch (error) {
      console.error('Error clearing chat messages:', error);
      return false;
    }
  }
};

// Helper functions for backward compatibility
export const getLoanApplications = databaseOperations.getLoanApplications;
export const addLoanApplication = databaseOperations.addLoanApplication;
export const getChatMessages = databaseOperations.getChatMessages;
export const addChatMessage = databaseOperations.addChatMessage;
export const clearChatMessages = databaseOperations.clearChatMessages;

// Mock db object for backward compatibility
export const db = {
  getLoanApplications: databaseOperations.getLoanApplications,
  addLoanApplication: databaseOperations.addLoanApplication,
  getChatMessages: databaseOperations.getChatMessages,
  addChatMessage: databaseOperations.addChatMessage,
  clearChatMessages: databaseOperations.clearChatMessages,
};

// Export types
export type { LoanApplication, NewLoanApplication, ChatMessage, NewChatMessage };
