import { addLoanApplication, getLoanApplications } from '../dbOperations';
import type { LoanApplication, NewLoanApplication } from '../dbOperations';
import { toastService } from './toastService';

export interface LoanApplicationData {
  applicant_name?: string;
  loan_amount?: string;
  loan_type?: string;
  credit_score?: number;
  monthly_income?: string;
  employment_status?: string;
  loan_purpose?: string;
  interest_rate?: string;
  loan_term?: number;
}

export interface LoanApplicationFlow {
  stage: 'initial' | 'personal_info' | 'loan_details' | 'financial_info' | 'complete';
  data: LoanApplicationData;
  applicationId?: string;
  nextQuestion?: string;
  isComplete: boolean;
}

class LoanApplicationService {
  private static instance: LoanApplicationService;
  private activeFlows: Map<string, LoanApplicationFlow> = new Map();

  static getInstance(): LoanApplicationService {
    if (!LoanApplicationService.instance) {
      LoanApplicationService.instance = new LoanApplicationService();
    }
    return LoanApplicationService.instance;
  }

  // Start a new loan application flow
  async startLoanApplication(_userId: string, conversationId: string): Promise<LoanApplicationFlow> {
    const flow: LoanApplicationFlow = {
      stage: 'initial',
      data: {},
      isComplete: false,
      nextQuestion: "I'd be happy to help you explore loan options! What would you like to know about our loans, or are you ready to start an application?"
    };

    this.activeFlows.set(conversationId, flow);
    return flow;
  }

  // Process user input and update the loan application
  async processUserInput(conversationId: string, userInput: string, userId: string): Promise<{
    flow: LoanApplicationFlow;
    response: string;
    shouldCreateApplication?: boolean;
    shouldUpdateApplication?: boolean;
  }> {
    let flow = this.activeFlows.get(conversationId);

    if (!flow) {
      // First check if user wants to apply - prioritize application intent
      if (this.isReadyToApply(userInput)) {
        flow = await this.startLoanApplication(userId, conversationId);

        // Try to extract any information from their initial request
        this.extractAndUpdateAllFields(userInput, flow);

        // Re-check what's still needed after extraction
        const newCompletionStatus = this.checkCompletionStatus(flow);

        // If we extracted loan type, acknowledge it specifically
        const extractedLoanType = this.extractLoanType(userInput);
        if (extractedLoanType && flow.data.loan_type) {
          return {
            flow,
            response: `Perfect! ${extractedLoanType} application started. ${newCompletionStatus.nextQuestion}`
          };
        }

        return {
          flow,
          response: `Perfect! Let's get your loan application started. ${newCompletionStatus.nextQuestion}`
        };
      }

      // Then check if user is asking about loans or seeking information
      if (this.isLoanRelated(userInput) || this.isUserAsking(userInput)) {
        flow = await this.startLoanApplication(userId, conversationId);
        return {
          flow,
          response: this.generateInformationalResponse(userInput)
        };
      }

      // Not loan related, return general response instruction
      return {
        flow: { stage: 'initial', data: {}, isComplete: false },
        response: "general_response"
      };
    }

    // Always allow questions and information requests, even during application
    if (this.isUserAsking(userInput) || this.isSeekingInformation(userInput)) {
      return {
        flow,
        response: this.generateInformationalResponse(userInput)
      };
    }

    // Check if user wants to change/restart information
    if (this.isUserChanging(userInput)) {
      const resetStage = this.determineResetStage(userInput, flow);
      flow.stage = resetStage;
      return {
        flow,
        response: "general_response" // Handle change requests conversationally
      };
    }

    // Check if user is ready to start application (expressions of intent)
    if (this.isReadyToApply(userInput)) {
      const completionStatus = this.checkCompletionStatus(flow);
      if (!completionStatus.canSubmit) {
        return {
          flow,
          response: `Great! Let's get your loan application started. ${completionStatus.nextQuestion}`
        };
      }
    }

    // Only process application data if user is providing direct answers
    if (this.isProvidingApplicationData(userInput)) {
      // Check if they're clarifying something we missed
      if (this.isUserClarifying(userInput)) {
        // Extract all possible information from their clarification
        this.extractAndUpdateAllFields(userInput, flow);

        // Check what we got and respond appropriately
        const newCompletionStatus = this.checkCompletionStatus(flow);
        const loanType = this.extractLoanType(userInput);

        if (loanType && !flow.data.loan_type) {
          flow.data.loan_type = loanType;
          const finalStatus = this.checkCompletionStatus(flow);
          return {
            flow,
            response: `Got it - ${loanType}! ${finalStatus.nextQuestion}`
          };
        }

        return {
          flow,
          response: `Thanks for clarifying! ${newCompletionStatus.nextQuestion}`
        };
      }

      const result = await this.processStageInput(flow, userInput, userId);
      this.activeFlows.set(conversationId, result.flow);
      return result;
    }

    // Default to conversational mode
    return {
      flow,
      response: "general_response"
    };
  }

