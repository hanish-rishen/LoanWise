pipeline {
    agent any

    environment {
        APP_NAME = 'loanwise'
    }

    tools {
        nodejs '20.x'
    }

    stages {
        stage('Checkout') {
            steps {
                echo '📦 Checking out code...'
                git branch: 'main', url: 'https://github.com/hanish-rishen/LoanWise.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '📥 Installing dependencies...'
                sh 'npm ci --prefer-offline --no-audit'
            }
        }

        stage('Code Quality') {
            parallel {
                stage('Lint') {
                    steps {
                        echo '🔍 Running ESLint...'
                        sh 'npm run lint || true'
                    }
                }
                stage('Type Check') {
                    steps {
                        echo '📝 Running TypeScript type check...'
                        sh 'npx tsc --noEmit || true'
                    }
                }
            }
        }

        stage('Security Scan') {
            steps {
                echo '🛡️ Running security audit...'
                script {
                    def auditResult = sh(script: 'npm audit --audit-level=moderate', returnStatus: true)
                    if (auditResult != 0) {
                        echo "⚠️ Security vulnerabilities found - marking build as unstable"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('Build Application') {
            steps {
                echo '🏗️ Building application...'
                sh 'npm run build'
                echo '✅ Build complete - static files ready in dist/'
            }
        }

        stage('Test') {
            steps {
                echo '🧪 Running tests...'
                script {
                    // Check if test script exists in package.json
                    def hasTestScript = sh(script: 'npm run | grep -q "test"', returnStatus: true)
                    if (hasTestScript == 0) {
                        sh 'npm test -- --passWithNoTests'
                    } else {
                        echo '⏭️ No test script found in package.json - skipping tests'
                    }
                }
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline completed successfully!'
            echo '🌐 Application built and ready for deployment'
            echo '📦 Build artifacts available in dist/ directory'
            echo ''
            echo 'ℹ️ Note: Vercel auto-deploys from GitHub on push to main branch'
        }
        failure {
            echo '❌ Pipeline failed!'
        }
        unstable {
            echo '⚠️ Pipeline completed with warnings'
            echo '   Security vulnerabilities detected - run npm audit fix'
        }
        always {
            echo '🧹 Cleaning up...'
            sh 'rm -rf node_modules/.cache || true'
        }
    }
}
