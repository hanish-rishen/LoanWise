import { addLoanApplication, getLoanApplications } from '../dbOperations';
import type { LoanApplication, NewLoanApplication } from '../dbOperations';
import { toastService } from './toastService';
import ConversationalAI from './conversationalAI';

export interface LoanApplicationData {
  applicant_name?: string;
  loan_amount?: string;
  loan_type?: string;
  credit_score?: number | null; // Allow null values from database
  monthly_income?: string;
  employment_status?: string;
  loan_purpose?: string;
  interest_rate?: string;
  loan_term?: number | null; // Allow null values from database
  name_needs_confirmation?: boolean;
}

export interface LoanApplicationFlow {
  stage: 'initial' | 'personal_info' | 'loan_details' | 'financial_info' | 'terms_review' | 'complete';
  data: LoanApplicationData;
  applicationId?: string;
  nextQuestion?: string;
  isComplete: boolean;
  manuallyEditedFields?: Set<string>; // Track which fields have been manually edited
  calculatedTerms?: {
    interestRate: string;
    loanTerm: number;
    monthlyPayment: string;
    totalAmount: string;
  };
}

class LoanApplicationService {
  private static instance: LoanApplicationService;
  private activeFlows: Map<string, LoanApplicationFlow> = new Map();
  private conversationalAI: ConversationalAI;

  constructor() {
    this.conversationalAI = ConversationalAI.getInstance();
  }

  static getInstance(): LoanApplicationService {
    if (!LoanApplicationService.instance) {
      LoanApplicationService.instance = new LoanApplicationService();
    }
    return LoanApplicationService.instance;
  }

  // Start a new loan application flow
  async startLoanApplication(_userId: string, conversationId: string, clearHistory: boolean = false): Promise<LoanApplicationFlow> {
    // Only clear conversation history if explicitly requested (e.g., for a completely new session)
    if (clearHistory) {
      this.activeFlows.delete(conversationId);
      this.conversationalAI.clearConversation(conversationId);
    }

    const flow: LoanApplicationFlow = {
      stage: 'initial',
      data: {},
      isComplete: false,
      nextQuestion: "I'd be happy to help you explore loan options! What would you like to know about our loans, or are you ready to start an application?",
      manuallyEditedFields: new Set()
    };

    this.activeFlows.set(conversationId, flow);
    return flow;
  }

