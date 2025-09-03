// Seed some initial data for demo purposes
import { addLoanApplication, addChatMessage } from './db';

// Initial loan applications for demo
const sampleApplications = [
  {
    applicantName: 'John Smith',
    loanAmount: '250000',
    loanType: 'Home Mortgage',
    status: 'approved',
    creditScore: 750,
    monthlyIncome: '8500',
    employmentStatus: 'Full-time',
    loanPurpose: 'Primary residence purchase',
    interestRate: '3.25',
    loanTerm: 30,
    userId: 'demo_user'
  },
  {
    applicantName: 'Sarah Johnson',
    loanAmount: '45000',
    loanType: 'Auto Loan',
    status: 'pending',
    creditScore: 680,
    monthlyIncome: '6200',
    employmentStatus: 'Full-time',
    loanPurpose: 'Vehicle purchase',
    interestRate: null,
    loanTerm: null,
    userId: 'demo_user'
  },
  {
    applicantName: 'Mike Davis',
    loanAmount: '150000',
    loanType: 'Business Loan',
    status: 'under-review',
    creditScore: 720,
    monthlyIncome: '12000',
    employmentStatus: 'Self-employed',
    loanPurpose: 'Business expansion',
    interestRate: null,
    loanTerm: null,
    userId: 'demo_user'
  }
];

// Initial chat messages for demo
const sampleMessages = [
  {
    content: 'Hello! Welcome to LoanWise. I\'m your AI loan assistant. How can I help you today?',
    sender: 'ai',
    type: 'text',
    userId: 'demo_user'
  },
  {
    content: 'Hi! I\'m interested in learning about home mortgage options.',
    sender: 'user',
    type: 'text',
    userId: 'demo_user'
  },
  {
    content: 'Great! I\'d be happy to help you with home mortgage information. Based on your profile, I can see you\'re looking at substantial loan amounts. What specific aspects of home mortgages would you like to know more about? Interest rates, qualification requirements, or loan terms?',
    sender: 'ai',
    type: 'text',
    userId: 'demo_user'
  }
];

export const seedDemoData = async (userId: string) => {
  // Check if data already exists
  const existingApps = await import('./db').then(db => db.getLoanApplications(userId));
  const existingMessages = await import('./db').then(db => db.getChatMessages(userId));

  if (existingApps.length === 0) {
    console.log('Seeding demo loan applications...');
    for (const app of sampleApplications) {
      await addLoanApplication({ ...app, userId });
    }
  }

  if (existingMessages.length === 0) {
    console.log('Seeding demo chat messages...');
    for (const msg of sampleMessages) {
      await addChatMessage({ ...msg, userId });
    }
  }
};
