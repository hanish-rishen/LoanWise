# 🚀 GitHub Actions Workflows Documentation

This document explains all the GitHub Actions workflows set up for the LoanWise project.

## 📋 Overview

The LoanWise project uses multiple GitHub Actions workflows to ensure code quality, security, and seamless deployment. Here's what each workflow does:

## 🔄 1. CI/CD Pipeline (`ci-cd.yml`)

### Purpose
Main pipeline that handles testing, building, and deployment across different environments.

### Triggers
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### Jobs

#### `test`
- **Matrix Strategy**: Tests on Node.js 18.x and 20.x
- **Steps**:
  1. Checkout code
  2. Setup Node.js with npm cache
  3. Install dependencies (`npm ci`)
  4. Run ESLint for code quality
  5. Run TypeScript type checking
  6. Build application
  7. Upload build artifacts

#### `security-scan`
- **Dependencies**: Runs after `test` job
- **Steps**:
  1. Checkout code
  2. Setup Node.js 20.x
  3. Install dependencies
  4. Run security audit (moderate level)
  5. Check for high/critical vulnerabilities

#### `deploy-staging`
- **Trigger**: Only on push to `develop` branch
- **Dependencies**: Runs after `test` and `security-scan`
- **Environment**: `staging`
- **Steps**: Build and deploy to staging environment

#### `deploy-production`
- **Trigger**: Only on push to `main` branch
- **Dependencies**: Runs after `test` and `security-scan`
- **Environment**: `production`
- **Steps**: Build and deploy to production environment

### Required Secrets
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_GROQ_API_KEY`
- `VITE_DATABASE_URL`

## 🔍 2. Code Quality (`code-quality.yml`)

### Purpose
Comprehensive code quality checks including linting, type checking, and build analysis.

### Triggers
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### Jobs

#### `lint`
- ESLint code quality checks
- Code formatting validation

#### `type-check`
- TypeScript compilation without emit
- Type safety validation

#### `dependency-check`
- Check for outdated dependencies
- Identify unused dependencies
- Exclude dev dependencies from unused check

#### `build-check`
- Verify build succeeds
- Analyze build size and largest files
- Report build metrics

## 🛡️ 3. Security Scan (`security.yml`)

### Purpose
Comprehensive security analysis including dependency scanning, code analysis, and secrets detection.

### Triggers
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Scheduled daily at 2 AM UTC

### Jobs

#### `security-audit`
- npm audit for moderate vulnerabilities
- Critical vulnerability check
- Dependency security assessment

#### `codeql-analysis`
- **Permissions**: Enhanced security permissions
- **Languages**: JavaScript/TypeScript
- **Features**:
  - Static code analysis
  - Security vulnerability detection
  - Pattern matching for common issues

#### `dependency-review`
- **Trigger**: Only on pull requests
- **Purpose**: Review new dependencies for security issues
- **Threshold**: Fails on moderate+ severity issues

#### `secrets-scan`
- **Tool**: TruffleHog OSS
- **Purpose**: Scan for accidentally committed secrets
- **Scope**: Verified secrets only

### Required Permissions
```yaml
permissions:
  actions: read
  contents: read
  security-events: write