  private async processStageInput(flow: LoanApplicationFlow, userInput: string, userId: string): Promise<{
    flow: LoanApplicationFlow;
    response: string;
    shouldCreateApplication?: boolean;
    shouldUpdateApplication?: boolean;
  }> {
    const updatedFlow = { ...flow };

    // Try to extract information from user input
    this.extractAndUpdateAllFields(userInput, updatedFlow);

    // Re-check completion status after extraction
    const newCompletionStatus = this.checkCompletionStatus(updatedFlow);

    if (newCompletionStatus.canSubmit) {
      // Submit the application
      updatedFlow.stage = 'complete';
      updatedFlow.isComplete = true;

      try {
        const applicationData: NewLoanApplication = {
          applicant_name: updatedFlow.data.applicant_name!,
          loan_amount: updatedFlow.data.loan_amount!,
          loan_type: updatedFlow.data.loan_type!,
          credit_score: updatedFlow.data.credit_score || 650,
          monthly_income: updatedFlow.data.monthly_income!,
          employment_status: updatedFlow.data.employment_status!,
          loan_purpose: updatedFlow.data.loan_purpose!,
          interest_rate: "0.00",
          loan_term: 36,
          status: 'pending',
          user_id: userId
        };

        const createdApplication = await addLoanApplication(applicationData);
        if (createdApplication) {
          updatedFlow.applicationId = createdApplication.id;
          toastService.addToast(
            'Loan application submitted successfully!',
            'success',
            4000
          );

          return {
            flow: updatedFlow,
            response: "Perfect! I've submitted your loan application with ID " + createdApplication.id.slice(0, 8) + ". You can track its status in the Loan Applications section. Thank you for choosing LoanWise!",
            shouldCreateApplication: true
          };
        } else {
          return {
            flow: updatedFlow,
            response: "I've collected all your information, but there was an issue submitting your application. Please try again or contact support."
          };
        }
      } catch (error) {
        console.error('Error creating loan application:', error);
        return {
          flow: updatedFlow,
          response: "I've collected all your information, but there was an issue submitting your application. Please try again or contact support."
        };
      }
    } else {
      // Ask for missing information naturally
      return {
        flow: updatedFlow,
        response: newCompletionStatus.nextQuestion
      };
    }
  }

