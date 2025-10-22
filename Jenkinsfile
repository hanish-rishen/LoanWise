pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = credentials('docker-registry-url')
        DOCKER_CREDENTIALS = credentials('docker-credentials')
        APP_NAME = 'loanwise'
        IMAGE_TAG = "${BUILD_NUMBER}"

        VITE_CLERK_PUBLISHABLE_KEY = credentials('vite-clerk-key')
        VITE_GROQ_API_KEY = credentials('vite-groq-key')
        VITE_DATABASE_URL = credentials('vite-database-url')
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
                    try {
                        sh 'npm audit --audit-level=moderate'
                    } catch (Exception e) {
                        echo "⚠️ Security vulnerabilities found"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('Build Application') {
            steps {
                echo '🏗️ Building application...'
                sh 'npm run build'
            }
        }

        stage('Test') {
            steps {
                echo '🧪 Running tests...'
                sh 'npm test -- --passWithNoTests || true'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo '🐳 Building Docker image...'
                sh """
                    docker build \
                        --build-arg VITE_CLERK_PUBLISHABLE_KEY='${VITE_CLERK_PUBLISHABLE_KEY}' \
                        --build-arg VITE_GROQ_API_KEY='${VITE_GROQ_API_KEY}' \
                        --build-arg VITE_DATABASE_URL='${VITE_DATABASE_URL}' \
                        --build-arg VITE_APP_URL='http://localhost:8080' \
                        --build-arg VITE_BUILD_VERSION='${IMAGE_TAG}' \
                        -t ${APP_NAME}:${IMAGE_TAG} \
                        -t ${APP_NAME}:latest .
                """
            }
        }

        stage('Test Docker Image') {
            steps {
                echo '🧪 Testing Docker image...'
                sh '''
                    CONTAINER_ID=$(docker run -d -p 8081:8080 ${APP_NAME}:latest)
                    sleep 15

                    if curl -f http://localhost:8081/health; then
                        echo "✓ Health check passed"
                    else
                        echo "✗ Health check failed"
                        docker logs $CONTAINER_ID
                        docker stop $CONTAINER_ID
                        docker rm $CONTAINER_ID
                        exit 1
                    fi

                    docker stop $CONTAINER_ID
                    docker rm $CONTAINER_ID
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Build successful!'
        }
        failure {
            echo '❌ Build failed!'
        }
        always {
            echo '🧹 Cleaning up...'
            sh 'docker system prune -f || true'
        }
    }
}
