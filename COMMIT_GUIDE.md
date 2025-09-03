# 📝 LoanWise Git Commit Guide

This document outlines the commit strategy and workflow for the LoanWise project. Follow these guidelines to maintain a clean, trackable git history.

## 🏗️ Commit Structure

### Conventional Commits Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries
- **ci**: Changes to CI configuration files and scripts
- **build**: Changes that affect the build system or external dependencies

### Scopes (Optional)
- **ui**: User interface components
- **api**: API/service layer changes
- **db**: Database related changes
- **auth**: Authentication/authorization
- **voice**: Voice mode functionality
- **chat**: Chat interface functionality
- **loan**: Loan application features
- **config**: Configuration changes

## 📦 What to Commit Per Commit

### 1. **Initial Setup Commits**

#### First Commit: Project Foundation
```bash
feat: initialize LoanWise loan application platform

- Set up Vite + React + TypeScript project structure
- Configure Tailwind CSS for styling
- Add Clerk authentication
- Set up basic routing with React Router
- Configure ESLint and development tools

Files to include:
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── index.html
├── src/main.tsx
├── src/App.tsx
├── src/index.css
├── src/vite-env.d.ts
└── README.md
```

#### Database Setup
```bash
feat(db): set up database schema and connection

- Create Drizzle ORM schema for loan applications and chat messages
- Configure Neon database connection
- Add database migration scripts
- Set up database operations layer

Files to include:
├── database-schema.sql
├── setup-db.js
├── src/schema.ts
├── src/database.ts
├── src/db.ts
├── src/dbOperations.ts
└── .env.example
```

### 2. **Authentication System**
```bash
feat(auth): implement Clerk authentication system

- Set up Clerk provider and authentication flows
- Create login page with social auth options
- Add protected routes and user context
- Implement user session management

Files to include:
├── src/components/LoginPage.tsx
└── src/App.tsx (auth wrapper updates)
```

### 3. **Core UI Components**

#### Header Component
```bash
feat(ui): create responsive header component

- Add LoanWise branding and logo
- Implement user profile dropdown
- Add navigation controls
- Ensure responsive design

Files to include:
└── src/components/Header.tsx
```

#### Sidebar Component
```bash
feat(ui): implement navigation sidebar with conversation history

- Create collapsible sidebar with smooth animations
- Add conversation list and management
- Implement new chat/voice mode buttons
- Add responsive design for mobile

Files to include:
└── src/components/Sidebar.tsx
```

### 4. **Chat Functionality**

#### Basic Chat Interface
```bash
feat(chat): implement text-based chat interface

- Create message display with sender differentiation
- Add input field with send functionality
- Implement message persistence to database
- Add typing indicators and message timestamps

Files to include:
├── src/components/ChatInterface.tsx
└── src/services/conversationalAI.ts
```

#### Enhanced Chat Features
```bash
feat(chat): add markdown formatting and improved UX

- Integrate ReactMarkdown for rich message display
- Add custom styling for code, lists, and emphasis
- Implement message clearing functionality
- Add conversation context management

Files to include:
├── src/components/ChatInterface.tsx (markdown updates)
└── package.json (ReactMarkdown dependency)
```

### 5. **Voice Mode Implementation**

#### Core Voice Features
```bash
feat(voice): implement voice interaction system

- Add speech recognition with Web Speech API
- Implement text-to-speech functionality
- Create voice mode UI with visual feedback
- Add microphone controls and status indicators

Files to include:
├── src/components/VoiceMode.tsx
├── src/services/speechService.ts
└── src/services/voiceService.ts
```

#### Voice Enhancements
```bash
feat(voice): enhance voice experience with advanced features

- Add voice settings and speaker selection
- Implement continuous listening mode
- Add voice activity detection (VAD)
- Create audio visualization effects

Files to include:
├── src/components/VoiceMode.tsx (enhancements)
├── src/components/VoiceSettings.tsx
├── src/services/enhancedVoiceService.ts
└── public/silero_vad.onnx
```

### 6. **Loan Application System**

#### Core Loan Service
```bash
feat(loan): implement loan application processing service

- Create loan application data models
- Add loan decision analysis algorithms
- Implement interest rate calculation
- Add loan term determination logic

Files to include:
├── src/services/loanApplicationService.ts
└── src/schema.ts (loan application schema)
```

#### Loan UI Integration
```bash
feat(loan): integrate loan application display in voice mode

- Add real-time loan data visualization
- Implement editable loan application fields
- Create loan terms display with approval factors
- Add loan application submission flow

Files to include:
└── src/components/VoiceMode.tsx (loan integration)
```

#### Loan Applications Page
```bash
feat(loan): create loan applications management page

- Build comprehensive loan applications listing
- Add filtering and search functionality
- Implement detailed application view
- Add approval/rejection analysis display

Files to include:
└── src/components/LoanApplicationsPage.tsx
```