  // Process user input using conversational AI
  async processUserInput(conversationId: string, userInput: string, userId: string): Promise<{
    flow: LoanApplicationFlow;
    response: string;
    shouldCreateApplication?: boolean;
    shouldUpdateApplication?: boolean;
  }> {
    console.log('🔍 LoanApplicationService: Processing input for conversation:', conversationId);
    console.log('🔍 LoanApplicationService: User input:', userInput);

    let flow = this.activeFlows.get(conversationId);
    console.log('🔍 LoanApplicationService: Existing flow:', flow ? 'Found' : 'Not found');

    if (!flow) {
      console.log('🔍 LoanApplicationService: Creating new flow for conversation:', conversationId);
      flow = await this.startLoanApplication(userId, conversationId);
    }

    try {
      // Use conversational AI to handle the interaction
      console.log('🔍 LoanApplicationService: Calling conversational AI...');
      const aiResponse = await this.conversationalAI.chat(conversationId, userInput, flow);
      console.log('🔍 LoanApplicationService: AI response received:', aiResponse.response);
      console.log('🔍 LoanApplicationService: AI extractedInfo:', aiResponse.extractedInfo);
      console.log('🔍 LoanApplicationService: AI applicationComplete:', aiResponse.applicationComplete);

      // Update flow with extracted information (ONLY what was actually extracted)
      if (aiResponse.extractedInfo && Object.keys(aiResponse.extractedInfo).length > 0) {
        console.log('🔍 LoanApplicationService: Updating flow with extracted info:', aiResponse.extractedInfo);
        console.log('🔍 LoanApplicationService: Current flow data before update:', flow.data);
        console.log('🔍 LoanApplicationService: Manually edited fields:', Array.from(flow.manuallyEditedFields || []));

        // Only update fields that haven't been manually edited
        const updatedData = { ...flow.data } as any;
        Object.keys(aiResponse.extractedInfo).forEach(key => {
          if (!flow.manuallyEditedFields?.has(key)) {
            updatedData[key] = (aiResponse.extractedInfo as any)[key];
          } else {
            console.log(`🔒 Preserving manually edited field in flow: ${key} = ${(flow.data as any)[key]}`);
          }
        });

        flow.data = updatedData;
        console.log('🔍 LoanApplicationService: Flow data after update:', flow.data);
      } else {
        console.log('🔍 LoanApplicationService: No extracted info to update');
      }

      // Check if application is complete - STRICT validation
      if (aiResponse.applicationComplete) {
        console.log('🔍 AI says application is complete. Checking flow completeness...');
        const isComplete = this.checkIfApplicationComplete(flow);
        console.log('🔍 Flow completion check result:', isComplete);

        if (isComplete) {
          // Check if we're already in terms review stage
          if (flow.stage === 'terms_review' && (userInput.toLowerCase().includes('yes') || userInput.toLowerCase().includes('accept') || userInput.toLowerCase().includes('approve'))) {
            // User accepted terms, proceed with submission
            return await this.submitApplication(flow, conversationId, userId);
          }

          if (flow.stage === 'terms_review' && (userInput.toLowerCase().includes('no') || userInput.toLowerCase().includes('reject') || userInput.toLowerCase().includes('decline'))) {
            // User rejected terms
            return {
              flow,
              response: "I understand. You can modify your loan amount or other details if you'd like different terms, or we can discuss other loan options that might work better for you."
            };
          }

          // First time completion - show terms for review
          if (flow.stage !== 'terms_review') {
            flow.stage = 'terms_review';
            const calculatedTerms = this.calculateLoanTerms(flow.data);
            flow.calculatedTerms = calculatedTerms;

            const termsResponse = `Excellent! I have all your information. Here are your personalized loan terms:

📋 **Your ${flow.data.loan_type} Details:**
• Loan Amount: ₹${parseFloat(flow.data.loan_amount!).toLocaleString('en-IN')}
• Interest Rate: ${calculatedTerms.interestRate}
• Loan Term: ${calculatedTerms.loanTerm} years
• Monthly Payment: ${calculatedTerms.monthlyPayment}
• Total Amount: ${calculatedTerms.totalAmount}

💡 **Why this rate?** Based on your credit score of ${flow.data.credit_score}, monthly income of ₹${parseFloat(flow.data.monthly_income!).toLocaleString('en-IN')}, and loan type.

Would you like to **accept these terms** and proceed with your application? Just say "yes" to accept or "no" if you'd like to modify anything.`;

            return {
              flow,
              response: termsResponse
            };
          }
        } else {
          return {
            flow,
            response: "I still need more information to complete your application. Let me ask the remaining questions."
          };
        }
      }

      // ALWAYS save the updated flow back to activeFlows
      this.activeFlows.set(conversationId, flow);
      console.log('🔍 LoanApplicationService: Flow saved to activeFlows for conversation:', conversationId);

      return {
        flow,
        response: aiResponse.response
      };

    } catch (error) {
      console.error('Error processing user input:', error);
      return {
        flow,
        response: "Sorry, I'm having trouble processing that. Could you try rephrasing?"
      };
    }
  }

  private checkIfApplicationComplete(flow: LoanApplicationFlow): boolean {
    console.log('🔍 Checking if application complete. Current flow data:', flow.data);
    const isComplete = !!(
      flow.data.loan_type &&
      flow.data.applicant_name &&
      flow.data.monthly_income &&
      flow.data.loan_amount &&
      flow.data.employment_status &&
      flow.data.credit_score
      // All fields are now required including credit_score
    );
    console.log('🔍 Application completion check result:', isComplete);
    return isComplete;
  }

