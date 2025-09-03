# Lo## Features

- 🔐 **Authentication**: Secure authentication with Clerk
- 🗣️ **Voice AI**: Advanced voice conversations with VAD (Voice Activity Detection)
- 🤖 **AI Chat**: Integrated chat interface for loan assistance powered by Groq
- 📊 **Loan Management**: Comprehensive loan application tracking
- 🎨 **Modern UI**: Beautiful Tailwind CSS design
- 🎤 **Voice Controls**: Real-time voice input/output with visual feedback

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Authentication**: Clerk
- **Database**: Neon (PostgreSQL) with Drizzle ORM
- **AI**: Groq API (Llama models)
- **Voice**: Web Speech API + VAD (@ricky0123/vad)
- **Styling**: Tailwind CSS
- **Icons**: Lucide Reactered Loan Management Platform

A modern React application for managing loan applications with AI-powered chat assistance, built with Clerk authentication and Neon PostgreSQL database.

## Features

- 🔐 **Authentication**: Secure authentication with Clerk
- �️ **Database**: Serverless PostgreSQL with Neon
- 🤖 **AI Chat**: Integrated chat interface for loan assistance
- 📊 **Loan Management**: Comprehensive loan application tracking
- 🎨 **Modern UI**: Beautiful Tailwind CSS design

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Authentication**: Clerk
- **Database**: Neon (PostgreSQL) with Drizzle ORM
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd r:\LoanWise\project
npm install
```

### 2. Set up Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.dev/)
2. Create a new application
3. Copy your publishable key
4. Add it to your `.env` file

### 3. Set up Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Create a database and note the connection string
4. Run the database schema:

```bash
# Connect to your Neon database using psql or any PostgreSQL client
psql "your-neon-connection-string" -f database-schema.sql
```

Or copy and paste the SQL commands from `database-schema.sql` into your Neon SQL editor.

### 4. Set up Groq AI (for Voice Features)

1. Go to [Groq Console](https://console.groq.com/)
2. Create an account and get your API key
3. Add it to your `.env` file

### 5. Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

Update the following variables in `.env`:

```env
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Neon Database
VITE_NEON_DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# Groq AI (for voice features)
VITE_GROQ_API_KEY=your_groq_api_key
```

### 6. Run the Application

```bash
npm run dev
```

## Database Schema

The application uses two main tables:

### loan_applications
- Stores loan application data
- Linked to Clerk user IDs for multi-tenancy
- Includes all loan details and status tracking

### chat_messages
- Stores chat conversation history
- Separate conversations per user
- Timestamped messages with sender information

## Voice Features

LoanWise includes advanced voice capabilities powered by AI:

### 🎤 Voice Activity Detection (VAD)
- Real-time voice detection using `@ricky0123/vad`
- Automatic speech start/end detection
- Visual feedback with pulsing indicators

### 🗣️ Speech-to-Text & Text-to-Speech
- Browser-native Web Speech API
- Automatic voice transcription
- AI voice responses with natural speech synthesis

### 🤖 AI-Powered Conversations
- **Groq Llama 3.1 70B** for intelligent responses
- Specialized in loan/finance conversations
- Context-aware responses
- Professional financial advice

### 🎛️ Voice Controls
- **Microphone Toggle**: Start/stop voice listening
- **Mute Button**: Control AI voice output
- **VAD Indicator**: Real-time voice detection status
- **Visual Feedback**: Animated indicators for voice activity

### How to Use Voice Features

1. **Enable Voice Mode**: Click the microphone icon in the chat header
2. **Start Speaking**: The VAD will automatically detect when you speak
3. **AI Response**: The AI will respond with both text and voice
4. **Mute/Unmute**: Use the volume button to control voice output

### Voice Commands Examples
- "What's my credit score?"
- "Help me apply for a loan"
- "What documents do I need?"
- "Check my application status"

## Key Changes Made

1. **Database Migration**: Replaced Firebase with Neon PostgreSQL
2. **ORM Integration**: Added Drizzle ORM for type-safe database operations
3. **Schema Definition**: Created proper database schema with relationships
4. **Authentication**: Maintained Clerk authentication with user-specific data
5. **Real-time Features**: Chat messages are stored and retrieved from PostgreSQL

## Usage

1. **Sign Up/Login**: Users authenticate through Clerk
2. **Dashboard**: Access main dashboard with AI chat and loan management
3. **Voice Conversations**: Use voice mode for hands-free loan assistance
4. **Loan Applications**: View and manage applications (filtered by user)
5. **AI Chat**: Chat with AI assistant (messages stored per user)

### Getting Your Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file as `VITE_GROQ_API_KEY`

**Note**: Groq offers a generous free tier (200k tokens/month) perfect for development and small-scale usage.

## Testing Voice Features

### Browser Requirements
- **Chrome/Edge**: Full voice support
- **Firefox**: Limited TTS support
- **Safari**: Limited support
- **HTTPS Required**: Voice features need secure context

### Quick Test
1. Open the app in a supported browser
2. Sign in and go to the chat interface
3. Click the **microphone icon** in the header
4. Say: *"Hello, can you help me with a loan?"*
5. The AI should respond with both text and voice

### Troubleshooting
- **No microphone access**: Grant microphone permissions in browser
- **No voice response**: Check browser TTS settings
- **API errors**: Verify your Groq API key in `.env`
- **VAD not working**: Try refreshing the page

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Database Management

### Adding Sample Data

You can add sample loan applications and chat messages using the SQL commands in `database-schema.sql`.

### Database Queries

The app uses Drizzle ORM for type-safe database operations:

```typescript
// Example: Fetch user applications
const applications = await db
  .select()
  .from(loanApplications)
  .where(eq(loanApplications.userId, userId));

// Example: Save chat message
await db.insert(chatMessages).values({
  content: message,
  sender: 'user',
  userId: userId
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