  // Extract and update fields based on conversation context
  private extractAndUpdateAllFields(userInput: string, flow: LoanApplicationFlow): void {
    // ALWAYS try to extract loan type if we don't have it - regardless of current question
    if (!flow.data.loan_type) {
      const loanType = this.extractLoanType(userInput);
      if (loanType) {
        flow.data.loan_type = loanType;
      }
    }

    // ALWAYS try to extract name if we don't have it
    if (!flow.data.applicant_name) {
      const name = this.extractName(userInput);
      if (name && name.length > 2) {
        flow.data.applicant_name = name;
      }
    }

    // ALWAYS try to extract employment if we don't have it
    if (!flow.data.employment_status) {
      const employment = this.extractEmploymentStatus(userInput);
      if (employment) {
        flow.data.employment_status = employment;
      }
    }

    // ALWAYS try to extract income if we don't have it
    if (!flow.data.monthly_income) {
      const income = this.extractMoneyAmount(userInput);
      if (income) {
        flow.data.monthly_income = income;
      }
    }

    // ALWAYS try to extract loan amount if we don't have it
    if (!flow.data.loan_amount) {
      const amount = this.extractMoneyAmount(userInput);
      if (amount) {
        flow.data.loan_amount = amount;
      }
    }

    // ALWAYS try to extract loan purpose if we don't have it
    if (!flow.data.loan_purpose) {
      const purpose = this.extractLoanPurpose(userInput);
      if (purpose) {
        flow.data.loan_purpose = purpose;
      }
    }

    // ALWAYS try to extract credit score if we don't have it
    if (!flow.data.credit_score) {
      const creditScore = this.extractCreditScore(userInput);
      if (creditScore) {
        flow.data.credit_score = creditScore;
      }
    }
  }

  // Check completion status and provide next question
  private checkCompletionStatus(flow: LoanApplicationFlow): { canSubmit: boolean; nextQuestion: string } {
    const missing = [];

    if (!flow.data.loan_type) missing.push('loan type');
    if (!flow.data.applicant_name || flow.data.applicant_name.length < 2) missing.push('name');
    if (!flow.data.employment_status) missing.push('employment status');
    if (!flow.data.monthly_income || parseFloat(flow.data.monthly_income) <= 0) missing.push('monthly income');
    if (!flow.data.loan_amount || parseFloat(flow.data.loan_amount) <= 0) missing.push('loan amount');
    if (!flow.data.loan_purpose) missing.push('loan purpose');
    if (!flow.data.credit_score) missing.push('credit score');

    if (missing.length === 0) {
      return { canSubmit: true, nextQuestion: '' };
    }

    // Generate natural question for missing information with helpful context
    const questions: { [key: string]: string } = {
      'loan type': "What type of loan do you need? (Personal, Home, Vehicle, Education, Business, Agriculture, or Gold)",
      'name': "I'll need your full name for the application. What's your complete name?",
      'employment status': "What's your current employment situation? Are you employed, self-employed, running a business, or something else?",
      'monthly income': "What's your monthly income in rupees? This helps me check your eligibility and suggest the best options.",
      'loan amount': "How much funding do you need? Please let me know the amount in rupees.",
      'loan purpose': "What will you use this loan for? This helps me understand your needs better and suggest appropriate terms.",
      'credit score': "Do you know your current credit score? If not, just say 'I don't know' and I'll work with an estimated score."
    };

    const firstMissing = missing[0];

    // Ask for one thing at a time to avoid confusion
    return {
      canSubmit: false,
      nextQuestion: questions[firstMissing] || `I still need to know about your ${firstMissing} to process your loan application.`
    };
  }

