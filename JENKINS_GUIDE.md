# 🔧 Jenkins CI/CD Guide for LoanWise

## 📋 Overview

This guide explains how to set up and use Jenkins for continuous integration and deployment of the LoanWise application.

## 🚀 Prerequisites

- Jenkins server installed and running
- Node.js plugin installed in Jenkins
- Git plugin installed in Jenkins
- Credentials plugin installed in Jenkins

## 📦 Jenkins Setup

### 1. Install Required Plugins

Navigate to **Manage Jenkins** > **Manage Plugins** and install:

- **NodeJS Plugin** - For Node.js builds
- **Git Plugin** - For Git repository integration
- **Pipeline Plugin** - For pipeline support
- **Credentials Binding Plugin** - For secure credential management
- **Blue Ocean** (Optional) - For modern pipeline visualization

### 2. Configure Node.js

1. Go to **Manage Jenkins** > **Global Tool Configuration**
2. Scroll to **NodeJS** section
3. Click **Add NodeJS**
4. Configure:
   - **Name**: `Node 20.x` (or your preferred version)
   - **Version**: Select Node.js 20.x
   - Check **Install automatically**
5. Click **Save**

### 3. Configure Credentials

Add the following credentials in **Manage Jenkins** > **Manage Credentials**:

#### Required Credentials:

1. **vite-clerk-key**
   - Type: Secret text
   - ID: `vite-clerk-key`
   - Secret: Your Clerk publishable key

2. **vite-groq-key**
   - Type: Secret text
   - ID: `vite-groq-key`
   - Secret: Your Groq API key

3. **vite-database-url**
   - Type: Secret text
   - ID: `vite-database-url`
   - Secret: Your database connection URL

## 🔨 Creating the Pipeline

### Option 1: Pipeline from SCM (Recommended)

1. Click **New Item**
2. Enter job name: `LoanWise-Pipeline`
3. Select **Pipeline**
4. Click **OK**
5. In the configuration:
   - **Description**: LoanWise CI/CD Pipeline
   - **Build Triggers**: 
     - ✅ Poll SCM: `H/5 * * * *` (checks every 5 minutes)
     - ✅ GitHub hook trigger (if using webhooks)
   - **Pipeline**:
     - **Definition**: Pipeline script from SCM
     - **SCM**: Git
     - **Repository URL**: `https://github.com/hanish-rishen/LoanWise.git`
     - **Credentials**: Add if private repo
     - **Branch Specifier**: `*/main`
     - **Script Path**: `Jenkinsfile`
6. Click **Save**

### Option 2: Multibranch Pipeline

1. Click **New Item**
2. Enter name: `LoanWise`
3. Select **Multibranch Pipeline**
4. Click **OK**
5. Configure:
   - **Branch Sources**: Add Git
   - **Repository URL**: `https://github.com/hanish-rishen/LoanWise.git`
   - **Behaviors**: Discover branches
   - **Build Configuration**: by Jenkinsfile
6. Click **Save**

## 📊 Pipeline Stages Explained

### 1. **Checkout**
- Clones the repository
- Captures commit information
- Displays commit message and author

### 2. **Install Dependencies**
- Runs `npm ci` for clean, reproducible builds
- Uses package-lock.json for exact versions

### 3. **Code Quality** (Parallel)
- **Lint**: Runs ESLint to check code quality
- **Type Check**: Validates TypeScript types

### 4. **Security Scan**
- Runs `npm audit` to check for vulnerabilities
- Marks build as UNSTABLE if issues found

### 5. **Build**
- Compiles the application with Vite
- Archives build artifacts for deployment

### 6. **Test**
- Runs test suite (if configured)
- Continues even if tests aren't set up

### 7. **Build Analysis**
- Analyzes build size
- Shows artifact breakdown

### 8. **Deploy**
- Only runs on `main` or `develop` branches
- Configurable for your deployment target

## 🔐 Environment Variables

The pipeline uses these environment variables:

```groovy
VITE_CLERK_PUBLISHABLE_KEY  // Clerk authentication key
VITE_GROQ_API_KEY           // Groq AI API key
VITE_DATABASE_URL           // Database connection string
```

## 🚀 Deployment Configuration

The Jenkinsfile includes a deployment stage. Uncomment and configure one of these options:

### Vercel Deployment
```groovy
sh 'vercel deploy --prod --token $VERCEL_TOKEN'
```

### Netlify Deployment
```groovy
sh 'netlify deploy --prod --auth $NETLIFY_TOKEN --site $NETLIFY_SITE_ID'
```

### AWS S3 Deployment
```groovy
sh 'aws s3 sync dist/ s3://your-bucket-name --delete'
```

