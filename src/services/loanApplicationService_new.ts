import { addLoanApplication, getLoanApplications } from '../dbOperations';
import type { LoanApplication, NewLoanApplication } from '../dbOperations';
import { toastService } from './toastService';
import ConversationalAI from './conversationalAI';

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

  // Process user input using conversational AI
  async processUserInput(conversationId: string, userInput: string, userId: string): Promise<{
    flow: LoanApplicationFlow;
    response: string;
    shouldCreateApplication?: boolean;
    shouldUpdateApplication?: boolean;
  }> {
    let flow = this.activeFlows.get(conversationId);

    if (!flow) {
      flow = await this.startLoanApplication(userId, conversationId);
    }

    try {
      // Use conversational AI to handle the interaction
      const aiResponse = await this.conversationalAI.chat(conversationId, userInput, flow);

      // Update flow with extracted information
      if (aiResponse.extractedInfo) {
        flow.data = { ...flow.data, ...aiResponse.extractedInfo };
      }

      // Check if application is complete
      if (aiResponse.applicationComplete) {
        const isComplete = this.checkIfApplicationComplete(flow);

        if (isComplete) {
          // Submit the application
          flow.stage = 'complete';
          flow.isComplete = true;

          try {
            const applicationData: NewLoanApplication = {
              applicant_name: flow.data.applicant_name!,
              loan_amount: flow.data.loan_amount!,
              loan_type: flow.data.loan_type!,
              credit_score: flow.data.credit_score || 650,
              monthly_income: flow.data.monthly_income!,
              employment_status: flow.data.employment_status!,
              loan_purpose: flow.data.loan_purpose || 'General purpose',
              interest_rate: "0.00",
              loan_term: 36,
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
                response: `Perfect! I've submitted your ${flow.data.loan_type} application successfully! 🎉\n\nYour application ID is ${createdApplication.id.slice(0, 8)}. You can track its status in the Loan Applications section.\n\nThanks for choosing LoanWise!`,
                shouldCreateApplication: true
              };
            } else {
              return {
                flow,
                response: "Hmm... I collected all your information, but there was an issue submitting your application. Could you try again or contact our support team?"
              };
            }
          } catch (error) {
            console.error('Error creating loan application:', error);
            return {
              flow,
              response: "I have all your details, but something went wrong while submitting. Let me try again or you can contact support."
            };
          }
        }
      }

      this.activeFlows.set(conversationId, flow);
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
    return !!(
      flow.data.loan_type &&
      flow.data.applicant_name &&
      flow.data.monthly_income &&
      flow.data.loan_amount &&
      flow.data.employment_status
      // loan_purpose and credit_score are optional
    );
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
          credit_score: application.credit_score,
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
    this.activeFlows.delete(conversationId);
    this.conversationalAI.clearConversation(conversationId);
  }

  // Get current flow for a conversation
  getCurrentFlow(conversationId: string): LoanApplicationFlow | undefined {
    return this.activeFlows.get(conversationId);
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
}

export default LoanApplicationService.getInstance();
