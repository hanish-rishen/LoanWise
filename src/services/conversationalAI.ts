import { LoanApplicationFlow } from './loanApplicationService';

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class ConversationalAI {
  private static instance: ConversationalAI;
  private conversationHistory: Map<string, ConversationMessage[]> = new Map();

  static getInstance(): ConversationalAI {
    if (!ConversationalAI.instance) {
      ConversationalAI.instance = new ConversationalAI();
    }
    return ConversationalAI.instance;
  }

  private getSystemPrompt(): string {
    return `You are LoanWise AI, a professional loan advisor with HUMAN-LEVEL INTELLIGENCE and PERFECT MEMORY. Your job is to have natural conversations while intelligently extracting loan application information.

MANDATORY FIELDS TO COLLECT:
1. loan_type (ANY type of loan - Personal, Business, Vehicle, Home, Education, Agriculture, Gold, Travel, Medical, Wedding, Emergency, etc.)
2. applicant_name (full name)
3. monthly_income (number only)
4. loan_amount (number only)
5. employment_status (job/employment type)
6. credit_score (IMPORTANT: Required for loan processing - ask if not provided)

MEMORY AND CONTEXT RULES:
- You have PERFECT MEMORY of this entire conversation
- NEVER ask for information already provided in this conversation
- If user says "I already told you" or "I said earlier", apologize and use the previously provided information
- Reference previous messages naturally (e.g., "As you mentioned earlier about your restaurant...")
- Build upon previous context instead of repeating questions

CREDIT SCORE HANDLING:
- Credit score is ESSENTIAL for loan processing and interest rate calculation
- If not provided, explain its importance: "Your credit score helps determine your interest rate and loan approval"
- Ask politely: "Could you share your credit score? It's needed to calculate your personalized interest rate"
- If user doesn't know: "You can check your credit score free on apps like CIBIL, Experian, or through your bank"

HUMAN INTELLIGENCE RULES:
- ALWAYS respond in ENGLISH only - no Hindi or other languages
- Use SMART INFERENCE and CONTEXT UNDERSTANDING like a human would
- If someone mentions "restaurant", "shop", "business", "company" - AUTOMATICALLY infer Business Loan
- If someone mentions "car", "bike", "vehicle" - AUTOMATICALLY infer Vehicle Loan
- If someone mentions "house", "home", "property" - AUTOMATICALLY infer Home Loan
- If someone mentions "travel", "trip", "vacation" - AUTOMATICALLY infer Travel Loan
- If someone mentions "medical", "hospital", "treatment" - AUTOMATICALLY infer Medical Loan
- If someone mentions "wedding", "marriage", "shaadi" - AUTOMATICALLY infer Wedding Loan
- If someone mentions "education", "college", "study" - AUTOMATICALLY infer Education Loan
- If someone says "employed" or mentions a job/company - extract employment_status as "Private" or "Government" based on context
- If someone says they work in "IT company" - employment_status is "Private"
- NEVER ask redundant questions - if context clearly provides information, extract it and move on
- Be conversational and natural, not robotic or repetitive
- Understand Indian currency (lakhs, crores) but respond in English

Remember: This is a continuous conversation. Use ALL previous context to avoid redundant questions.`;
  }

  async chat(conversationId: string, userMessage: string, loanFlow?: LoanApplicationFlow): Promise<{
    response: string;
    extractedInfo?: Partial<LoanApplicationFlow['data']>;
    shouldStartApplication?: boolean;
    applicationComplete?: boolean;
  }> {
    try {
      // Initialize conversation history if it doesn't exist
      if (!this.conversationHistory.has(conversationId)) {
        this.conversationHistory.set(conversationId, [
          { role: 'system', content: this.getSystemPrompt() }
        ]);
      }

      // Add user message to conversation history
      const history = this.conversationHistory.get(conversationId)!;
      history.push({ role: 'user', content: userMessage });

      // Use AI to handle the interaction intelligently with full conversation context
      const aiResponse = await this.getSmartResponse(conversationId, userMessage, loanFlow);

      // Add AI response to conversation history
      history.push({ role: 'assistant', content: aiResponse.response });

      // Keep conversation history manageable (last 20 messages + system prompt)
      if (history.length > 21) {
        const systemPrompt = history[0];
        const recentMessages = history.slice(-20);
        this.conversationHistory.set(conversationId, [systemPrompt, ...recentMessages]);
      }

      return aiResponse;
    } catch (error) {
      console.error('Conversational AI error:', error);

      // Handle specific error types
      if (error instanceof Error && error.message.includes('429')) {
        return {
          response: "I'm processing a lot of requests right now. Let me help you with the information you've provided so far."
        };
      }

      return {
        response: "I'm having trouble processing that right now. Could you try again in a moment?"
      };
    }
  }  // AI-powered response that extracts info and generates natural responses
  private async getSmartResponse(conversationId: string, userMessage: string, loanFlow?: LoanApplicationFlow): Promise<{
    response: string;
    extractedInfo?: Partial<LoanApplicationFlow['data']>;
    shouldStartApplication?: boolean;
    applicationComplete?: boolean;
  }> {
    // Extract information using AI with conversation context
    const extractedInfo = await this.extractInformationWithAI(conversationId, userMessage, loanFlow);

    // Generate response using AI with conversation context
    const response = await this.generateResponseWithAI(conversationId, userMessage, loanFlow, extractedInfo);

    // Check if we should start application or if it's complete
    const shouldStartApplication = !!(extractedInfo.loan_type || extractedInfo.applicant_name);
    const applicationComplete = this.isApplicationComplete(loanFlow?.data, extractedInfo);

    return {
      response,
      extractedInfo,
      shouldStartApplication,
      applicationComplete
    };
  }

  // AI-powered information extraction
  private async extractInformationWithAI(conversationId: string, userMessage: string, loanFlow?: LoanApplicationFlow): Promise<Partial<LoanApplicationFlow['data']>> {
    const currentData = loanFlow?.data || {};

    console.log('🔍 Extracting from message:', userMessage);
    console.log('🔍 Current data:', currentData);

    // Use simple pattern matching first (more reliable)
    const extracted = this.extractInformationWithPatterns(userMessage);

    console.log('🔍 Pattern extraction result:', extracted);

    // Only use AI if pattern matching didn't find anything
    if (Object.keys(extracted).length === 0) {
      try {
        const aiExtracted = await this.extractWithAI(conversationId, userMessage, currentData);
        console.log('🔍 AI extraction result:', aiExtracted);
        return aiExtracted;
      } catch (error) {
        console.error('AI extraction failed, using pattern result:', error);
        return extracted;
      }
    }

    return extracted;
  }

  // Simple pattern-based extraction (more reliable)
  private extractInformationWithPatterns(message: string): Partial<LoanApplicationFlow['data']> {
    const result: any = {};
    const lowerMessage = message.toLowerCase();

    // Extract loan type
    if (lowerMessage.includes('business loan')) result.loan_type = 'Business Loan';
    else if (lowerMessage.includes('education loan')) result.loan_type = 'Education Loan';
    else if (lowerMessage.includes('vehicle loan') || lowerMessage.includes('car loan') || lowerMessage.includes('bike loan')) result.loan_type = 'Vehicle Loan';
    else if (lowerMessage.includes('home loan') || lowerMessage.includes('house loan')) result.loan_type = 'Home Loan';
    else if (lowerMessage.includes('personal loan')) result.loan_type = 'Personal Loan';

    // Extract name - be more careful about patterns
    const namePatterns = [
      /(?:my (?:full )?name is)\s+([a-zA-Z\s]+)/i,
      /(?:i am|call me)\s+([A-Z][a-zA-Z\s]+)(?:\s+and\s+|[^a-zA-Z]|$)/i,  // Only match when followed by capitalized name
      /name:\s*([a-zA-Z\s]+)/i,
      // Avoid matching "I am looking" or "I am working" type phrases
    ];
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match) {
        const extractedName = match[1].trim();
        // Avoid extracting loan-related phrases as names
        const loanRelatedWords = ['looking', 'for', 'loan', 'personal', 'business', 'education', 'vehicle', 'home', 'employed', 'working', 'seeking', 'applying'];
        const hasLoanWords = loanRelatedWords.some(word => extractedName.toLowerCase().includes(word));

        if (!hasLoanWords && extractedName.length > 1) {
          result.applicant_name = extractedName;
          break;
        }
      }
    }

  // Extract income - handle various formats
    const incomePatterns = [
      /(?:income|salary|earn)(?:\s+is)?\s+(\d+(?:\.\d+)?)\s*(?:lakh|lakhs)/i,
      /(?:income|salary|earn)(?:\s+is)?\s+(\d+(?:\.\d+)?)\s*(?:crore|crores)/i,
      /(?:income|salary|earn)(?:\s+is)?\s+(\d{4,})/i,  // 4+ digits assume exact amount
      /(?:income|salary|earn)(?:\s+is)?\s+(\d{1,3})$/i,  // 1-3 digits assume lakhs
      /^\s*(?:yeah\s+)?(\d{4,})\s*$/i,  // Standalone numbers (when user just answers with a number)
      /^\s*(?:yes\s+)?(\d{4,})\s*$/i   // Another variation
    ];

    for (const pattern of incomePatterns) {
      const match = message.match(pattern);
      if (match) {
        const num = parseFloat(match[1]);
        if (pattern.source.includes('lakh')) {
          result.monthly_income = (num * 100000).toString();
        } else if (pattern.source.includes('crore')) {
          result.monthly_income = (num * 10000000).toString();
        } else if (num >= 1000) {
          result.monthly_income = num.toString();
        } else {
          // Small number, assume lakhs
          result.monthly_income = (num * 100000).toString();
        }
        break;
      }
    }

    // Extract loan amount - be careful not to misread monthly income as loan amount
    const hasIncomeContext = /income|salary|per\s*month|monthly/.test(lowerMessage);
    const explicitLoanContext = /(\bloan\b|\bamount\b|\bloan amount\b|\bneed\b|\bwant\b|looking for|borrow|fund|funding)/.test(lowerMessage);

    // Strong loan amount patterns (lakh/crore or explicit loan-related phrasing)
    const amountPatternsStrong = [
      /(\d+(?:\.\d+)?)\s*(?:lacs?|lakhs?)/i,  // Handle both "lacs" and "lakhs"
      /(\d+(?:\.\d+)?)\s*(?:crores?)/i,       // Handle "crore" and "crores"
      /(?:loan|amount|need|want|looking for)(?:\s+(?:amount|of))?(?:\s+is)?(?:\s+around)?(?:\s+rupees)?(?:\s+of)?\s+(\d{4,})/i,
      /(?:for|about|around|approximately)\s+(\d{4,})\s*(?:of\s+)?(?:loan|amount|rupees)?/i, // "for 600000 of loan amount"
      /(\d{4,})\s+(?:of\s+)?(?:loan|amount|rupees)/i, // "600000 of loan amount"
      /(?:around|approximately|about)\s+(\d+)/i
    ];

    // Only attempt to extract loan amount if:
    // - The message explicitly talks about a loan/amount, OR
    // - There's no income context and we didn't just extract monthly_income
    if (explicitLoanContext || (!hasIncomeContext && !result.monthly_income)) {
      let matchedAmount = false;
      for (const pattern of amountPatternsStrong) {
        const match = message.match(pattern);
        if (match) {
          console.log(`🔍 Loan amount pattern matched: ${pattern.source} -> ${match[1]}`);
          const num = parseFloat(match[1]);
          if (pattern.source.includes('lacs?|lakhs?')) {
            result.loan_amount = (num * 100000).toString();
          } else if (pattern.source.includes('crores?')) {
            result.loan_amount = (num * 10000000).toString();
          } else {
            result.loan_amount = num.toString();
          }
          console.log(`🔍 Extracted loan amount: ${result.loan_amount}`);
          matchedAmount = true;
          break;
        }
      }

      // As a last resort, allow standalone 5+ digit numbers ONLY when there's explicit loan context
      if (!matchedAmount && explicitLoanContext) {
        const fallback = message.match(/^\s*(\d{5,})\s*$/i);
        if (fallback) {
          const num = parseFloat(fallback[1]);
          result.loan_amount = num.toString();
          console.log(`🔍 Extracted loan amount from fallback (explicit context): ${result.loan_amount}`);
        }
      }
    }

    // Extract employment status
    if (lowerMessage.includes('employed') && !lowerMessage.includes('unemployed')) {
      result.employment_status = 'Employed';
    } else if (lowerMessage.includes('self-employed') || lowerMessage.includes('business owner')) {
      result.employment_status = 'Self-employed';
    } else if (lowerMessage.includes('student')) {
      result.employment_status = 'Student';
    }

    // Extract credit score
    const creditPatterns = [
      /(?:credit score|cibil score|score)(?:\s+is)?\s+(\d{3})/i,
      /^\s*(?:it's\s+)?(\d{3})\s*$/i,  // Standalone 3-digit numbers
      /^\s*(\d{3})\s*$/i               // Just the number
    ];

    for (const pattern of creditPatterns) {
      const creditMatch = message.match(pattern);
      if (creditMatch) {
        result.credit_score = parseInt(creditMatch[1]);
        break;
      }
    }

    // Extract terms acceptance/rejection
    if (lowerMessage.match(/^(yes|yeah|yep|accept|approve|proceed|ok|okay|sounds good|looks good|agree)$/i)) {
      result.terms_accepted = true;
    } else if (lowerMessage.match(/^(no|nope|reject|decline|cancel|not interested)$/i)) {
      result.terms_rejected = true;
    }

    return result;
  }

  // Fallback AI extraction
  private async extractWithAI(conversationId: string, userMessage: string, existingData: any): Promise<any> {
    const conversationHistory = this.conversationHistory.get(conversationId) || [];

    // First, preprocess the message for Indian currency terms (backup conversion)
    const preprocessedMessage = this.preprocessIndianCurrency(userMessage);

    // First, check if we can extract information from the current message
    const extractionPrompt = `Extract loan information from this message: "${preprocessedMessage}"

CURRENT DATA ALREADY COLLECTED:
${JSON.stringify(existingData, null, 2)}

CONVERSATION HISTORY (for context):
${conversationHistory.slice(-8).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CRITICAL EXTRACTION RULES:
- Extract ONLY information EXPLICITLY mentioned in the current message
- DO NOT make assumptions or inferences unless clearly stated
- DO NOT extract loan_type unless it's explicitly mentioned (e.g., "education loan", "business loan")
- DO NOT extract "Personal Loan" just because someone says "loan" - they need to specify the type
- Use conversation context to understand references

INDIAN CURRENCY CONVERSION (VERY IMPORTANT):
- 1 lakh = 100000 (1,00,000)
- 1 crore = 10000000 (1,00,00,000)
- Convert lakhs/crores to actual rupee amounts

CURRENCY EXTRACTION EXAMPLES:
✅ "30 lakhs" → {"loan_amount": "3000000"} (30 × 100000)
✅ "5 crores" → {"loan_amount": "50000000"} (5 × 10000000)
✅ "2.5 lakhs" → {"loan_amount": "250000"} (2.5 × 100000)
✅ "50000 rupees" → {"loan_amount": "50000"}
✅ "1.5 crore" → {"loan_amount": "15000000"} (1.5 × 10000000)
✅ "45000 per month" → {"monthly_income": "45000"}
✅ "2 lakh monthly" → {"monthly_income": "200000"}

OTHER EXTRACTION EXAMPLES:
✅ "education loan" → {"loan_type": "Education Loan"}
✅ "vehicle loan" → {"loan_type": "Vehicle Loan"}
✅ "car loan" → {"loan_type": "Vehicle Loan"}
✅ "bike loan" → {"loan_type": "Vehicle Loan"}
✅ "business loan" → {"loan_type": "Business Loan"}
✅ "home loan" → {"loan_type": "Home Loan"}
✅ "personal loan" → {"loan_type": "Personal Loan"}
✅ "Max Verstappen" → {"applicant_name": "Max Verstappen"}
✅ "Gabriel Jackson" → {"applicant_name": "Gabriel Jackson"}
✅ "my name is John Doe" → {"applicant_name": "John Doe"}
✅ "I am John Smith" → {"applicant_name": "John Smith"}
✅ "my full name is Gabriel Jackson" → {"applicant_name": "Gabriel Jackson"}
✅ "call me Alex" → {"applicant_name": "Alex"}
✅ "I am employed" → {"employment_status": "Employed"}
✅ "currently employed" → {"employment_status": "Employed"}
✅ "self-employed" → {"employment_status": "Self-employed"}
✅ "student" → {"employment_status": "Student"}

SPECIAL INCOME HANDLING:
✅ "monthly income is 2" → {"monthly_income": "200000"} (assume 2 lakhs)
✅ "income is 3" → {"monthly_income": "300000"} (assume 3 lakhs)
✅ "salary is 5" → {"monthly_income": "500000"} (assume 5 lakhs)
✅ "I earn 4" → {"monthly_income": "400000"} (assume 4 lakhs)

❌ "I want a loan" → {} (NO loan_type - not specific enough)
❌ "apply for loan" → {} (NO loan_type - not specific enough)
❌ "need money" → {} (NO loan_type - not specific enough)

Only extract what is EXPLICITLY stated. Convert lakhs/crores to rupees. Return ONLY valid JSON:`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: `You are a conservative information extractor with expertise in Indian currency. Only extract information that is EXPLICITLY stated.

CONVERSATION CONTEXT:
${conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current data: ${JSON.stringify(existingData)}

STRICT RULES:
- Extract ONLY explicit information from the latest user message
- CAREFULLY extract loan_type when mentioned (e.g. "vehicle loan", "car loan", "education loan", "home loan")
- Convert Indian currency terms: 1 lakh = 100000, 1 crore = 10000000
- For single digit income (e.g. "income is 2"), assume lakhs: 2 = 200000
- Return valid JSON only
- When in doubt, extract nothing

LOAN TYPE EXAMPLES:
- "vehicle loan" → {"loan_type": "Vehicle Loan"}
- "car loan" → {"loan_type": "Vehicle Loan"}
- "education loan" → {"loan_type": "Education Loan"}
- "business loan" → {"loan_type": "Business Loan"}` },
            { role: 'user', content: extractionPrompt }
          ],
          temperature: 0.1,
          max_tokens: 200
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract information');
      }

      const data = await response.json();
      const extractedText = data.choices[0]?.message?.content?.trim() || '{}';

      try {
        const extracted = JSON.parse(extractedText);
        console.log('🔍 Extracted from message:', extracted);
        console.log('🔍 Current data before merge:', existingData);

        // Post-process extracted data to ensure currency conversion
        const processedExtracted = this.postProcessExtractedData(extracted, userMessage);
        console.log('🔍 Post-processed extracted data:', processedExtracted);

        return processedExtracted;
      } catch {
        console.log('⚠️ Failed to parse extracted JSON:', extractedText);
        return {};
      }
    } catch (error) {
      console.error('AI extraction error:', error);
      return {};
    }
  }  // AI-powered response generation
  private async generateResponseWithAI(conversationId: string, userMessage: string, loanFlow?: LoanApplicationFlow, extractedInfo?: any): Promise<string> {
    // Merge current data with newly extracted info properly
    const baseData = loanFlow?.data || {};
    const mergedData = { ...baseData, ...extractedInfo };

    console.log('🔍 Response generation - Base data:', baseData);
    console.log('🔍 Response generation - Extracted info:', extractedInfo);
    console.log('🔍 Response generation - Merged data:', mergedData);

    // Determine what information is missing from the merged data
    const missingFields = [];
    if (!mergedData.loan_type) missingFields.push("loan type");
    if (!mergedData.applicant_name) missingFields.push("applicant name");
    if (!mergedData.monthly_income) missingFields.push("monthly income");
    if (!mergedData.loan_amount) missingFields.push("loan amount");
    if (!mergedData.employment_status) missingFields.push("employment status");
    if (!mergedData.credit_score) missingFields.push("credit score");

    console.log('🔍 Missing fields after merge:', missingFields);

    const nextField = missingFields[0]; // Get the next missing field

    // Use deterministic response generation
    if (!nextField) {
      // Check if we're in terms review stage
      if (loanFlow?.stage === 'terms_review') {
        return "Perfect! I have all the information needed. Let me calculate your personalized loan terms!";
      }
      return "Perfect! I have all the information needed. Let me calculate your personalized loan terms!";
    }

    // Generate appropriate response for the next field
    switch (nextField) {
      case "loan type":
        return "What type of loan are you looking for? (Personal, Education, Business, Home, Vehicle, etc.)";
      case "applicant name":
        if (mergedData.loan_type) {
          return `Great! A ${mergedData.loan_type} is an excellent choice. Could you please tell me your full name?`;
        }
        return "Could you please tell me your full name?";
      case "monthly income":
        return "Thank you! Now, what's your monthly income in rupees?";
      case "loan amount":
        return "Perfect! How much loan amount are you looking for?";
      case "employment status":
        return "Excellent! Are you currently employed, self-employed, or a student?";
      case "credit score":
        return "Great! What's your credit score? If you don't know, you can check it through CIBIL or your bank app.";
      default:
        return "Thank you for that information. What else would you like to tell me about your loan application?";
    }
  }

  // Helper method to check if application is complete
  private isApplicationComplete(currentData?: any, extractedInfo?: any): boolean {
    const data = { ...(currentData || {}), ...extractedInfo };
    return !!(
      data.loan_type &&
      data.applicant_name &&
      data.monthly_income &&
      data.loan_amount &&
      data.employment_status &&
      data.credit_score
    );
  }

  clearConversation(conversationId: string): void {
    console.log('🔄 ConversationalAI: Clearing conversation history for:', conversationId);
    const hadHistory = this.conversationHistory.has(conversationId);
    this.conversationHistory.delete(conversationId);
    console.log('✅ ConversationalAI: Conversation cleared (had history:', hadHistory, ')');
  }

  // Method to clear ALL conversation histories (for when user clears all chats)
  clearAllConversations(): void {
    console.log('🔄 ConversationalAI: Clearing ALL conversation histories');
    const count = this.conversationHistory.size;
    this.conversationHistory.clear();
    console.log('✅ ConversationalAI: All conversations cleared (cleared', count, 'conversations)');
  }

  // Method to reset wrong data extraction while preserving conversation context
  resetWrongData(conversationId: string): void {
    // Keep conversation history but don't delete it completely
    // This allows the AI to learn from the conversation context
    console.log('Resetting wrong data for conversation:', conversationId);
  }

  // Method to get conversation context for debugging
  getConversationContext(conversationId: string): ConversationMessage[] {
    return this.conversationHistory.get(conversationId) || [];
  }

  // Helper method to preprocess Indian currency terms
  private preprocessIndianCurrency(message: string): string {
    let processed = message;
    console.log('🔍 Original message:', message);

    // Convert various patterns of lakhs and crores
    // Handle patterns like "30 lakhs", "30 lakh", "30lakhs", "30-lakhs", "8 lacs", etc.
    processed = processed.replace(/(\d+(?:\.\d+)?)\s*(?:lacs?|lakhs?)/gi, (_, num) => {
      const amount = parseFloat(num) * 100000;
      console.log(`🔍 Converting ${num} lakhs/lacs to ${amount} rupees`);
      return `${amount} rupees`;
    });

    // Handle crores
    processed = processed.replace(/(\d+(?:\.\d+)?)\s*(?:crore|crores)/gi, (_, num) => {
      const amount = parseFloat(num) * 10000000;
      console.log(`🔍 Converting ${num} crores to ${amount} rupees`);
      return `${amount} rupees`;
    });

    console.log('🔍 Processed message:', processed);
    return processed;
  }

  // Helper method to post-process extracted data for currency conversion
  private postProcessExtractedData(extracted: any, originalMessage: string): any {
    const processed = { ...extracted };
    const lowerMessage = originalMessage.toLowerCase();

    console.log('🔍 Post-processing extracted data:', extracted);
    console.log('🔍 Original message for post-processing:', originalMessage);

    // Look for lakh/crore patterns that might have been missed
    const lakhMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*(?:lacs?|lakhs?)/);
    const croreMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*(?:crores?)/);

    // Special pattern: Handle "80000 8000" type corrections where user repeats/clarifies
    const duplicateNumberPattern = lowerMessage.match(/(\d{4,6})\s+(\d{4,6})/);
    if (duplicateNumberPattern && lowerMessage.includes('income')) {
      const [, num1, num2] = duplicateNumberPattern;
      // If the numbers are similar or one is a substring of another, use the first (likely correct) one
      if (num1.includes(num2) || num2.includes(num1) || Math.abs(parseInt(num1) - parseInt(num2)) < parseInt(num1) * 0.2) {
        console.log(`🔍 Found duplicate/correction pattern: ${num1} ${num2}, using ${num1}`);
        processed.monthly_income = num1;
      }
    }

    // Special case: Handle single digit income (assume lakhs)
    if (extracted.monthly_income && /^\d{1}$/.test(extracted.monthly_income)) {
      const lakhs = parseInt(extracted.monthly_income);
      const amount = lakhs * 100000;
      console.log(`🔍 Converting single digit income ${lakhs} to ${amount} rupees (assuming lakhs)`);
      processed.monthly_income = amount.toString();
    }

    // Special case: User says just a number followed by "lakh" in context
    // Example: "I am looking for around" -> "8" -> "hey I just wanted to make a correction I said 8 lakh"
    const numberWithLakhContext = lowerMessage.match(/(\d+)\s*lakh/);
    const justNumberPattern = lowerMessage.match(/^(\d+)$/);

    // If user says "8 lakh" directly
    if (lakhMatch) {
      const lakhValue = parseFloat(lakhMatch[1]);
      const amount = lakhValue * 100000;
      console.log(`🔍 Found lakh pattern: ${lakhValue} lakhs = ${amount} rupees`);

      // Determine if this is loan amount or monthly income based on context
      if (lowerMessage.includes('month') || lowerMessage.includes('salary') || lowerMessage.includes('income')) {
        console.log(`🔍 Setting monthly_income to ${amount}`);
        processed.monthly_income = amount.toString();
      } else {
        console.log(`🔍 Setting loan_amount to ${amount}`);
        processed.loan_amount = amount.toString();
      }
    }

    // If user mentions "correction" and "lakh" - this handles "I said 8 lakh you have written as 8"
    else if (lowerMessage.includes('correction') && numberWithLakhContext) {
      const lakhValue = parseFloat(numberWithLakhContext[1]);
      const amount = lakhValue * 100000;
      console.log(`🔍 Found correction with lakh: ${lakhValue} lakhs = ${amount} rupees`);
      processed.loan_amount = amount.toString();
    }

    // If user just says a number and extracted loan_amount exists but is small
    else if (justNumberPattern && extracted.loan_amount && parseInt(extracted.loan_amount) < 100) {
      // This might be lakhs - check if it makes sense as lakhs
      const number = parseInt(justNumberPattern[1]);
      if (number >= 1 && number <= 100) { // Reasonable range for lakhs
        const amount = number * 100000;
        console.log(`🔍 Converting solo number ${number} to ${amount} rupees (assuming lakhs)`);
        processed.loan_amount = amount.toString();
      }
    }    if (croreMatch) {
      const croreValue = parseFloat(croreMatch[1]);
      const amount = croreValue * 10000000;
      console.log(`🔍 Found crore pattern: ${croreValue} crores = ${amount} rupees`);

      if (lowerMessage.includes('month') || lowerMessage.includes('salary') || lowerMessage.includes('income')) {
        console.log(`🔍 Setting monthly_income to ${amount}`);
        processed.monthly_income = amount.toString();
      } else {
        console.log(`🔍 Setting loan_amount to ${amount}`);
        processed.loan_amount = amount.toString();
      }
    }

    // Final safety: if we captured monthly_income and there's no explicit loan context in the message,
    // ensure we don't also set loan_amount from the same numeric reply
    const loanContext = /(\bloan\b|\bloan amount\b|\bborrow\b|\bfund\b|\bfunding\b|\bneed\b|\bwant\b)/.test(lowerMessage);
    const incomeContext = /(income|salary|per\s*month|monthly)/.test(lowerMessage);
    if (processed.monthly_income && !loanContext && incomeContext) {
      if (processed.loan_amount === processed.monthly_income || !extracted.loan_amount) {
        delete processed.loan_amount;
      }
    }

    console.log('🔍 Final processed data:', processed);
    return processed;
  }
}

export default ConversationalAI;