### Docker Deployment
```groovy
sh '''
    docker build -t loanwise:${BUILD_NUMBER} .
    docker tag loanwise:${BUILD_NUMBER} loanwise:latest
    docker push loanwise:latest
'''
```

## 📧 Notifications

### Email Notifications

Add to `post { failure }` section:

```groovy
emailext (
    subject: "Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
    body: """
        Build failed for ${env.JOB_NAME}
        
        Build Number: ${env.BUILD_NUMBER}
        Build URL: ${env.BUILD_URL}
        Commit: ${env.GIT_COMMIT_MSG}
        Author: ${env.GIT_AUTHOR}
    """,
    to: "team@example.com",
    attachLog: true
)
```

### Slack Notifications

Install Slack Notification Plugin and add:

```groovy
slackSend (
    channel: '#builds',
    color: 'danger',
    message: "Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)"
)
```

## 🔄 GitHub Webhook Integration

### Setup GitHub Webhook

1. Go to your GitHub repository
2. Navigate to **Settings** > **Webhooks**
3. Click **Add webhook**
4. Configure:
   - **Payload URL**: `http://your-jenkins-url/github-webhook/`
   - **Content type**: `application/json`
   - **Events**: Just the push event
5. Click **Add webhook**

### Configure Jenkins

1. In your pipeline configuration
2. Check **GitHub hook trigger for GITScm polling**
3. Save the configuration

## 📈 Best Practices

### 1. Branch Strategy
- **main/master**: Production deployments
- **develop**: Staging deployments
- **feature/***: Feature development (no deployment)

### 2. Build Optimization
- Use `npm ci` instead of `npm install`
- Enable npm caching for faster builds
- Use parallel stages for independent tasks

### 3. Security
- Never commit credentials to code
- Use Jenkins Credentials Plugin
- Regularly update dependencies
- Monitor security scan results

### 4. Monitoring
- Set up build notifications
- Monitor build times
- Track build success rates
- Review failed builds promptly

## 🐛 Troubleshooting

### Build Fails at Install Dependencies
**Solution**: Check Node.js version matches project requirements
```bash
node --version  # Should be 18.x or 20.x
```

### Build Fails at Type Check
**Solution**: Fix TypeScript errors locally first
```bash
npm run type-check
```

### Deploy Stage Doesn't Run
**Solution**: Check branch name matches deployment condition
```groovy
when {
    branch 'main'  // Must match exactly
}
```

### Credentials Not Found
**Solution**: 
1. Verify credential ID matches in Jenkinsfile
2. Ensure credentials are added to Jenkins
3. Check credential permissions

## 📊 Viewing Build Results

### Via Jenkins UI
1. Navigate to your pipeline
2. Click on a build number
3. View **Console Output** for logs
4. Check **Pipeline Steps** for stage details

### Via Blue Ocean (Recommended)
1. Click **Open Blue Ocean** in Jenkins
2. Select your pipeline
3. View visual pipeline execution
4. Investigate failures with detailed logs

## 🔧 Advanced Configuration

### Add Code Coverage
```groovy
stage('Coverage') {
    steps {
        sh 'npm run test:coverage'
        publishHTML([
            reportDir: 'coverage',
            reportFiles: 'index.html',
            reportName: 'Coverage Report'
        ])
    }
}
```

### Add Performance Testing
```groovy
stage('Performance') {
    steps {
        sh 'npm run lighthouse'
        publishHTML([
            reportDir: 'lighthouse',
            reportFiles: 'report.html',
            reportName: 'Lighthouse Report'
        ])
    }
}
```

### Add Docker Build
```groovy
stage('Docker Build') {
    steps {
        sh '''
            docker build -t loanwise:${BUILD_NUMBER} .
            docker tag loanwise:${BUILD_NUMBER} loanwise:latest
        '''
    }
}
```

## 📝 Maintenance

### Regular Tasks
- [ ] Update Node.js version quarterly
- [ ] Review and update dependencies monthly
- [ ] Check security scan results weekly
- [ ] Monitor build performance
- [ ] Clean old build artifacts

### Backup
- Export Jenkins configuration regularly
- Version control your Jenkinsfile
- Document custom configurations

## 🎯 Success Criteria

A successful build should:
- ✅ Pass all linting checks
- ✅ Pass type checking
- ✅ Have no critical security vulnerabilities
- ✅ Build successfully
- ✅ Deploy to appropriate environment

## 📚 Additional Resources

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Pipeline Syntax Reference](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Blue Ocean Documentation](https://www.jenkins.io/doc/book/blueocean/)
- [NodeJS Plugin](https://plugins.jenkins.io/nodejs/)

---

**Last Updated**: October 2025
**Maintained By**: LoanWise Team
