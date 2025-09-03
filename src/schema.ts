import { pgTable, text, numeric, timestamp, uuid, varchar, integer } from 'drizzle-orm/pg-core';

// Loan Applications table
export const loanApplications = pgTable('loan_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicantName: varchar('applicant_name', { length: 255 }).notNull(),
  loanAmount: numeric('loan_amount', { precision: 12, scale: 2 }).notNull(),
  loanType: varchar('loan_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  applicationDate: timestamp('application_date').notNull().defaultNow(),
  creditScore: integer('credit_score'), // Nullable - not everyone provides credit score
  monthlyIncome: numeric('monthly_income', { precision: 10, scale: 2 }).notNull(),
  employmentStatus: varchar('employment_status', { length: 100 }).notNull(),
  loanPurpose: text('loan_purpose'),
  interestRate: numeric('interest_rate', { precision: 5, scale: 2 }),
  loanTerm: integer('loan_term'),
  userId: varchar('user_id', { length: 255 }).notNull(), // Clerk user ID
});

// Chat Messages table
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  sender: varchar('sender', { length: 10 }).notNull(), // 'user' or 'ai'
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  type: varchar('type', { length: 20 }).notNull().default('text'),
  userId: varchar('user_id', { length: 255 }).notNull(), // Clerk user ID
});

// Types for TypeScript
export type LoanApplication = typeof loanApplications.$inferSelect;
export type NewLoanApplication = typeof loanApplications.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