```

## 🚀 4. Deployment (`deploy-vercel.yml`)

### Purpose
Automated deployment to Vercel for both production and preview environments.

### Triggers
- Push to `main` branch (production)
- Pull requests to `main` branch (preview)

### Jobs

#### `deploy`
- **Production Deploy**: Triggered on main branch push
- **Preview Deploy**: Triggered on pull request
- **Features**:
  - Environment-specific builds
  - Automatic PR comments with preview URLs
  - Vercel integration

### Required Secrets
- `VERCEL_TOKEN`: Vercel deployment token
- `VERCEL_ORG_ID`: Organization ID
- `VERCEL_PROJECT_ID`: Project ID
- All environment variables for build

### Environment Variables
```bash
VITE_CLERK_PUBLISHABLE_KEY=${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
VITE_GROQ_API_KEY=${{ secrets.VITE_GROQ_API_KEY }}
VITE_DATABASE_URL=${{ secrets.VITE_DATABASE_URL }}
```

## 🏷️ 5. Auto-labeling (`auto-label.yml`)

### Purpose
Automatically label pull requests based on files changed, branch names, and PR size.

### Triggers
- Pull request opened, edited, or synchronized

### Features

#### File-based Labeling
- Uses `.github/labeler.yml` configuration
- Labels based on which files are modified
- Categories: frontend, backend, database, API, UI/UX, etc.

#### Size-based Labeling
- **XS**: 0-19 lines changed
- **S**: 20-49 lines changed
- **M**: 50-199 lines changed
- **L**: 200-799 lines changed
- **XL**: 800-1999 lines changed
- **XXL**: 2000+ lines changed

#### Branch Name Labeling
- `feature/*` → `enhancement`
- `fix/*` or `bugfix/*` → `bug`
- `docs/*` → `documentation`
- `refactor/*` → `refactor`
- `test/*` → `tests`
- `chore/*` → `maintenance`

## 📂 6. File-based Labeling Configuration (`labeler.yml`)

### Categories
- **frontend**: UI components, public assets, Vite config
- **backend**: Server scripts, database setup
- **database**: Schema, database files, DB operations
- **api**: Services, API operations
- **ui/ux**: Components, styling, CSS config
- **configuration**: Config files, environment files
- **documentation**: Markdown files, docs
- **tests**: Test files and specs
- **dependencies**: Package management files
- **workflows**: GitHub Actions files

## 🎫 7. Issue Templates

### Bug Report Template
- **Purpose**: Standardized bug reporting
- **Sections**:
  - Bug description
  - Reproduction steps
  - Expected vs actual behavior
  - Environment details
  - Screenshots
  - Possible solutions

### Feature Request Template
- **Purpose**: Structured feature proposals
- **Sections**:
  - Feature description
  - Problem statement
  - Proposed solution
  - Alternatives considered
  - Acceptance criteria
  - Priority level
  - Technical notes

## 📝 8. Pull Request Template

### Comprehensive PR Structure
- **Summary**: Brief description of changes
- **Related Issues**: Link to issues
- **Type of Change**: Categorized checkboxes
- **Testing**: Test coverage and manual testing
- **Environment**: Browser/platform testing
- **Breaking Changes**: Migration notes
- **Checklist**: Quality assurance items
- **Reviewer Notes**: Specific review focus areas

## 🔧 Setup Instructions

### 1. Repository Secrets Configuration
Navigate to `Settings > Secrets and variables > Actions` and add:

```bash
# Deployment
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Environment Variables
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_GROQ_API_KEY=your_groq_key
VITE_DATABASE_URL=your_database_url
```

### 2. Branch Protection Rules
Set up branch protection for `main`:
- Require pull request reviews
- Require status checks to pass
- Include administrators
- Restrict pushes that create files

### 3. Repository Settings
- Enable GitHub Actions
- Allow actions from this repository
- Enable dependency graph
- Enable Dependabot alerts
- Enable secret scanning

## 📊 Workflow Status and Monitoring

### Status Checks
All workflows provide status checks that can be required for PR merging:
- `test (18.x, 20.x)`: CI testing matrix
- `security-audit`: Security scanning
- `lint`: Code quality checks
- `type-check`: TypeScript validation
- `build-check`: Build verification

### Monitoring
- Check workflow runs in the `Actions` tab
- Review security alerts in `Security` tab
- Monitor deployment status in Vercel dashboard
- Track dependency updates via Dependabot

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
1. Check Node.js version compatibility
2. Verify all environment variables are set
3. Ensure dependencies are up to date
4. Check for TypeScript errors

#### Security Scan Failures
1. Review npm audit results
2. Update vulnerable dependencies
3. Check for secrets in commit history
4. Review CodeQL findings

#### Deployment Issues
1. Verify Vercel secrets are correct
2. Check build logs for errors
3. Ensure environment variables are set for deployment
4. Verify Vercel project configuration

### Getting Help
- Check workflow logs in GitHub Actions
- Review the specific job that failed
- Check repository security and dependency alerts
- Consult the GitHub Actions documentation

This workflow setup ensures robust CI/CD, security, and quality controls for the LoanWise project!