  // Extract loan purpose from input
  private extractLoanPurpose(input: string): string | null {
    const lowerInput = input.toLowerCase();

    // Home/Property related
    if (lowerInput.includes('home') || lowerInput.includes('house') || lowerInput.includes('property')) {
      return 'Home purchase/renovation';
    }

    // Vehicle related
    if (lowerInput.includes('car') || lowerInput.includes('vehicle') || lowerInput.includes('bike') || lowerInput.includes('motorcycle')) {
      return 'Vehicle purchase';
    }

    // Business related
    if (lowerInput.includes('business') || lowerInput.includes('shop') || lowerInput.includes('startup') || lowerInput.includes('enterprise')) {
      return 'Business expansion/setup';
    }

    // Education related
    if (lowerInput.includes('education') || lowerInput.includes('study') || lowerInput.includes('course') || lowerInput.includes('university') || lowerInput.includes('college')) {
      return 'Education/Studies';
    }

    // Medical related
    if (lowerInput.includes('medical') || lowerInput.includes('health') || lowerInput.includes('treatment') || lowerInput.includes('surgery')) {
      return 'Medical expenses';
    }

    // Wedding related
    if (lowerInput.includes('wedding') || lowerInput.includes('marriage') || lowerInput.includes('ceremony')) {
      return 'Wedding expenses';
    }

    // Agriculture related
    if (lowerInput.includes('farming') || lowerInput.includes('agriculture') || lowerInput.includes('irrigation') || lowerInput.includes('crop') || lowerInput.includes('seeds')) {
      return 'Agriculture/Farming';
    }

    // Debt related
    if (lowerInput.includes('debt') || lowerInput.includes('consolidation') || lowerInput.includes('pay off') || lowerInput.includes('clear loan')) {
      return 'Debt consolidation';
    }

    // Emergency related
    if (lowerInput.includes('emergency') || lowerInput.includes('urgent') || lowerInput.includes('immediate')) {
      return 'Emergency expenses';
    }

    // Gold loan related
    if (lowerInput.includes('gold') || lowerInput.includes('jewelry') || lowerInput.includes('ornaments')) {
      return 'Against gold/jewelry';
    }

    // If it seems like a purpose description, use it (but not if it's a question)
    if (input.length > 10 && !this.isQuestionWord(input) && !this.isUserAsking(input)) {
      return input.trim();
    }

    return null;
  }  // Check if input contains question words
  private isQuestionWord(input: string): boolean {
    const questionWords = ['what', 'why', 'how', 'when', 'where', 'which', 'who', 'can', 'will', 'would', 'could'];
    const lowerInput = input.toLowerCase();
    return questionWords.some(word => lowerInput.includes(word)) || input.includes('?');
  }

  // Check if user input is loan-related
  private isLoanRelated(input: string): boolean {
    const loanKeywords = ['loan', 'borrow', 'money', 'credit', 'finance', 'apply', 'application', 'mortgage', 'auto', 'personal'];
    const lowerInput = input.toLowerCase();
    return loanKeywords.some(keyword => lowerInput.includes(keyword));
  }

  // Extract loan type from user input
  private extractLoanType(input: string): string | null {
    const lowerInput = input.toLowerCase();

    // Personal loans
    if (lowerInput.includes('personal')) return 'Personal Loan';

    // Home/Property loans
    if (lowerInput.includes('home') || lowerInput.includes('house') || lowerInput.includes('property') || lowerInput.includes('flat')) return 'Home Loan';

    // Vehicle loans
    if (lowerInput.includes('auto') || lowerInput.includes('car') || lowerInput.includes('vehicle') || lowerInput.includes('bike') || lowerInput.includes('motorcycle')) return 'Vehicle Loan';

    // Business loans
    if (lowerInput.includes('business') || lowerInput.includes('shop') || lowerInput.includes('enterprise')) return 'Business Loan';

    // Education loans
    if (lowerInput.includes('education') || lowerInput.includes('study') || lowerInput.includes('university') || lowerInput.includes('college') || lowerInput.includes('student')) return 'Education Loan';

    // Agriculture loans
    if (lowerInput.includes('agriculture') || lowerInput.includes('farming') || lowerInput.includes('irrigation') || lowerInput.includes('crop') || lowerInput.includes('farmer')) return 'Agriculture Loan';

    // Gold loans
    if (lowerInput.includes('gold') || lowerInput.includes('jewelry')) return 'Gold Loan';

    return null;
  }

  // Check if user is clarifying or repeating previously mentioned information
  private isUserClarifying(input: string): boolean {
    const lowerInput = input.toLowerCase();
    return (
      lowerInput.includes('said') ||
      lowerInput.includes('told you') ||
      lowerInput.includes('mentioned') ||
      lowerInput.includes('earlier') ||
      lowerInput.includes('before') ||
      lowerInput.includes('already') ||
      lowerInput.includes('i just said') ||
      lowerInput.includes('like i said')
    );
  }

  // Check if user is seeking information or asking questions
  private isSeekingInformation(input: string): boolean {
    const infoKeywords = [
      'what are', 'what types', 'what kind', 'tell me about', 'explain',
      'available', 'options', 'can you help', 'information about',
      'details about', 'know more', 'learn about', 'which loans',
      'do you offer', 'types of loans', 'loan options'
    ];

    const lowerInput = input.toLowerCase();
    return infoKeywords.some(keyword => lowerInput.includes(keyword));
  }