  // Submit the application after terms acceptance
  private async submitApplication(flow: LoanApplicationFlow, conversationId: string, userId: string): Promise<any> {
    flow.stage = 'complete';
    flow.isComplete = true;

    try {
      console.log('🔍 Preparing application data with flow.data:', flow.data);

      const applicationData: NewLoanApplication = {
        applicant_name: flow.data.applicant_name!,
        loan_amount: flow.data.loan_amount!,
        loan_type: flow.data.loan_type!,
        credit_score: flow.data.credit_score || null,
        monthly_income: flow.data.monthly_income!,
        employment_status: flow.data.employment_status!,
        loan_purpose: flow.data.loan_purpose || 'General purpose',
        interest_rate: this.calculateInterestRate(flow.data),
        loan_term: this.calculateLoanTerm(flow.data.loan_type!, flow.data.loan_amount!),
        status: 'pending',
        user_id: userId
      };

      const createdApplication = await addLoanApplication(applicationData);
      if (createdApplication) {
        flow.applicationId = createdApplication.id;
        toastService.addToast(
          'Loan application submitted successfully!',
          'success',
          4000
        );

        this.activeFlows.set(conversationId, flow);
        return {
          flow,
          response: `🎉 **Application Submitted Successfully!**

Your ${flow.data.loan_type} application has been submitted with the following terms:
• Monthly Payment: ${flow.calculatedTerms?.monthlyPayment}
• Interest Rate: ${flow.calculatedTerms?.interestRate}
• Loan Term: ${flow.calculatedTerms?.loanTerm} years

**Application ID:** ${createdApplication.id.slice(0, 8)}

You can track your application status in the Loan Applications section. Our team will review your application and get back to you within 24-48 hours.

Thanks for choosing LoanWise! 🏦`,
          shouldCreateApplication: true
        };
      } else {
        return {
          flow,
          response: "There was an issue submitting your application. Please try again or contact our support team."
        };
      }
    } catch (error) {
      console.error('❌ Error creating loan application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        flow,
        response: `Something went wrong while submitting: ${errorMessage}. Please contact support or try again.`
      };
    }
  }

  // Get existing applications for a user
  async getUserApplications(userId: string): Promise<LoanApplication[]> {
    try {
      const applications = await getLoanApplications(userId);
      return applications;
    } catch (error) {
      console.error('Error fetching user applications:', error);
      return [];
    }
  }

  // Continue an existing application
  async continueApplication(conversationId: string, applicationId: string): Promise<LoanApplicationFlow | null> {
    try {
      const applications = await getLoanApplications(''); // Get all applications
      const application = applications.find(app => app.id === applicationId);

      if (!application) {
        return null;
      }

      const flow: LoanApplicationFlow = {
        stage: 'complete',
        data: {
          applicant_name: application.applicant_name,
          loan_amount: application.loan_amount,
          loan_type: application.loan_type,
          credit_score: typeof application.credit_score === 'string' ? parseInt(application.credit_score) : application.credit_score,
          monthly_income: application.monthly_income,
          employment_status: application.employment_status,
          loan_purpose: application.loan_purpose || undefined,
          interest_rate: application.interest_rate || undefined,
          loan_term: application.loan_term || undefined
        },
        applicationId: application.id,
        isComplete: true
      };

      this.activeFlows.set(conversationId, flow);
      return flow;
    } catch (error) {
      console.error('Error continuing application:', error);
      return null;
    }
  }

  // Clear active flow for a conversation
  clearFlow(conversationId: string): void {
    console.log('🔄 LoanApplicationService: Clearing flow for conversation:', conversationId);
    this.activeFlows.delete(conversationId);
    this.conversationalAI.clearConversation(conversationId);
    console.log('✅ LoanApplicationService: Flow cleared successfully');
  }

  // Clear ALL active flows (for when user clears all chats)
  clearAllFlows(): void {
    console.log('🔄 LoanApplicationService: Clearing ALL active flows');
    const count = this.activeFlows.size;
    this.activeFlows.clear();
    this.conversationalAI.clearAllConversations();
    console.log('✅ LoanApplicationService: All flows cleared (cleared', count, 'flows)');
  }

  // Get current flow for a conversation
  getCurrentFlow(conversationId: string): LoanApplicationFlow | undefined {
    return this.activeFlows.get(conversationId);
  }

  // Mark a field as manually edited
  markFieldAsManuallyEdited(conversationId: string, fieldName: string): void {
    const flow = this.activeFlows.get(conversationId);
    if (flow) {
      if (!flow.manuallyEditedFields) {
        flow.manuallyEditedFields = new Set();
      }
      flow.manuallyEditedFields.add(fieldName);
      console.log(`🔒 Marked field as manually edited: ${fieldName} for conversation: ${conversationId}`);
    }
  }

