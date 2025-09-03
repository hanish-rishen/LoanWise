#!/bin/bash

# GitHub Actions Setup Script for LoanWise
# This script helps verify and set up the GitHub Actions workflows

echo "🚀 Setting up GitHub Actions for LoanWise..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run this from the project root."
    exit 1
fi

# Create .github directory structure if it doesn't exist
echo "📁 Creating GitHub Actions directory structure..."
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the project root."
    exit 1
fi

# Add necessary scripts to package.json if they don't exist
echo "📦 Checking package.json scripts..."

# Check if lint script exists
if ! grep -q '"lint"' package.json; then
    echo "⚠️  Warning: 'lint' script not found in package.json"
    echo "   Please add: \"lint\": \"eslint .\""
fi

# Check if build script exists
if ! grep -q '"build"' package.json; then
    echo "⚠️  Warning: 'build' script not found in package.json"
    echo "   Please add: \"build\": \"vite build\""
fi

# Check for required dependencies
echo "🔍 Checking for required dependencies..."

REQUIRED_DEPS=("eslint" "typescript" "vite")
for dep in "${REQUIRED_DEPS[@]}"; do
    if ! grep -q "\"$dep\"" package.json; then
        echo "⚠️  Warning: $dep not found in dependencies"
    fi
done

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    echo "📝 Creating .env.example file..."
    cat > .env.example << 'EOF'
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here

# AI Service
VITE_GROQ_API_KEY=your_groq_api_key_here

# Database
VITE_DATABASE_URL=your_database_url_here

# Environment
VITE_ENVIRONMENT=development
EOF
fi

# List the GitHub Actions files that should be present
echo "✅ GitHub Actions files created:"
echo "   📄 .github/workflows/ci-cd.yml"
echo "   📄 .github/workflows/code-quality.yml"
echo "   📄 .github/workflows/security.yml"
echo "   📄 .github/workflows/deploy-vercel.yml"
echo "   📄 .github/workflows/auto-label.yml"
echo "   📄 .github/labeler.yml"
echo "   📄 .github/ISSUE_TEMPLATE/bug_report.md"
echo "   📄 .github/ISSUE_TEMPLATE/feature_request.md"
echo "   📄 .github/pull_request_template.md"

echo ""
echo "🔐 Required Repository Secrets:"
echo "   VERCEL_TOKEN"
echo "   VERCEL_ORG_ID"
echo "   VERCEL_PROJECT_ID"
echo "   VITE_CLERK_PUBLISHABLE_KEY"
echo "   VITE_GROQ_API_KEY"
echo "   VITE_DATABASE_URL"

echo ""
echo "📋 Next Steps:"
echo "   1. Push these files to your GitHub repository"
echo "   2. Configure repository secrets in Settings > Secrets and variables > Actions"
echo "   3. Set up branch protection rules for 'main' branch"
echo "   4. Enable GitHub Actions if not already enabled"
echo "   5. Configure Vercel project (if using Vercel deployment)"

echo ""
echo "🎉 GitHub Actions setup complete!"
echo "📖 Read WORKFLOWS_GUIDE.md for detailed information"
echo "📝 Read COMMIT_GUIDE.md for commit best practices"