  // Check if user is ready to start the application process
  private isReadyToApply(input: string): boolean {
    const readyKeywords = [
      'let\'s start', 'i want to apply', 'start application', 'apply now',
      'yes let\'s do it', 'yes please', 'i\'m ready', 'let\'s go',
      'start the process', 'begin application', 'proceed', 'continue',
      'ok let\'s start', 'alright', 'sounds good', 'perfect',
      'would like to apply', 'want to apply', 'need to apply',
      'apply for', 'looking to apply', 'interested in applying',
      'can i apply', 'how do i apply', 'help me apply'
    ];

    const lowerInput = input.toLowerCase();
    return readyKeywords.some(keyword => lowerInput.includes(keyword));
  }

  // Check if user is providing application data vs asking questions
  private isProvidingApplicationData(input: string): boolean {
    const lowerInput = input.toLowerCase();

    // If they're clearly asking questions, it's not application data
    if (this.isUserAsking(input) || this.isSeekingInformation(input)) {
      return false;
    }

    // If we can extract ANY useful information from their input, treat it as application data
    const canExtractSomething = (
      !!this.extractLoanType(input) ||
      !!this.extractName(input) ||
      !!this.extractEmploymentStatus(input) ||
      !!this.extractMoneyAmount(input) ||
      !!this.extractCreditScore(input) ||
      !!this.extractLoanPurpose(input) ||
      // Handle clarifications like "I said earlier it's a vehicle loan"
      (lowerInput.includes('said') && lowerInput.includes('earlier')) ||
      (lowerInput.includes('mentioned') && lowerInput.includes('before')) ||
      (lowerInput.includes('told you'))
    );

    return canExtractSomething;
  }  // Extract name from user input
  private extractName(input: string): string {
    // Simple name extraction - remove common phrases
    return input
      .replace(/my name is/i, '')
      .replace(/i'm/i, '')
      .replace(/i am/i, '')
      .replace(/call me/i, '')
      .trim();
  }

  // Extract employment status
  private extractEmploymentStatus(input: string): string {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('employed') && !lowerInput.includes('unemployed')) return 'employed';
    if (lowerInput.includes('self-employed') || lowerInput.includes('self employed')) return 'self-employed';
    if (lowerInput.includes('unemployed')) return 'unemployed';
    if (lowerInput.includes('student')) return 'student';
    if (lowerInput.includes('retired')) return 'retired';

    return 'employed'; // default
  }

  // Extract money amount from input
  private extractMoneyAmount(input: string): string | null {
    // Remove common currency symbols and words (Indian context)
    const cleanInput = input
      .replace(/[₹$,]/g, '')
      .replace(/rupees?/i, '')
      .replace(/dollars?/i, '')
      .replace(/lakh/i, '00000')
      .replace(/lakhs/i, '00000')
      .replace(/crore/i, '0000000')
      .replace(/crores/i, '0000000')
      .replace(/k\b/i, '000');

    // Look for numbers
    const match = cleanInput.match(/(\d+(?:\.\d{2})?)/);
    if (match) {
      return match[1];
    }

    return null;
  }

  // Extract credit score
  private extractCreditScore(input: string): number | null {
    const lowerInput = input.toLowerCase();

    // Handle "don't know" responses by providing estimated score
    if (lowerInput.includes("don't know") || lowerInput.includes("not sure") || lowerInput.includes("no idea")) {
      return 650; // Default estimated score for approval consideration
    }

    const match = input.match(/(\d{3,4})/);
    if (match) {
      const score = parseInt(match[1]);
      if (score >= 300 && score <= 850) {
        return score;
      }
    }

    return null;
  }

