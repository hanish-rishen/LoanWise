// Real Neon database implementation using Drizzle ORM
// This works in the browser with proper connection pooling

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core';

// Database schema definitions
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  sender: text('sender').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  type: text('type').notNull(),
  user_id: text('user_id').notNull(),
  conversation_id: text('conversation_id').notNull(), // New field for conversation sessions
});

export const loanApplications = pgTable('loan_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicant_name: text('applicant_name').notNull(),
  loan_amount: decimal('loan_amount', { precision: 12, scale: 2 }).notNull(),
  loan_type: text('loan_type').notNull(),
  status: text('status').notNull().default('pending'),
  application_date: timestamp('application_date').defaultNow().notNull(),
  credit_score: integer('credit_score'), // Made nullable - not everyone provides credit score
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

  console.log('🔍 Database URL check:', {
    exists: !!databaseUrl,
    length: databaseUrl?.length || 0,
    prefix: databaseUrl?.substring(0, 20) || 'not found'
  });

  if (!databaseUrl) {
    console.error('❌ VITE_DATABASE_URL not found in environment variables');
    console.error('❌ Available env vars:', Object.keys(import.meta.env));
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
  conversation_id: string;
}

export interface LoanApplication {
  id: string;
  applicant_name: string;
  loan_amount: string;
  loan_type: string;
  status: string;
  application_date: Date;
  credit_score: number | null | string; // Allow null when not provided, or string input
  monthly_income: string;
  employment_status: string;
  loan_purpose: string | null;
  interest_rate: string | null; // Keep as string for now to match database operations
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

  async getConversationMessages(userId: string, conversationId: string): Promise<ChatMessage[]> {
    try {
      console.log('🔍 Fetching conversation messages for user:', userId, 'conversation:', conversationId);
      const messages = await db
        .select()
        .from(chatMessages)
        .where(and(
          eq(chatMessages.user_id, userId),
          eq(chatMessages.conversation_id, conversationId)
        ))
        .orderBy(chatMessages.timestamp);

      console.log('📨 Found', messages.length, 'conversation messages');
      return messages;
    } catch (error) {
      console.error('❌ Error fetching conversation messages:', error);
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
          conversation_id: message.conversation_id,
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
  },

  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting conversation for user:', userId, 'conversation:', conversationId);
      await db
        .delete(chatMessages)
        .where(and(
          eq(chatMessages.user_id, userId),
          eq(chatMessages.conversation_id, conversationId)
        ));

      console.log('✅ Conversation deleted:', conversationId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      return false;
    }
  },

  async getRecentChats(userId: string): Promise<Array<{
    id: string;
    summary: string;
    timestamp: Date;
    messageCount: number;
  }>> {
    try {
      console.log('🔍 Fetching recent chats for user:', userId);

      // Get the latest messages grouped by conversation_id
      const recentMessages = await db
        .select({
          content: chatMessages.content,
          timestamp: chatMessages.timestamp,
          sender: chatMessages.sender,
          conversation_id: chatMessages.conversation_id
        })
        .from(chatMessages)
        .where(eq(chatMessages.user_id, userId))
        .orderBy(chatMessages.timestamp)
        .limit(100); // Get last 100 messages

      // Group messages by conversation_id
      const chatsByConversation = new Map<string, any[]>();

      recentMessages.forEach(msg => {
        if (!chatsByConversation.has(msg.conversation_id)) {
          chatsByConversation.set(msg.conversation_id, []);
        }
        chatsByConversation.get(msg.conversation_id)!.push(msg);
      });

      // Convert to recent chats format
      const recentChats = Array.from(chatsByConversation.entries())
        .map(([conversationId, messages]) => {
          const latestMessage = messages[messages.length - 1];
          const userMessages = messages.filter(m => m.sender === 'user');
          const firstUserMessage = userMessages[0];

          // Create a summary from the first user message or latest content
          let summary = 'Chat Session';
          if (firstUserMessage) {
            summary = firstUserMessage.content.length > 30
              ? firstUserMessage.content.substring(0, 30) + '...'
              : firstUserMessage.content;
          } else if (latestMessage) {
            summary = latestMessage.content.length > 30
              ? latestMessage.content.substring(0, 30) + '...'
              : latestMessage.content;
          }

          return {
            id: conversationId,
            summary: summary,
            timestamp: latestMessage.timestamp,
            messageCount: messages.length
          };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10); // Show last 10 conversations

      console.log('💬 Found', recentChats.length, 'recent conversations');
      return recentChats;
    } catch (error) {
      console.error('❌ Error fetching recent chats:', error);
      return [];
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
      // Test database connection first
      try {
        await db.select().from(loanApplications).limit(1);
        console.log('✅ Database connection verified');
      } catch (connError) {
        console.error('❌ Database connection test failed:', connError);
        throw new Error('Database connection failed');
      }

      console.log('➕ Adding loan application:', application);

      // Validate and clean the data
      const cleanLoanAmount = String(application.loan_amount).replace(/[^0-9.]/g, '');
      const cleanMonthlyIncome = String(application.monthly_income).replace(/[^0-9.]/g, '');
      const cleanInterestRate = application.interest_rate ? String(application.interest_rate).replace(/[^0-9.]/g, '') : null;

      // Handle credit score - convert empty string to null
      let cleanCreditScore: number | null = null;
      const creditScoreValue = application.credit_score;

      if (creditScoreValue !== null && creditScoreValue !== undefined) {
        if (typeof creditScoreValue === 'string') {
          if (creditScoreValue.trim() !== '') {
            const numericScore = parseInt(creditScoreValue.replace(/[^0-9]/g, ''));
            cleanCreditScore = isNaN(numericScore) ? null : numericScore;
          }
        } else {
          cleanCreditScore = creditScoreValue;
        }
      }

      console.log('➕ Cleaned data:', {
        loan_amount: cleanLoanAmount,
        monthly_income: cleanMonthlyIncome,
        interest_rate: cleanInterestRate,
        credit_score: cleanCreditScore
      });      // Validate that required fields are not empty after cleaning
      if (!cleanLoanAmount || !cleanMonthlyIncome) {
        throw new Error('Invalid loan amount or monthly income');
      }

      const [newApplication] = await db
        .insert(loanApplications)
        .values({
          applicant_name: application.applicant_name,
          loan_amount: cleanLoanAmount,
          loan_type: application.loan_type,
          status: application.status,
          credit_score: cleanCreditScore,
          monthly_income: cleanMonthlyIncome,
          employment_status: application.employment_status,
          loan_purpose: application.loan_purpose,
          interest_rate: cleanInterestRate,
          loan_term: application.loan_term,
          user_id: application.user_id,
          application_date: application.application_date || new Date(),
        })
        .returning();

      console.log('✅ Loan application added with ID:', newApplication?.id);
      console.log('✅ Full application result:', newApplication);
      return newApplication || null;
    } catch (error) {
      console.error('❌ Error adding loan application:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
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
export const getConversationMessages = chatOperations.getConversationMessages;
export const addChatMessage = chatOperations.addChatMessage;
export const clearChatMessages = chatOperations.clearChatMessages;
export const deleteConversation = chatOperations.deleteConversation;
export const getRecentChats = chatOperations.getRecentChats;
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