### 7. **UI/UX Improvements**

#### Responsive Design Fixes
```bash
fix(ui): resolve layout issues and improve responsive design

- Fix sidebar positioning from fixed to flexbox layout
- Resolve zoom level compatibility issues
- Improve component overflow handling
- Enhance mobile responsiveness

Files to include:
├── src/App.tsx (layout structure)
├── src/components/Sidebar.tsx (positioning)
├── src/components/VoiceMode.tsx (responsive)
└── src/components/ChatInterface.tsx (responsive)
```

#### Toast Notifications
```bash
feat(ui): add toast notification system

- Implement toast service for user feedback
- Add success, error, and info message types
- Create toast container with animations
- Integrate notifications across all features

Files to include:
├── src/components/ToastContainer.tsx
└── src/services/toastService.ts
```

### 8. **AI and Conversational Features**

#### Conversational AI Service
```bash
feat(ai): implement advanced conversational AI system

- Create context-aware conversation management
- Add conversation memory and state tracking
- Implement multi-turn conversation flows
- Add conversation clearing and reset functionality

Files to include:
└── src/services/conversationalAI.ts
```

### 9. **Configuration and Build Setup**

#### GitHub Actions
```bash
ci: set up comprehensive GitHub Actions workflows

- Add CI/CD pipeline with testing and deployment
- Implement code quality checks and security scanning
- Create auto-labeling for PRs and issues
- Add deployment workflows for staging and production

Files to include:
├── .github/workflows/ci-cd.yml
├── .github/workflows/code-quality.yml
├── .github/workflows/security.yml
├── .github/workflows/deploy-vercel.yml
├── .github/workflows/auto-label.yml
├── .github/labeler.yml
├── .github/ISSUE_TEMPLATE/bug_report.md
├── .github/ISSUE_TEMPLATE/feature_request.md
└── .github/pull_request_template.md
```

#### Environment Configuration
```bash
chore(config): add environment configuration and secrets management

- Set up environment variables for different stages
- Add Clerk and API key configuration
- Configure database connection strings
- Add build and deployment configuration

Files to include:
├── .env.example
└── vite.config.ts (environment handling)
```

### 10. **Testing and Quality Assurance**

#### Testing Setup
```bash
test: set up testing framework and initial tests

- Configure Jest and React Testing Library
- Add unit tests for core components
- Create integration tests for API calls
- Add E2E tests for critical user flows

Files to include:
├── jest.config.js
├── src/__tests__/
├── src/components/__tests__/
└── e2e/
```

#### Code Quality Tools
```bash
chore(quality): configure code quality and formatting tools

- Set up Prettier for code formatting
- Configure Husky for git hooks
- Add lint-staged for pre-commit checks
- Set up commitlint for commit message validation

Files to include:
├── .prettierrc
├── .prettierignore
├── .husky/
├── commitlint.config.js
└── package.json (scripts and hooks)
```

## 🔄 Branching Strategy