  private generateInformationalResponse(input: string): string {
    const lowerInput = input.toLowerCase();

    // Loan types information
    if (lowerInput.includes('type') || lowerInput.includes('kind') || lowerInput.includes('categories')) {
      return "We offer Personal, Home, Vehicle, Education, Business, Agriculture, and Gold loans. Each has different rates and terms. What type interests you?";
    }

    // Interest rates
    if (lowerInput.includes('rate') || lowerInput.includes('interest') || lowerInput.includes('percentage')) {
      return "Rates vary by loan type: Personal 10.5%+, Home 8.5%+, Vehicle 9%+, Education 9.5%+, Business 11%+, Agriculture 7%+, Gold 12%+. Your rate depends on credit score and income. Want to check what you'd qualify for?";
    }

    // Eligibility criteria
    if (lowerInput.includes('eligible') || lowerInput.includes('qualify') || lowerInput.includes('criteria')) {
      return "Generally need: Age 21-65, steady income, decent credit score (650+ ideal). Requirements vary by loan type. Want to check if you qualify for a specific loan?";
    }

    // Documents required
    if (lowerInput.includes('document') || lowerInput.includes('papers') || lowerInput.includes('proof')) {
      return "Basic docs: Aadhaar, PAN, salary slips/ITR, bank statements, address proof. Specific loans need additional papers. I'll guide you through what's needed once we know your loan type.";
    }

    // Processing time
    if (lowerInput.includes('time') || lowerInput.includes('fast') || lowerInput.includes('quick') || lowerInput.includes('process')) {
      return "Personal/Gold loans: 24-48 hours. Vehicle loans: 3-5 days. Home/Business loans: 7-15 days. Education loans vary by institution. Ready to get started?";
    }

    // Loan amounts
    if (lowerInput.includes('amount') || lowerInput.includes('much') || lowerInput.includes('limit')) {
      return "Loan amounts: Personal ₹25K-₹40L, Home ₹5L-₹5Cr, Vehicle ₹50K-₹2Cr, Education ₹1L-₹1.5Cr, Business ₹1L-₹5Cr, Agriculture ₹25K-₹2Cr, Gold ₹5K-₹1Cr. Amount depends on your income. What amount were you thinking?";
    }

    // Credit score related
    if (lowerInput.includes('credit') || lowerInput.includes('score') || lowerInput.includes('cibil')) {
      return "Credit score matters! 750+ gets best rates, 700-750 good rates, 650-700 acceptable with higher rates. Below 650 might need co-applicant. Don't know your score? That's fine, we can work with estimates. What's your situation?";
    }

    // General help or greeting - but check if they also want to apply
    if (lowerInput.includes('help') || lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('about')) {
      // If they're greeting AND want to apply, be direct
      if (this.isReadyToApply(input)) {
        return "Perfect! Let's get your loan application started. What type of loan are you looking for?";
      }
      // Otherwise, brief helpful greeting
      return "Hi there! I can help you with loan information or applications. What would you like to know?";
    }

    // Repayment related
    if (lowerInput.includes('repay') || lowerInput.includes('emi') || lowerInput.includes('monthly') || lowerInput.includes('installment')) {
      return "Flexible repayment: 1-30 years depending on loan type. Monthly, quarterly, or bullet payments available. Step-up EMIs and prepayment options too. Want me to calculate your EMI?";
    }

    // Default informational response
    return "I can help with loan info and applications. What would you like to know?";
  }

  // Check if user is asking questions or seeking clarification
  private isUserAsking(input: string): boolean {
    const questionKeywords = [
      'what', 'why', 'how', 'when', 'where', 'which', 'who',
      'tell me', 'explain', 'can you', 'could you', 'would you',
      'i need to know', 'i want to know', 'help me understand',
      'what if', 'what about', 'is it', 'are there', 'do you',
      'what happens', 'what does', 'how much', 'how long'
    ];

    const lowerInput = input.toLowerCase();
    return questionKeywords.some(keyword => lowerInput.includes(keyword)) ||
           input.includes('?') ||
           lowerInput.startsWith('is ') ||
           lowerInput.startsWith('are ') ||
           lowerInput.startsWith('can ') ||
           lowerInput.startsWith('will ') ||
           lowerInput.startsWith('do ') ||
           lowerInput.startsWith('does ');
  }