  // Decision making (simplified for now)
  makeDecision(flow: LoanApplicationFlow): any {
    const income = parseFloat(flow.data.monthly_income || '0');
    const loanAmount = parseFloat(flow.data.loan_amount || '0');
    const creditScore = flow.data.credit_score || 650;

    const approved = income > 25000 && creditScore > 600 && (loanAmount / income) < 50;

    return {
      decision: approved ? 'approved' : 'rejected',
      reason: approved ? 'Good income and credit profile' : 'Income or credit score below requirements',
      interest_rate: approved ? '10.5%' : 'N/A'
    };
  }

  // Calculate interest rate based on loan data
  private calculateInterestRate(loanData: any): string {
    const creditScore = loanData.credit_score;
    const income = parseFloat(loanData.monthly_income || '0');
    const loanAmount = parseFloat(loanData.loan_amount || '0');
    const loanType = loanData.loan_type;

    // Base rates by loan type
    let baseRate = 8.5; // Default rate

    switch (loanType?.toLowerCase()) {
      case 'home loan':
      case 'home':
        baseRate = 7.5;
        break;
      case 'car loan':
      case 'auto loan':
        baseRate = 9.5;
        break;
      case 'personal loan':
        baseRate = 12.0;
        break;
      case 'business loan':
        baseRate = 11.0;
        break;
      case 'education loan':
        baseRate = 10.25;
        break;
      case 'vehicle loan':
        baseRate = 9.5;
        break;
      default:
        baseRate = 10.0;
    }

    // Adjust for credit score if available
    if (creditScore) {
      if (creditScore >= 750) baseRate -= 1.5;
      else if (creditScore >= 700) baseRate -= 1.0;
      else if (creditScore >= 650) baseRate -= 0.5;
      else if (creditScore < 600) baseRate += 2.0;
    }

    // Adjust for income level
    if (income >= 100000) baseRate -= 0.5;
    else if (income >= 75000) baseRate -= 0.25;
    else if (income < 25000) baseRate += 1.0;

    // Adjust for loan amount
    if (loanAmount >= 5000000) baseRate += 0.5; // High value loans

    // Return as string without % symbol so database can parse it as numeric
    return Math.max(6.0, Math.min(18.0, baseRate)).toFixed(2);
  }

  // Calculate loan term based on loan type and amount
  private calculateLoanTerm(loanType: string, loanAmount: string): number {
    const amount = parseFloat(loanAmount);

    switch (loanType?.toLowerCase()) {
      case 'home loan':
      case 'home':
        return amount > 5000000 ? 30 : amount > 2000000 ? 25 : 20; // years
      case 'car loan':
      case 'auto loan':
        return amount > 1500000 ? 7 : 5; // years
      case 'personal loan':
        return amount > 500000 ? 5 : 3; // years
      case 'business loan':
        return amount > 2000000 ? 10 : 7; // years
      default:
        return 5; // Default 5 years
    }
  }

  // Calculate complete loan terms for user review
  private calculateLoanTerms(flowData: any): any {
    const interestRate = this.calculateInterestRate(flowData);
    const loanTerm = this.calculateLoanTerm(flowData.loan_type!, flowData.loan_amount!);
    const principal = parseFloat(flowData.loan_amount!);

    // Calculate monthly payment using standard loan formula
    const monthlyRate = parseFloat(interestRate) / 100 / 12;
    const numPayments = loanTerm * 12;
    const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                          (Math.pow(1 + monthlyRate, numPayments) - 1);

    const totalAmount = monthlyPayment * numPayments;

    return {
      interestRate: interestRate + '%',
      loanTerm,
      monthlyPayment: '₹' + Math.round(monthlyPayment).toLocaleString('en-IN'),
      totalAmount: '₹' + Math.round(totalAmount).toLocaleString('en-IN')
    };
  }