### Branch Naming Convention
- **feature/**: New features (`feature/voice-mode-ui`)
- **fix/**: Bug fixes (`fix/chat-message-clearing`)
- **docs/**: Documentation (`docs/update-readme`)
- **refactor/**: Code refactoring (`refactor/loan-service-optimization`)
- **test/**: Testing (`test/add-voice-mode-tests`)
- **chore/**: Maintenance (`chore/update-dependencies`)

### Workflow
1. **Main Branch**: Production-ready code
2. **Develop Branch**: Integration branch for features
3. **Feature Branches**: Individual feature development
4. **Hotfix Branches**: Critical bug fixes for production

### Example Workflow
```bash
# Create feature branch
git checkout -b feature/voice-settings-panel

# Make commits following the guide
git commit -m "feat(voice): add voice settings panel component"
git commit -m "feat(voice): implement speaker selection functionality"
git commit -m "style(voice): improve voice settings UI responsiveness"

# Push and create PR
git push origin feature/voice-settings-panel
```

## 📋 Commit Message Examples

### Good Examples
```bash
feat(voice): add speech recognition with visual feedback
fix(chat): resolve message duplication issue
docs: update API documentation for loan service
refactor(ui): optimize sidebar component performance
test(loan): add unit tests for loan calculation logic
chore: update dependencies to latest versions
ci: add automated security scanning workflow
```

### Bad Examples
```bash
fix stuff
update
changes
wip
.
test commit
```

## � Equal Commit Distribution Strategy

### Overview
To ensure fair contribution distribution between **Teammate 1** and **Teammate 2**, here's a structured approach to split commits evenly while maintaining code quality and logical development flow.

### 🎯 Commit Allocation Strategy

#### **Total Estimated Commits: ~40-50 commits**
Each teammate should aim for **20-25 commits** to maintain equal contribution.

### 📋 Teammate 1 Commits (25 commits)

#### **Initial Setup & Foundation (5 commits)**
1. **Project Foundation**
   ```bash
   feat: initialize LoanWise loan application platform
   ```

2. **Database Setup**
   ```bash
   feat(db): set up database schema and connection
   ```

3. **Authentication System**
   ```bash
   feat(auth): implement Clerk authentication system
   ```

4. **Basic Routing**
   ```bash
   feat: set up React Router and basic navigation
   ```

5. **Environment Configuration**
   ```bash
   chore(config): add environment configuration and secrets management
   ```

#### **UI Core Components (7 commits)**
6. **Header Component**
   ```bash
   feat(ui): create responsive header component
   ```

7. **Sidebar Component**
   ```bash
   feat(ui): implement navigation sidebar with conversation history
   ```

8. **Toast Notifications**
   ```bash
   feat(ui): add toast notification system
   ```

9. **Login Page**
   ```bash
   feat(auth): create login page with social authentication
   ```

10. **Basic Styling Setup**
    ```bash
    style: set up Tailwind CSS and base styling system
    ```

11. **Responsive Layout Fixes**
    ```bash
    fix(ui): resolve layout issues and improve responsive design
    ```

12. **Mobile Optimizations**
    ```bash
    feat(ui): optimize interface for mobile devices
    ```

#### **Voice Mode System (8 commits)**
13. **Speech Service Foundation**
    ```bash
    feat(voice): implement speech recognition and synthesis services
    ```

14. **Voice Mode UI**
    ```bash
    feat(voice): create voice mode interface with visual feedback
    ```

15. **Voice Settings Panel**
    ```bash
    feat(voice): add voice settings and speaker selection
    ```

16. **Voice Activity Detection**
    ```bash
    feat(voice): implement voice activity detection (VAD)
    ```

17. **Continuous Listening Mode**
    ```bash
    feat(voice): add continuous listening mode functionality
    ```

18. **Voice Mode Enhancements**
    ```bash
    feat(voice): enhance voice experience with advanced features
    ```

19. **Audio Visualization**
    ```bash
    feat(voice): add audio visualization effects
    ```

20. **Voice Error Handling**
    ```bash
    fix(voice): improve error handling and user feedback
    ```

#### **Configuration & DevOps (5 commits)**
21. **GitHub Actions CI/CD**
    ```bash
    ci: set up comprehensive GitHub Actions workflows
    ```

22. **Code Quality Tools**
    ```bash
    chore(quality): configure code quality and formatting tools
    ```

23. **Security Workflows**
    ```bash
    ci: implement security scanning and dependency checks
    ```

24. **Documentation**
    ```bash
    docs: create comprehensive project documentation
    ```

25. **Build Optimizations**
    ```bash
    perf: optimize build process and bundle size
    ```

### 📋 Teammate 2 Commits (25 commits)

#### **Chat System & AI (8 commits)**
1. **Basic Chat Interface**
   ```bash
   feat(chat): implement text-based chat interface
   ```

2. **Message Persistence**
   ```bash
   feat(chat): add message persistence to database
   ```

3. **Conversational AI Service**
   ```bash
   feat(ai): implement advanced conversational AI system
   ```

4. **Message Formatting**
   ```bash
   feat(chat): add markdown formatting and improved UX
   ```

5. **Chat History Management**
   ```bash
   feat(chat): implement conversation history and management
   ```

6. **Real-time Updates**
   ```bash
   feat(chat): add real-time message updates and sync
   ```

7. **Chat Context Management**
   ```bash
   feat(chat): implement conversation context and memory
   ```

8. **Chat Clearing Functionality**
   ```bash
   fix(chat): resolve message clearing and state management
   ```

#### **Loan Application System (10 commits)**
9. **Loan Service Foundation**
   ```bash
   feat(loan): implement loan application processing service
   ```

10. **Loan Decision Algorithm**
    ```bash
    feat(loan): add loan decision analysis algorithms
    ```

11. **Interest Rate Calculation**
    ```bash
    feat(loan): implement interest rate calculation system
    ```

12. **Loan Data Models**
    ```bash
    feat(loan): create comprehensive loan data models
    ```

13. **Loan UI Integration**
    ```bash
    feat(loan): integrate loan application display in voice mode
    ```

14. **Loan Applications Page**
    ```bash
    feat(loan): create loan applications management page
    ```

15. **Loan Filtering & Search**
    ```bash
    feat(loan): add filtering and search functionality
    ```

16. **Loan Status Management**
    ```bash
    feat(loan): implement loan status updates and tracking
    ```

17. **Approval/Rejection Logic**
    ```bash
    feat(loan): add detailed approval and rejection analysis
    ```

18. **Loan Terms Calculation**
    ```bash
    feat(loan): implement dynamic loan terms calculation
    ```

#### **Database & Backend (4 commits)**
19. **Database Operations**
    ```bash
    feat(db): implement comprehensive database operations
    ```

20. **Data Migration Scripts**
    ```bash
    feat(db): add database migration and seed scripts
    ```

21. **Database Optimization**
    ```bash
    perf(db): optimize database queries and performance
    ```

22. **Database Validation**
    ```bash
    feat(db): add data validation and error handling
    ```

#### **Testing & Bug Fixes (3 commits)**
23. **Testing Framework Setup**
    ```bash
    test: set up testing framework and initial tests
    ```

24. **Unit Tests for Core Features**
    ```bash
    test: add comprehensive unit tests for loan and chat systems
    ```

25. **Bug Fixes & Polish**
    ```bash
    fix: resolve UI bugs and improve user experience
    ```

### 🎯 Sequential Command Execution Guide

Follow these commands in exact order. Each teammate executes their assigned commands one by one.

#### **Setup Phase**
```bash
# Both teammates: Initial repository setup
git clone <repository-url>
cd LoanWise
git checkout -b develop
```

---

### � **Sequential Commit Commands**

#### **Command 1 - Teammate 1**
```bash
# Create project foundation
git checkout -b feature/project-foundation
# [Work on initial setup, package.json, vite config, etc.]
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src/main.tsx src/App.tsx
git commit -m "feat: initialize LoanWise loan application platform

- Set up Vite + React + TypeScript project structure
- Configure Tailwind CSS for styling
- Add basic routing with React Router
- Configure ESLint and development tools"
git push origin feature/project-foundation
# Create PR and merge to develop
```

#### **Command 2 - Teammate 2**
```bash
# Create database foundation
git checkout develop
git pull origin develop
git checkout -b feature/database-setup
# [Work on database schema, connections, etc.]
git add database-schema.sql setup-db.js src/schema.ts src/database.ts src/db.ts
git commit -m "feat(db): set up database schema and connection

- Create Drizzle ORM schema for loan applications and chat messages
- Configure Neon database connection
- Add database migration scripts
- Set up database operations layer"
git push origin feature/database-setup
# Create PR and merge to develop
```

#### **Command 3 - Teammate 1**
```bash
# Authentication system
git checkout develop
git pull origin develop
git checkout -b feature/auth-system
# [Work on Clerk authentication]
git add src/components/LoginPage.tsx src/App.tsx
git commit -m "feat(auth): implement Clerk authentication system

- Set up Clerk provider and authentication flows
- Create login page with social auth options
- Add protected routes and user context
- Implement user session management"
git push origin feature/auth-system
# Create PR and merge to develop
```

#### **Command 4 - Teammate 2**
```bash
# Basic chat interface
git checkout develop
git pull origin develop
git checkout -b feature/chat-interface
# [Work on ChatInterface component]
git add src/components/ChatInterface.tsx src/services/conversationalAI.ts
git commit -m "feat(chat): implement text-based chat interface

- Create message display with sender differentiation
- Add input field with send functionality
- Implement message persistence to database
- Add typing indicators and message timestamps"
git push origin feature/chat-interface
# Create PR and merge to develop
```

#### **Command 5 - Teammate 1**
```bash
# Header component
git checkout develop
git pull origin develop
git checkout -b feature/header-component
# [Work on Header component]
git add src/components/Header.tsx
git commit -m "feat(ui): create responsive header component

- Add LoanWise branding and logo
- Implement user profile dropdown
- Add navigation controls
- Ensure responsive design"
git push origin feature/header-component
# Create PR and merge to develop
```

#### **Command 6 - Teammate 2**
```bash
# Database operations
git checkout develop
git pull origin develop
git checkout -b feature/database-operations
# [Work on dbOperations.ts]
git add src/dbOperations.ts
git commit -m "feat(db): implement comprehensive database operations

- Add CRUD operations for loan applications
- Implement chat message persistence
- Add database connection management
- Include error handling and validation"
git push origin feature/database-operations
# Create PR and merge to develop
```

#### **Command 7 - Teammate 1**
```bash
# Sidebar component
git checkout develop
git pull origin develop
git checkout -b feature/sidebar-component
# [Work on Sidebar component]
git add src/components/Sidebar.tsx
git commit -m "feat(ui): implement navigation sidebar with conversation history

- Create collapsible sidebar with smooth animations
- Add conversation list and management
- Implement new chat/voice mode buttons
- Add responsive design for mobile"
git push origin feature/sidebar-component
# Create PR and merge to develop
```

#### **Command 8 - Teammate 2**
```bash
# Loan service foundation
git checkout develop
git pull origin develop
git checkout -b feature/loan-service
# [Work on loanApplicationService.ts]
git add src/services/loanApplicationService.ts
git commit -m "feat(loan): implement loan application processing service

- Create loan application data models
- Add loan decision analysis algorithms
- Implement interest rate calculation
- Add loan term determination logic"
git push origin feature/loan-service
# Create PR and merge to develop
```

#### **Command 9 - Teammate 1**
```bash
# Speech service
git checkout develop
git pull origin develop
git checkout -b feature/speech-service
# [Work on speech services]
git add src/services/speechService.ts src/services/voiceService.ts
git commit -m "feat(voice): implement speech recognition and synthesis services

- Add Web Speech API integration
- Implement text-to-speech functionality
- Create voice recognition system
- Add voice activity detection"
git push origin feature/speech-service
# Create PR and merge to develop
```

#### **Command 10 - Teammate 2**
```bash
# Conversational AI enhancement
git checkout develop
git pull origin develop
git checkout -b feature/conversational-ai
# [Work on conversationalAI.ts enhancement]
git add src/services/conversationalAI.ts
git commit -m "feat(ai): implement advanced conversational AI system

- Create context-aware conversation management
- Add conversation memory and state tracking
- Implement multi-turn conversation flows
- Add conversation clearing and reset functionality"
git push origin feature/conversational-ai
# Create PR and merge to develop
```

#### **Command 11 - Teammate 1**
```bash
# Voice mode UI
git checkout develop
git pull origin develop
git checkout -b feature/voice-mode-ui
# [Work on VoiceMode component]
git add src/components/VoiceMode.tsx
git commit -m "feat(voice): create voice mode interface with visual feedback

- Create voice interaction UI with animations
- Add microphone controls and status indicators
- Implement visual feedback for listening/speaking
- Add voice mode layout and styling"
git push origin feature/voice-mode-ui
# Create PR and merge to develop
```

#### **Command 12 - Teammate 2**
```bash
# Chat markdown formatting
git checkout develop
git pull origin develop
git checkout -b feature/chat-markdown
# [Work on ReactMarkdown integration]
git add src/components/ChatInterface.tsx package.json
git commit -m "feat(chat): add markdown formatting and improved UX

- Integrate ReactMarkdown for rich message display
- Add custom styling for code, lists, and emphasis
- Implement message clearing functionality
- Add conversation context management"
git push origin feature/chat-markdown
# Create PR and merge to develop
```

#### **Command 13 - Teammate 1**
```bash
# Environment configuration
git checkout develop
git pull origin develop
git checkout -b feature/environment-config
# [Work on environment setup]
git add .env.example vite.config.ts
git commit -m "chore(config): add environment configuration and secrets management

- Set up environment variables for different stages
- Add Clerk and API key configuration
- Configure database connection strings
- Add build and deployment configuration"
git push origin feature/environment-config
# Create PR and merge to develop
```

#### **Command 14 - Teammate 2**
```bash
# Loan decision algorithm
git checkout develop
git pull origin develop
git checkout -b feature/loan-algorithm
# [Work on loan decision logic]
git add src/services/loanApplicationService.ts
git commit -m "feat(loan): add loan decision analysis algorithms

- Implement credit score evaluation
- Add income-to-loan ratio calculations
- Create risk assessment algorithms
- Add approval/rejection decision logic"
git push origin feature/loan-algorithm
# Create PR and merge to develop
```

#### **Command 15 - Teammate 1**
```bash
# Voice settings
git checkout develop
git pull origin develop
git checkout -b feature/voice-settings
# [Work on VoiceSettings component]
git add src/components/VoiceSettings.tsx
git commit -m "feat(voice): add voice settings and speaker selection

- Create voice settings panel
- Implement speaker/voice selection
- Add voice speed and pitch controls
- Include voice testing functionality"
git push origin feature/voice-settings
# Create PR and merge to develop
```

#### **Command 16 - Teammate 2**
```bash
# Interest rate calculation
git checkout develop
git pull origin develop
git checkout -b feature/interest-calculation
# [Work on interest rate logic]
git add src/services/loanApplicationService.ts
git commit -m "feat(loan): implement interest rate calculation system

- Add dynamic interest rate calculation
- Implement risk-based rate adjustments
- Create rate comparison logic
- Add market rate integration"
git push origin feature/interest-calculation
# Create PR and merge to develop
```

#### **Command 17 - Teammate 1**
```bash
# Toast notifications
git checkout develop
git pull origin develop
git checkout -b feature/toast-notifications
# [Work on toast system]
git add src/components/ToastContainer.tsx src/services/toastService.ts
git commit -m "feat(ui): add toast notification system

- Implement toast service for user feedback
- Add success, error, and info message types
- Create toast container with animations
- Integrate notifications across all features"
git push origin feature/toast-notifications
# Create PR and merge to develop
```

#### **Command 18 - Teammate 2**
```bash
# Loan UI integration
git checkout develop
git pull origin develop
git checkout -b feature/loan-ui-integration
# [Work on loan display in VoiceMode]
git add src/components/VoiceMode.tsx
git commit -m "feat(loan): integrate loan application display in voice mode

- Add real-time loan data visualization
- Implement editable loan application fields
- Create loan terms display with approval factors
- Add loan application submission flow"
git push origin feature/loan-ui-integration
# Create PR and merge to develop
```

#### **Command 19 - Teammate 1**
```bash
# Voice activity detection
git checkout develop
git pull origin develop
git checkout -b feature/voice-vad
# [Work on VAD implementation]
git add src/services/enhancedVoiceService.ts public/silero_vad.onnx
git commit -m "feat(voice): implement voice activity detection (VAD)

- Add Silero VAD model integration
- Implement voice activity detection
- Create VAD worklet for processing
- Add real-time voice activity feedback"
git push origin feature/voice-vad
# Create PR and merge to develop
```

#### **Command 20 - Teammate 2**
```bash
# Loan applications page
git checkout develop
git pull origin develop
git checkout -b feature/loan-applications-page
# [Work on LoanApplicationsPage]
git add src/components/LoanApplicationsPage.tsx
git commit -m "feat(loan): create loan applications management page

- Build comprehensive loan applications listing
- Add filtering and search functionality
- Implement detailed application view
- Add approval/rejection analysis display"
git push origin feature/loan-applications-page
# Create PR and merge to develop
```

#### **Command 21 - Teammate 1**
```bash
# GitHub Actions CI/CD
git checkout develop
git pull origin develop
git checkout -b feature/github-actions
# [Work on GitHub Actions workflows]
git add .github/workflows/ci-cd.yml .github/workflows/code-quality.yml .github/workflows/security.yml
git commit -m "ci: set up comprehensive GitHub Actions workflows

- Add CI/CD pipeline with testing and deployment
- Implement code quality checks and security scanning
- Create auto-labeling for PRs and issues
- Add deployment workflows for staging and production"
git push origin feature/github-actions
# Create PR and merge to develop
```

#### **Command 22 - Teammate 2**
```bash
# Loan filtering and search
git checkout develop
git pull origin develop
git checkout -b feature/loan-filtering
# [Work on filtering functionality]
git add src/components/LoanApplicationsPage.tsx
git commit -m "feat(loan): add filtering and search functionality

- Implement advanced search filters
- Add status-based filtering
- Create date range filtering
- Add sort functionality"
git push origin feature/loan-filtering
# Create PR and merge to develop
```

#### **Command 23 - Teammate 1**
```bash
# Responsive design fixes
git checkout develop
git pull origin develop
git checkout -b fix/responsive-design
# [Work on responsive fixes]
git add src/App.tsx src/components/Sidebar.tsx src/components/VoiceMode.tsx
git commit -m "fix(ui): resolve layout issues and improve responsive design

- Fix sidebar positioning from fixed to flexbox layout
- Resolve zoom level compatibility issues
- Improve component overflow handling
- Enhance mobile responsiveness"
git push origin fix/responsive-design
# Create PR and merge to develop
```

#### **Command 24 - Teammate 2**
```bash
# Testing framework setup
git checkout develop
git pull origin develop
git checkout -b feature/testing-setup
# [Work on testing configuration]
git add jest.config.js src/__tests__/ src/components/__tests__/
git commit -m "test: set up testing framework and initial tests

- Configure Jest and React Testing Library
- Add unit tests for core components
- Create integration tests for API calls
- Add E2E tests for critical user flows"
git push origin feature/testing-setup
# Create PR and merge to develop
```

#### **Command 25 - Teammate 1**
```bash
# Voice mode enhancements
git checkout develop
git pull origin develop
git checkout -b feature/voice-enhancements
# [Work on voice mode improvements]
git add src/components/VoiceMode.tsx
git commit -m "feat(voice): enhance voice experience with advanced features

- Add continuous listening mode
- Implement voice command recognition
- Create audio visualization effects
- Add voice mode error handling"
git push origin feature/voice-enhancements
# Create PR and merge to develop
```

#### **Command 26 - Teammate 2**
```bash
# Loan status management
git checkout develop
git pull origin develop
git checkout -b feature/loan-status
# [Work on loan status updates]
git add src/services/loanApplicationService.ts src/dbOperations.ts
git commit -m "feat(loan): implement loan status updates and tracking

- Add loan status change functionality
- Implement status history tracking
- Create status notification system
- Add administrative status controls"
git push origin feature/loan-status
# Create PR and merge to develop
```

#### **Command 27 - Teammate 1**
```bash
# Code quality tools
git checkout develop
git pull origin develop
git checkout -b feature/code-quality
# [Work on quality tools]
git add .prettierrc .husky/ commitlint.config.js package.json
git commit -m "chore(quality): configure code quality and formatting tools

- Set up Prettier for code formatting
- Configure Husky for git hooks
- Add lint-staged for pre-commit checks
- Set up commitlint for commit message validation"
git push origin feature/code-quality
# Create PR and merge to develop
```

#### **Command 28 - Teammate 2**
```bash
# Approval/rejection analysis
git checkout develop
git pull origin develop
git checkout -b feature/approval-analysis
# [Work on detailed analysis]
git add src/services/loanApplicationService.ts
git commit -m "feat(loan): add detailed approval and rejection analysis

- Implement comprehensive risk factor analysis
- Add approval reason generation
- Create rejection factor identification
- Add confidence scoring system"
git push origin feature/approval-analysis
# Create PR and merge to develop
```

#### **Command 29 - Teammate 1**
```bash
# Documentation
git checkout develop
git pull origin develop
git checkout -b feature/documentation
# [Work on documentation]
git add README.md COMMIT_GUIDE.md WORKFLOWS_GUIDE.md
git commit -m "docs: create comprehensive project documentation

- Add detailed README with setup instructions
- Create commit guide for development workflow
- Add GitHub Actions workflow documentation
- Include API documentation and examples"
git push origin feature/documentation
# Create PR and merge to develop
```

#### **Command 30 - Teammate 2**
```bash
# Data migration scripts
git checkout develop
git pull origin develop
git checkout -b feature/data-migration
# [Work on migration scripts]
git add check-tables.js manual-setup.js
git commit -m "feat(db): add database migration and seed scripts

- Create table verification scripts
- Add manual database setup options
- Implement data seeding functionality
- Add database health check tools"
git push origin feature/data-migration
# Create PR and merge to develop
```

#### **Command 31 - Teammate 1**
```bash
# Build optimizations
git checkout develop
git pull origin develop
git checkout -b feature/build-optimization
# [Work on build improvements]
git add vite.config.ts package.json
git commit -m "perf: optimize build process and bundle size

- Configure code splitting and lazy loading
- Optimize asset compression and caching
- Implement tree shaking improvements
- Add build size analysis and monitoring"
git push origin feature/build-optimization
# Create PR and merge to develop
```

#### **Command 32 - Teammate 2**
```bash
# Loan terms calculation
git checkout develop
git pull origin develop
git checkout -b feature/loan-terms
# [Work on loan terms logic]
git add src/services/loanApplicationService.ts
git commit -m "feat(loan): implement dynamic loan terms calculation

- Add monthly payment calculations
- Implement loan term optimization
- Create payment schedule generation
- Add term comparison functionality"
git push origin feature/loan-terms
# Create PR and merge to develop
```

#### **Command 33 - Teammate 1**
```bash
# Security workflows
git checkout develop
git pull origin develop
git checkout -b feature/security-workflows
# [Work on security GitHub Actions]
git add .github/workflows/deploy-vercel.yml .github/workflows/auto-label.yml
git commit -m "ci: implement security scanning and dependency checks

- Add automated security vulnerability scanning
- Implement dependency update monitoring
- Create security alert workflows
- Add secret scanning capabilities"
git push origin feature/security-workflows
# Create PR and merge to develop
```

#### **Command 34 - Teammate 2**
```bash
# Database optimization
git checkout develop
git pull origin develop
git checkout -b feature/db-optimization
# [Work on database performance]
git add src/dbOperations.ts src/db.ts
git commit -m "perf(db): optimize database queries and performance

- Implement query optimization techniques
- Add database indexing strategies
- Create connection pooling improvements
- Add query performance monitoring"
git push origin feature/db-optimization
# Create PR and merge to develop
```

#### **Command 35 - Teammate 1**
```bash
# Mobile optimizations
git checkout develop
git pull origin develop
git checkout -b feature/mobile-optimization
# [Work on mobile improvements]
git add src/components/VoiceMode.tsx src/components/ChatInterface.tsx
git commit -m "feat(ui): optimize interface for mobile devices

- Improve touch interactions and gestures
- Optimize viewport handling for mobile
- Add mobile-specific voice controls
- Enhance mobile navigation experience"
git push origin feature/mobile-optimization
# Create PR and merge to develop
```

#### **Command 36 - Teammate 2**
```bash
# Data validation
git checkout develop
git pull origin develop
git checkout -b feature/data-validation
# [Work on validation logic]
git add src/services/loanApplicationService.ts src/dbOperations.ts
git commit -m "feat(db): add data validation and error handling

- Implement comprehensive input validation
- Add data sanitization procedures
- Create error handling middleware
- Add validation feedback system"
git push origin feature/data-validation
# Create PR and merge to develop
```

#### **Command 37 - Teammate 1**
```bash
# Audio visualization
git checkout develop
git pull origin develop
git checkout -b feature/audio-visualization
# [Work on audio effects]
git add src/components/VoiceMode.tsx
git commit -m "feat(voice): add audio visualization effects

- Create real-time audio waveform display
- Add voice activity visual indicators
- Implement microphone level meters
- Add speaking/listening visual feedback"
git push origin feature/audio-visualization
# Create PR and merge to develop
```

#### **Command 38 - Teammate 2**
```bash
# Comprehensive testing
git checkout develop
git pull origin develop
git checkout -b feature/comprehensive-testing
# [Work on extensive testing]
git add src/__tests__/ src/components/__tests__/
git commit -m "test: add comprehensive unit tests for loan and chat systems

- Add unit tests for loan calculation logic
- Create integration tests for chat functionality
- Implement API endpoint testing
- Add component rendering tests"
git push origin feature/comprehensive-testing
# Create PR and merge to develop
```

#### **Command 39 - Teammate 1**
```bash
# Voice error handling
git checkout develop
git pull origin develop
git checkout -b fix/voice-error-handling
# [Work on voice error fixes]
git add src/services/speechService.ts src/components/VoiceMode.tsx
git commit -m "fix(voice): improve error handling and user feedback

- Add comprehensive speech recognition error handling
- Implement graceful fallback mechanisms
- Create user-friendly error messages
- Add retry logic for failed voice operations"
git push origin fix/voice-error-handling
# Create PR and merge to develop
```

#### **Command 40 - Teammate 2**
```bash
# Final bug fixes and polish
git checkout develop
git pull origin develop
git checkout -b fix/final-polish
# [Work on final improvements]
git add src/components/ src/services/
git commit -m "fix: resolve UI bugs and improve user experience

- Fix remaining layout and styling issues
- Resolve edge cases in loan processing
- Improve error messages and user feedback
- Add final performance optimizations"
git push origin fix/final-polish
# Create PR and merge to develop
```

---

### 🎯 **Final Commands (Both Teammates)**
```bash
# Merge develop to main
git checkout main
git pull origin main
git merge develop
git push origin main

# Tag the release
git tag -a v1.0.0 -m "Release version 1.0.0 - LoanWise MVP"
git push origin v1.0.0
```

### 📊 Tracking Commit Balance

#### **Git Commands to Check Commit Count**
```bash
# Check total commits by author
git shortlog -sn

# Check commits in date range
git log --since="2025-09-01" --pretty=format:"%an" | sort | uniq -c

# Check commits by teammate
git log --author="Teammate1" --oneline | wc -l
git log --author="Teammate2" --oneline | wc -l
```

#### **Balance Monitoring**
- **Weekly Check**: Review commit distribution every week
- **Adjust Strategy**: If imbalance occurs, adjust upcoming commits
- **Quality Over Quantity**: Ensure meaningful commits, not just count

### 🎯 Tips for Equal Distribution

1. **Plan Ahead**: Decide who works on which features before starting
2. **Use Feature Branches**: Each teammate works on separate features
3. **Small, Atomic Commits**: Break large features into smaller commits
4. **Pair Programming**: Alternate who commits during pair sessions
5. **Documentation Commits**: Use docs/style commits to balance numbers
6. **Refactoring Opportunities**: Share refactoring tasks equally

### ⚖️ Balancing Strategies If Uneven

#### **If Teammate 1 is Behind:**
- Take on additional UI polish commits
- Handle documentation updates
- Implement additional error handling
- Add performance optimizations

#### **If Teammate 2 is Behind:**
- Add more comprehensive testing
- Implement additional API endpoints
- Handle edge cases and validations
- Add data processing features

### 📈 Success Metrics

- **Target**: 20-25 commits each (total ~45-50)
- **Tolerance**: ±3 commits difference acceptable
- **Quality Check**: All commits must be meaningful and well-documented
- **Review Process**: Both teammates must review critical features

## �🚀 Release Strategy

### Version Tagging
- **Major**: Breaking changes (`v2.0.0`)
- **Minor**: New features (`v1.1.0`)
- **Patch**: Bug fixes (`v1.0.1`)

### Release Commits
```bash
chore(release): bump version to v1.1.0

- Add voice mode functionality
- Implement loan application system
- Improve UI responsiveness
- Fix chat message clearing issues
```

## 📝 Tips for Good Commits

1. **Keep commits atomic**: One logical change per commit
2. **Write descriptive messages**: Explain what and why, not how
3. **Use present tense**: "Add feature" not "Added feature"
4. **Reference issues**: Include issue numbers when applicable
5. **Test before committing**: Ensure code works and tests pass
6. **Review your changes**: Use `git diff` before committing

This guide ensures consistent, trackable, and professional git history for the LoanWise project!