  // Check if user wants to change or restart something
  private isUserChanging(input: string): boolean {
    const changeKeywords = [
      'change', 'modify', 'update', 'edit', 'correct', 'fix',
      'wait', 'actually', 'i mean', 'i meant', 'let me change',
      'can i change', 'i want to change', 'i need to change',
      'go back', 'restart', 'start over', 'begin again',
      'different', 'another', 'instead'
    ];

    const lowerInput = input.toLowerCase();
    return changeKeywords.some(keyword => lowerInput.includes(keyword));
  }

  // Determine which stage to reset to based on user input
  private determineResetStage(input: string, flow: LoanApplicationFlow): LoanApplicationFlow['stage'] {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('name') || lowerInput.includes('employment') || lowerInput.includes('income')) {
      return 'personal_info';
    }
    if (lowerInput.includes('amount') || lowerInput.includes('purpose') || lowerInput.includes('loan')) {
      return 'loan_details';
    }
    if (lowerInput.includes('credit') || lowerInput.includes('score')) {
      return 'financial_info';
    }
    if (lowerInput.includes('type') || lowerInput.includes('personal') || lowerInput.includes('home') || lowerInput.includes('vehicle')) {
      return 'initial';
    }

    // Default to current stage
    return flow.stage;
  }

  // Get current flow for a conversation
  getCurrentFlow(conversationId: string): LoanApplicationFlow | null {
    return this.activeFlows.get(conversationId) || null;
  }

  // Clear flow when conversation ends
  clearFlow(conversationId: string): void {
    this.activeFlows.delete(conversationId);
  }

  // Check if user has incomplete applications
  async checkIncompleteApplications(userId: string): Promise<LoanApplication[]> {
    try {
      const applications = await getLoanApplications(userId);
      return applications.filter(app =>
        app.status === 'incomplete' ||
        !app.loan_purpose ||
        !app.employment_status
      );
    } catch (error) {
      console.error('Error checking incomplete applications:', error);
      return [];
    }
  }

  // Continue an existing incomplete application
  async continueApplication(applicationId: string, conversationId: string, userId: string): Promise<{
    success: boolean;
    message: string;
    nextQuestion?: string;
  }> {
    try {
      // Get the existing application
      const applications = await getLoanApplications(userId);
      const application = applications.find(app => app.id === applicationId);

      if (!application) {
        return {
          success: false,
          message: "Application not found."
        };
      }

      // Check if application is already complete
      if (application.status !== 'pending') {
        return {
          success: false,
          message: "This application has already been processed and cannot be continued."
        };
      }

      // Create a flow from the existing application data
      const flow: LoanApplicationFlow = {
        stage: 'initial',
        data: {
          applicant_name: application.applicant_name,
          loan_amount: application.loan_amount,
          loan_type: application.loan_type,
          monthly_income: application.monthly_income,
          employment_status: application.employment_status,
          loan_purpose: application.loan_purpose || undefined,
          credit_score: application.credit_score
        },
        applicationId: applicationId,
        isComplete: false
      };

      // Check what's still missing
      const completionStatus = this.checkCompletionStatus(flow);

      if (completionStatus.canSubmit) {
        return {
          success: false,
          message: "This application appears to be complete. No additional information needed."
        };
      }

      // Set the active flow
      this.activeFlows.set(conversationId, flow);

      return {
        success: true,
        message: "I've loaded your previous application. Let's continue where we left off.",
        nextQuestion: completionStatus.nextQuestion
      };

    } catch (error) {
      console.error('Error continuing application:', error);
      return {
        success: false,
        message: "There was an error loading your application. Please try again."
      };
    }
  }

  // Analyze loan application for approval/rejection reasons
  analyzeLoanDecision(application: any): {
    overallScore: number;
    recommendedAction: 'approve' | 'review' | 'reject';
    approvalReasons: string[];
    rejectionRisks: string[];
    conditions?: string[];
  } {
    const approvalReasons: string[] = [];
    const rejectionRisks: string[] = [];
    const conditions: string[] = [];
    let score = 50; // Base score

    // Credit Score Analysis
    const creditScore = application.credit_score || 650;
    if (creditScore >= 750) {
      score += 25;
      approvalReasons.push(`Excellent credit score (${creditScore})`);
    } else if (creditScore >= 700) {
      score += 15;
      approvalReasons.push(`Good credit score (${creditScore})`);
    } else if (creditScore >= 650) {
      score += 5;
      approvalReasons.push(`Fair credit score (${creditScore})`);
    } else {
      score -= 20;
      rejectionRisks.push(`Low credit score (${creditScore}) indicates higher risk`);
    }

    // Income Analysis
    const monthlyIncome = parseFloat(application.monthly_income || '0');
    const loanAmount = parseFloat(application.loan_amount || '0');

    if (monthlyIncome > 0 && loanAmount > 0) {
      const loanToIncomeRatio = loanAmount / (monthlyIncome * 12);

      if (loanToIncomeRatio <= 3) {
        score += 20;
        approvalReasons.push(`Strong income-to-loan ratio (${(loanToIncomeRatio * 100).toFixed(1)}%)`);
      } else if (loanToIncomeRatio <= 5) {
        score += 10;
        approvalReasons.push(`Moderate income-to-loan ratio (${(loanToIncomeRatio * 100).toFixed(1)}%)`);
      } else {
        score -= 15;
        rejectionRisks.push(`High loan-to-income ratio (${(loanToIncomeRatio * 100).toFixed(1)}%) may strain finances`);
      }

      if (monthlyIncome >= 50000) {
        score += 10;
        approvalReasons.push(`High monthly income (₹${(monthlyIncome/100000).toFixed(1)} lakhs)`);
      } else if (monthlyIncome >= 25000) {
        score += 5;
        approvalReasons.push(`Stable monthly income (₹${(monthlyIncome/1000).toFixed(0)}K)`);
      }
    }

    // Employment Status Analysis
    if (application.employment_status === 'employed') {
      score += 15;
      approvalReasons.push('Stable employment status');
    } else if (application.employment_status === 'self-employed') {
      score += 5;
      conditions.push('Require additional income verification documents');
    } else {
      score -= 10;
      rejectionRisks.push('Unstable employment status');
    }

    // Loan Type Analysis
    if (application.loan_type === 'Home Loan') {
      score += 10;
      approvalReasons.push('Secured loan with property as collateral');
    } else if (application.loan_type === 'Vehicle Loan') {
      score += 5;
      approvalReasons.push('Asset-backed loan with vehicle security');
    } else if (application.loan_type === 'Gold Loan') {
      score += 15;
      approvalReasons.push('Highly secured loan against gold collateral');
    } else if (application.loan_type === 'Education Loan') {
      score += 8;
      approvalReasons.push('Investment in education with future earning potential');
    } else if (application.loan_type === 'Agriculture Loan') {
      score += 5;
      approvalReasons.push('Government-supported agriculture sector loan');
      conditions.push('Require land ownership documents and crop details');
    } else if (application.loan_type === 'Business Loan') {
      score += 3;
      conditions.push('Require business plan and financial statements');
    }

    // Loan Amount Analysis
    if (loanAmount <= 500000) {
      score += 5;
      approvalReasons.push('Conservative loan amount');
    } else if (loanAmount > 2000000) {
      score -= 5;
      conditions.push('Require additional documentation for high-value loan');
    }

    // Determine recommendation
    let recommendedAction: 'approve' | 'review' | 'reject';
    if (score >= 75) {
      recommendedAction = 'approve';
    } else if (score >= 55) {
      recommendedAction = 'review';
    } else {
      recommendedAction = 'reject';
    }

    return {
      overallScore: Math.min(100, Math.max(0, score)),
      recommendedAction,
      approvalReasons,
      rejectionRisks,
      conditions: conditions.length > 0 ? conditions : undefined
    };
  }
}

export const loanApplicationService = LoanApplicationService.getInstance();