  // Analyze loan decision for existing applications
  analyzeLoanDecision(application: any): any {
    const income = parseFloat(application.monthly_income || '0');
    const loanAmount = parseFloat(application.loan_amount || '0');
    const creditScore = application.credit_score; // Don't default - show as unknown
    const hasKnownCreditScore = creditScore !== null && creditScore !== undefined;

    // Can't approve without basic info
    if (!hasKnownCreditScore) {
      return {
        decision: 'incomplete',
        reason: 'Credit score not provided - cannot make lending decision',
        interest_rate: 'N/A',
        confidence: 0,
        overallScore: 0,
        approvalReasons: [],
        rejectionRisks: ['Credit score not provided'],
        conditions: ['Please provide your credit score to proceed with the application'],
        factors: [
          { name: 'Credit Score', value: 'Not provided', impact: 'negative' },
          { name: 'Monthly Income', value: `₹${income.toLocaleString()}`, impact: income > 50000 ? 'positive' : income > 25000 ? 'neutral' : 'negative' },
          { name: 'Debt Ratio', value: income > 0 ? `${(loanAmount / income).toFixed(1)}%` : 'N/A', impact: income > 0 && (loanAmount / income) < 40 ? 'positive' : 'negative' }
        ]
      };
    }

    const approved = income > 25000 && creditScore > 600 && (loanAmount / income) < 50;
    const debtRatio = income > 0 ? (loanAmount / income) : 0;

    // Calculate overall score based on factors
    let score = 0;
    if (creditScore > 750) score += 30;
    else if (creditScore > 650) score += 20;
    else if (creditScore > 600) score += 10;

    if (income > 75000) score += 25;
    else if (income > 50000) score += 20;
    else if (income > 25000) score += 15;

    if (debtRatio < 30) score += 25;
    else if (debtRatio < 40) score += 15;
    else if (debtRatio < 50) score += 10;

    // Employment status bonus
    if (application.employment_status === 'employed') score += 20;
    else if (application.employment_status === 'self-employed') score += 15;

    const overallScore = Math.min(100, score);

    // Generate approval reasons
    const approvalReasons = [];
    if (creditScore > 700) approvalReasons.push(`Excellent credit score (${creditScore})`);
    if (income > 50000) approvalReasons.push(`Strong monthly income (₹${income.toLocaleString()})`);
    if (debtRatio < 40) approvalReasons.push(`Low debt-to-income ratio (${(debtRatio).toFixed(1)}%)`);
    if (application.employment_status === 'employed') approvalReasons.push('Stable employment status');

    // Generate risk factors (DISAPPROVAL factors)
    const rejectionRisks = [];
    if (creditScore < 650) rejectionRisks.push(`Low credit score (${creditScore}) - below minimum threshold`);
    if (income < 30000) rejectionRisks.push(`Limited monthly income (₹${income.toLocaleString()}) - insufficient for loan repayment`);
    if (debtRatio > 45) rejectionRisks.push(`High debt-to-income ratio (${(debtRatio).toFixed(1)}%) - may struggle with repayments`);
    if (!application.employment_status || application.employment_status === 'unemployed') {
      rejectionRisks.push('Unstable employment status - no regular income source');
    }
    if (loanAmount > income * 60) {
      rejectionRisks.push('Loan amount too high relative to income - high default risk');
    }

    // Generate conditions (these are for borderline cases that need additional verification)
    const conditions = [];
    if (!approved) {
      // Don't show conditions for clearly rejected applications
      if (creditScore >= 600 && income >= 25000) {
        conditions.push('Consider applying for a smaller loan amount');
      }
      if (creditScore < 650 && creditScore >= 550) {
        conditions.push('Improve credit score and reapply after 6 months');
      }
    } else {
      // Conditions for approved applications that need extra verification
      if (creditScore < 700 && creditScore >= 650) {
        conditions.push('Provide additional income verification documents');
      }
      if (debtRatio > 35 && debtRatio < 45) {
        conditions.push('Submit detailed monthly expense breakdown');
      }
      if (loanAmount > 1000000) {
        conditions.push('Collateral security required for high-value loans');
      }
    }

    return {
      decision: approved ? 'approved' : 'rejected',
      reason: approved ? 'Good income and credit profile' : 'Income or credit score below requirements',
      interest_rate: approved ? this.calculateInterestRate(application) : 'N/A',
      confidence: approved ? 85 : 65,
      overallScore,
      approvalReasons,
      rejectionRisks,
      conditions,
      factors: [
        { name: 'Credit Score', value: creditScore, impact: creditScore > 700 ? 'positive' : creditScore > 600 ? 'neutral' : 'negative' },
        { name: 'Monthly Income', value: `₹${income.toLocaleString()}`, impact: income > 50000 ? 'positive' : income > 25000 ? 'neutral' : 'negative' },
        { name: 'Debt Ratio', value: `${debtRatio.toFixed(1)}%`, impact: debtRatio < 40 ? 'positive' : debtRatio < 50 ? 'neutral' : 'negative' }
      ]
    };
  }
}

export default LoanApplicationService.getInstance();
