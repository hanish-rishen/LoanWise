// Real Neon database implementation using Drizzle ORM
// This works in the browser with proper connection pooling

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core';

// Database schema definitions
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  sender: text('sender').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  type: text('type').notNull(),
  user_id: text('user_id').notNull(),
});

export const loanApplications = pgTable('loan_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicant_name: text('applicant_name').notNull(),
  loan_amount: decimal('loan_amount', { precision: 12, scale: 2 }).notNull(),
  loan_type: text('loan_type').notNull(),
  status: text('status').notNull().default('pending'),
  application_date: timestamp('application_date').defaultNow().notNull(),
  credit_score: integer('credit_score').notNull(),
  monthly_income: decimal('monthly_income', { precision: 10, scale: 2 }).notNull(),
  employment_status: text('employment_status').notNull(),
  loan_purpose: text('loan_purpose'),
  interest_rate: decimal('interest_rate', { precision: 5, scale: 2 }),
  loan_term: integer('loan_term'),
  user_id: text('user_id').notNull(),
});

// Initialize Drizzle with Neon
const getDatabaseConnection = () => {
  const databaseUrl = import.meta.env.VITE_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('❌ VITE_DATABASE_URL not found in environment variables');
  }

  try {
    const sql = neon(databaseUrl);
    const db = drizzle(sql);
    console.log('✅ Drizzle ORM initialized with Neon database');
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database connection:', error);
    throw error;
  }
};

// Get database instance
const db = getDatabaseConnection();

// Types
export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: string;
  user_id: string;
}

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

export interface NewChatMessage extends Omit<ChatMessage, 'id' | 'timestamp'> {
  timestamp?: Date;
}

export interface NewLoanApplication extends Omit<LoanApplication, 'id' | 'application_date'> {
  application_date?: Date;
}

// Chat Operations
export const chatOperations = {
  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    try {
      console.log('🔍 Fetching chat messages for user:', userId);
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.user_id, userId))
        .orderBy(chatMessages.timestamp);

      console.log('📨 Found', messages.length, 'chat messages');
      return messages;
    } catch (error) {
      console.error('❌ Error fetching chat messages:', error);
      return [];
    }
  },

  async addChatMessage(message: NewChatMessage): Promise<ChatMessage | null> {
    try {
      console.log('➕ Adding chat message:', message);
      const [newMessage] = await db
        .insert(chatMessages)
        .values({
          content: message.content,
          sender: message.sender,
          type: message.type,
          user_id: message.user_id,
          timestamp: message.timestamp || new Date(),
        })
        .returning();

      console.log('✅ Chat message added with ID:', newMessage.id);
      return newMessage;
    } catch (error) {
      console.error('❌ Error adding chat message:', error);
      return null;
    }
  },

  async clearChatMessages(userId: string): Promise<boolean> {
    try {
      console.log('🗑️ Clearing chat messages for user:', userId);
      await db
        .delete(chatMessages)
        .where(eq(chatMessages.user_id, userId));

      console.log('✅ Chat messages cleared for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error clearing chat messages:', error);
      return false;
    }
  }
};

// Loan Operations
export const loanOperations = {
  async getLoanApplications(userId: string): Promise<LoanApplication[]> {
    try {
      console.log('🔍 Fetching loan applications for user:', userId);
      const applications = await db
        .select()
        .from(loanApplications)
        .where(eq(loanApplications.user_id, userId))
        .orderBy(loanApplications.application_date);

      console.log('📋 Found', applications.length, 'loan applications');
      return applications;
    } catch (error) {
      console.error('❌ Error fetching loan applications:', error);
      return [];
    }
  },

  async addLoanApplication(application: NewLoanApplication): Promise<LoanApplication | null> {
    try {
      console.log('➕ Adding loan application:', application);
      const [newApplication] = await db
        .insert(loanApplications)
        .values({
          applicant_name: application.applicant_name,
          loan_amount: application.loan_amount,
          loan_type: application.loan_type,
          status: application.status,
          credit_score: application.credit_score,
          monthly_income: application.monthly_income,
          employment_status: application.employment_status,
          loan_purpose: application.loan_purpose,
          interest_rate: application.interest_rate,
          loan_term: application.loan_term,
          user_id: application.user_id,
          application_date: application.application_date || new Date(),
        })
        .returning();

      console.log('✅ Loan application added with ID:', newApplication.id);
      return newApplication;
    } catch (error) {
      console.error('❌ Error adding loan application:', error);
      return null;
    }
  },

  async updateLoanApplicationStatus(id: string, status: string): Promise<boolean> {
    try {
      console.log('🔄 Updating loan application status:', id, '->', status);
      await db
        .update(loanApplications)
        .set({ status })
        .where(eq(loanApplications.id, id));

      console.log('✅ Loan application status updated');
      return true;
    } catch (error) {
      console.error('❌ Error updating loan application status:', error);
      return false;
    }
  }
};

// Export functions
export const getChatMessages = chatOperations.getChatMessages;
export const addChatMessage = chatOperations.addChatMessage;
export const clearChatMessages = chatOperations.clearChatMessages;
export const getLoanApplications = loanOperations.getLoanApplications;
export const addLoanApplication = loanOperations.addLoanApplication;
export const updateLoanApplicationStatus = loanOperations.updateLoanApplicationStatus;

// Test connection
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Neon database connection with Drizzle...');
    await db.select().from(chatMessages).limit(1);
    console.log('✅ Neon database connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Neon database connection failed:', error);
    return false;
  }
};
