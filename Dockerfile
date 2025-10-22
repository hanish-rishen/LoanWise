# Multi-stage build for LoanWise React application
# Stage 1: Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production=false && npm cache clean --force

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_GROQ_API_KEY
ARG VITE_APP_URL
ARG VITE_ENABLE_VOICE_MODE
ARG VITE_DEFAULT_VOICE
ARG VITE_SPEECH_RECOGNITION_LANG
ARG VITE_MAX_LOAN_AMOUNT
ARG VITE_MIN_CREDIT_SCORE
ARG VITE_MAX_CREDIT_SCORE
ARG VITE_ANALYTICS_ID
ARG VITE_BUILD_VERSION
ARG VITE_BUILD_TIMESTAMP

# Set environment variables for build
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}
ENV VITE_GROQ_API_KEY=${VITE_GROQ_API_KEY}
ENV VITE_APP_URL=${VITE_APP_URL}
ENV VITE_ENABLE_VOICE_MODE=${VITE_ENABLE_VOICE_MODE}
ENV VITE_DEFAULT_VOICE=${VITE_DEFAULT_VOICE}
ENV VITE_SPEECH_RECOGNITION_LANG=${VITE_SPEECH_RECOGNITION_LANG}
ENV VITE_MAX_LOAN_AMOUNT=${VITE_MAX_LOAN_AMOUNT}
ENV VITE_MIN_CREDIT_SCORE=${VITE_MIN_CREDIT_SCORE}
ENV VITE_MAX_CREDIT_SCORE=${VITE_MAX_CREDIT_SCORE}
ENV VITE_ANALYTICS_ID=${VITE_ANALYTICS_ID}
ENV VITE_BUILD_VERSION=${VITE_BUILD_VERSION}
ENV VITE_BUILD_TIMESTAMP=${VITE_BUILD_TIMESTAMP}

# Build the application
# Note: type-check and lint are handled by Jenkins pipeline before Docker build
RUN npm run build

# Stage 2: Production stage
FROM nginx:1.25-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set proper permissions
RUN chown -R nextjs:nodejs /usr/share/nginx/html && \
    chown -R nextjs:nodejs /var/cache/nginx && \
    chown -R nextjs:nodejs /var/log/nginx && \
    chown -R nextjs:nodejs /etc/nginx/conf.d

# Create nginx PID directory and set permissions
RUN touch /var/run/nginx.pid && \
    chown -R nextjs:nodejs /var/run/nginx.pid

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
