-- LoanWise Database Schema for Neon (PostgreSQL)

-- Create loan_applications table
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
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender VARCHAR(10) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  type VARCHAR(20) NOT NULL DEFAULT 'text',
  user_id VARCHAR(255) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_date ON loan_applications(application_date DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp ASC);

-- Optional: Add some sample data for testing
-- INSERT INTO loan_applications (applicant_name, loan_amount, loan_type, status, credit_score, monthly_income, employment_status, loan_purpose, user_id)
-- VALUES ('John Doe', 250000.00, 'Home Mortgage', 'approved', 750, 8500.00, 'Full-time', 'Primary residence purchase', 'user_123');

-- INSERT INTO chat_messages (content, sender, user_id)
-- VALUES ('Hello! How can I help you with your loan application today?', 'ai', 'user_123');
