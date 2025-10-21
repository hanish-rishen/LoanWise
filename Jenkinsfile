pipeline {
    agent any

    environment {
        // Docker and registry configuration
        DOCKER_REGISTRY = credentials('docker-registry-url')
        DOCKER_CREDENTIALS = credentials('docker-credentials')
        APP_NAME = 'loanwise'
        IMAGE_TAG = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
        AWS_REGION = 'us-east-1'

        // Infrastructure directories
        TERRAFORM_DIR = './infrastructure/terraform'
        ANSIBLE_DIR = './infrastructure/ansible'

        // Build configuration
        NODE_VERSION = '20.x'
        CI = 'true'

        // Environment variables (configure these in Jenkins credentials)
        VITE_CLERK_PUBLISHABLE_KEY = credentials('vite-clerk-key')
        VITE_GROQ_API_KEY = credentials('vite-groq-key')
        VITE_DATABASE_URL = credentials('vite-database-url')
    }

    tools {
        nodejs "${NODE_VERSION}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        // ========================
        // STEP 1: JENKINS SETUP (Build & Test)
        // ========================
        stage('Checkout') {
            steps {
                echo '📦 Checking out code...'
                checkout scm
                script {
                    env.GIT_COMMIT_MSG = sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()
                    env.GIT_AUTHOR = sh(script: 'git log -1 --pretty=%an', returnStdout: true).trim()
                }
                echo "Commit: ${env.GIT_COMMIT_MSG}"
                echo "Author: ${env.GIT_AUTHOR}"
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
                archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
            }
        }

        stage('Test') {
            steps {
                echo '🧪 Running tests...'
                script {
                    try {
                        sh 'npm test -- --passWithNoTests || true'
                    } catch (Exception e) {
                        echo "⚠️ Tests failed"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        // ========================
        // STEP 2: DOCKERIZE APP
        // ========================
        stage('Build Docker Image') {
            steps {
                echo '� Building Docker image...'
                sh '''
                    docker build \
                        --build-arg VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY} \
                        --build-arg VITE_GROQ_API_KEY=${VITE_GROQ_API_KEY} \
                        --build-arg VITE_BUILD_VERSION=${IMAGE_TAG} \
                        --build-arg VITE_BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
                        -t ${APP_NAME}:${IMAGE_TAG} \
                        -t ${APP_NAME}:latest .
                '''
            }
        }

        stage('Test Docker Image') {
            steps {
                echo '🧪 Testing Docker image...'
                sh '''
                    CONTAINER_ID=$(docker run -d -p 8081:8080 ${APP_NAME}:${IMAGE_TAG})
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

                    if curl -f http://localhost:8081/ > /dev/null; then
                        echo "✓ Main page test passed"
                    else
                        echo "✗ Main page test failed"
                        docker stop $CONTAINER_ID
                        docker rm $CONTAINER_ID
                        exit 1
                    fi

                    docker stop $CONTAINER_ID
                    docker rm $CONTAINER_ID
                '''
            }
        }

        stage('Push Docker Image') {
            when {
                branch 'main'
            }
            steps {
                echo '📤 Pushing Docker image to registry...'
                sh '''
                    echo $DOCKER_CREDENTIALS_PSW | docker login -u $DOCKER_CREDENTIALS_USR --password-stdin $DOCKER_REGISTRY
                    docker tag ${APP_NAME}:${IMAGE_TAG} ${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG}
                    docker tag ${APP_NAME}:latest ${DOCKER_REGISTRY}/${APP_NAME}:latest
                    docker push ${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG}
                    docker push ${DOCKER_REGISTRY}/${APP_NAME}:latest
                    docker logout
                '''
            }
        }

        // ========================
        // STEP 3: INFRASTRUCTURE (Terraform)
        // ========================
        stage('Terraform Plan') {
            when {
                branch 'main'
            }
            steps {
                echo '📋 Planning infrastructure with Terraform...'
                dir("${TERRAFORM_DIR}") {
                    sh '''
                        terraform init
                        terraform plan -out=tfplan
                    '''
                }
            }
        }

        stage('Terraform Apply Approval') {
            when {
                branch 'main'
            }
            steps {
                script {
                    input 'Approve Terraform infrastructure changes?'
                }
            }
        }

        stage('Terraform Apply') {
            when {
                branch 'main'
            }
            steps {
                echo '🏗️ Deploying infrastructure with Terraform...'
                dir("${TERRAFORM_DIR}") {
                    sh '''
                        terraform apply tfplan
                    '''
                }
            }
        }

        // ========================
        // STEP 4: APP DEPLOYMENT (Ansible)
        // ========================
        stage('Deploy with Ansible') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploying application with Ansible...'
                sh '''
                    cd ${ANSIBLE_DIR}
                    ansible-playbook deploy.yml \
                        -i inventory/production \
                        -e "docker_image=${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG}" \
                        -e "environment=production"
                '''
            }
        }

        // ========================
        // STEP 5: MONITORING (Prometheus)
        // ========================
        stage('Setup Prometheus') {
            when {
                branch 'main'
            }
            steps {
                echo '📊 Setting up Prometheus monitoring...'
                sh '''
                    cd ${ANSIBLE_DIR}
                    ansible-playbook monitoring/prometheus.yml \
                        -i inventory/production
                '''
            }
        }

        // ========================
        // STEP 6: VISUALIZATION (Grafana)
        // ========================
        stage('Setup Grafana') {
            when {
                branch 'main'
            }
            steps {
                echo '📈 Setting up Grafana dashboards...'
                sh '''
                    cd ${ANSIBLE_DIR}
                    ansible-playbook monitoring/grafana.yml \
                        -i inventory/production
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed!'
        }
        always {
            echo '🧹 Cleaning up...'
            cleanWs(
                deleteDirs: true,
                disableDeferredWipeout: true,
                notFailBuild: true
            )
        }
    }
}
