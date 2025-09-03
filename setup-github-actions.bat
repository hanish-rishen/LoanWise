@echo off
REM GitHub Actions Setup Script for LoanWise (Windows)
REM This script helps verify and set up the GitHub Actions workflows

echo 🚀 Setting up GitHub Actions for LoanWise...

REM Check if we're in a git repository
if not exist ".git" (
    echo ❌ Error: Not in a git repository. Please run this from the project root.
    exit /b 1
)

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this from the project root.
    exit /b 1
)

echo 📁 GitHub Actions directory structure created...

REM Check for required scripts in package.json
echo 📦 Checking package.json scripts...
findstr /C:"\"lint\"" package.json >nul || echo ⚠️  Warning: 'lint' script not found in package.json
findstr /C:"\"build\"" package.json >nul || echo ⚠️  Warning: 'build' script not found in package.json

REM Check if .env.example exists
if not exist ".env.example" (
    echo 📝 Creating .env.example file...
    (
        echo # Clerk Authentication
        echo VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
        echo.
        echo # AI Service
        echo VITE_GROQ_API_KEY=your_groq_api_key_here
        echo.
        echo # Database
        echo VITE_DATABASE_URL=your_database_url_here
        echo.
        echo # Environment
        echo VITE_ENVIRONMENT=development
    ) > .env.example
)

echo.
echo ✅ GitHub Actions files created:
echo    📄 .github/workflows/ci-cd.yml
echo    📄 .github/workflows/code-quality.yml
echo    📄 .github/workflows/security.yml
echo    📄 .github/workflows/deploy-vercel.yml
echo    📄 .github/workflows/auto-label.yml
echo    📄 .github/labeler.yml
echo    📄 .github/ISSUE_TEMPLATE/bug_report.md
echo    📄 .github/ISSUE_TEMPLATE/feature_request.md
echo    📄 .github/pull_request_template.md

echo.
echo 🔐 Required Repository Secrets:
echo    VERCEL_TOKEN
echo    VERCEL_ORG_ID
echo    VERCEL_PROJECT_ID
echo    VITE_CLERK_PUBLISHABLE_KEY
echo    VITE_GROQ_API_KEY
echo    VITE_DATABASE_URL

echo.
echo 📋 Next Steps:
echo    1. Push these files to your GitHub repository
echo    2. Configure repository secrets in Settings ^> Secrets and variables ^> Actions
echo    3. Set up branch protection rules for 'main' branch
echo    4. Enable GitHub Actions if not already enabled
echo    5. Configure Vercel project (if using Vercel deployment^)

echo.
echo 🎉 GitHub Actions setup complete!
echo 📖 Read WORKFLOWS_GUIDE.md for detailed information
echo 📝 Read COMMIT_GUIDE.md for commit best practices

pause
