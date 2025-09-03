import { SignIn } from '@clerk/clerk-react';
import { Building2 } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="text-blue-500 mr-3" size={48} />
            <h1 className="text-3xl font-bold text-white">LoanWise</h1>
          </div>
          <p className="text-gray-300">AI-Powered Loan Management Platform</p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <SignIn
            routing="path"
            path="/login"
            redirectUrl="/"
            fallbackRedirectUrl="/"
            signUpUrl="/login"
            appearance={{
              baseTheme: undefined,
              variables: {
                colorPrimary: '#3b82f6',
                colorBackground: '#1f2937',
                colorInputBackground: '#374151',
                colorInputText: '#ffffff',
                colorText: '#ffffff',
                borderRadius: '0.5rem'
              },
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                card: 'bg-transparent shadow-none',
                headerTitle: 'text-white',
                headerSubtitle: 'text-gray-300',
                formFieldLabel: 'text-gray-300',
                formFieldInput: 'bg-gray-700/50 border-gray-600 text-white',
                footerActionLink: 'text-blue-400 hover:text-blue-300',
                dividerLine: 'bg-gray-600',
                dividerText: 'text-gray-400',
                socialButtonsBlockButton: 'bg-gray-700 hover:bg-gray-600 border-gray-600',
                socialButtonsBlockButtonText: 'text-white',
                footer: 'hidden',
                footerAction: 'hidden',
                footerActionText: 'hidden',
                footerPages: 'hidden'
              }
            }}
          />
        </div>

        {/* Secured by Clerk text */}
        <div className="mt-4 text-center text-xs text-gray-400">
          <p>Secured by Clerk</p>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          <p>© 2024 LoanWise. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
