import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Eye, DollarSign, User, CheckCircle, Clock, XCircle, AlertCircle, Plus, Edit, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { db } from '../db';
import type { LoanApplication } from '../dbOperations';
import { updateLoanApplicationStatus } from '../dbOperations';
import { toastService } from '../services/toastService';
import loanApplicationService from '../services/loanApplicationService';

export default function LoanApplicationsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<LoanApplication | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.id) return;

      try {
        const result = await db.getLoanApplications(user.id);
        setApplications(result);
      } catch (error) {
        console.error('Error fetching applications:', error);
        setApplications([]);
      }
    };

    fetchApplications();

    // Listen for loan application creation events
    const handleLoanApplicationCreated = () => {
      console.log('📋 LoanApplicationsPage: New application created - refreshing...');
      fetchApplications();
    };

    window.addEventListener('loanApplicationCreated', handleLoanApplicationCreated);

    return () => {
      window.removeEventListener('loanApplicationCreated', handleLoanApplicationCreated);
    };
  }, [user?.id]);  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={20} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={20} />;
      case 'withdrawn':
        return <XCircle className="text-gray-500" size={20} />;
      case 'under-review':
        return <AlertCircle className="text-blue-500" size={20} />;
      case 'incomplete':
        return <Edit className="text-orange-500" size={20} />;
      default:
        return <Clock className="text-gray-500" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'rejected':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'withdrawn':
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
      case 'under-review':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'incomplete':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const isApplicationIncomplete = (application: LoanApplication) => {
    return !application.loan_purpose ||
           !application.employment_status ||
           application.status === 'incomplete' ||
           parseFloat(application.loan_amount) <= 0;
  };  const handleContinueApplication = async (applicationId: string) => {
    try {
      // Generate a new conversation ID for continuing the application
      const conversationId = `continue_${applicationId}_${Date.now()}`;

      // Continue the application using the loan service
      const result = await loanApplicationService.continueApplication(
        conversationId,
        applicationId
      );

      if (result) {
        // Navigate to chat with the conversation context
        navigate('/chat', {
          state: {
            conversationId,
            initialMessage: `I've loaded your existing ${result.data.loan_type} application. How can I help you today?`
          }
        });
        toastService.addToast('Application resumed successfully', 'success', 3000);
      } else {
        toastService.addToast('Could not resume application. Please try again.', 'error', 4000);
      }
    } catch (error) {
      console.error('Error continuing application:', error);
      toastService.addToast('Failed to continue application. Please try again.', 'error', 4000);
    }
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    if (confirm('Are you sure you want to withdraw this loan application? This action cannot be undone.')) {
      try {
        const success = await updateLoanApplicationStatus(applicationId, 'withdrawn');
        if (success) {
          // Refresh the applications list
          const result = await db.getLoanApplications(user!.id);
          setApplications(result);
          toastService.addToast('Application withdrawn successfully', 'success', 3000);
        } else {
          toastService.addToast('Failed to withdraw application. Please try again.', 'error', 4000);
        }
      } catch (error) {
        console.error('Error withdrawing application:', error);
        toastService.addToast('An error occurred while withdrawing the application.', 'error', 4000);
      }
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount) || numAmount === 0) {
      return '₹0';
    }

    // Format with Indian number system (lakhs/crores)
    if (numAmount >= 10000000) { // 1 crore
      const crores = numAmount / 10000000;
      return `₹${crores.toFixed(crores >= 10 ? 0 : 1)} crore${crores !== 1 ? 's' : ''}`;
    } else if (numAmount >= 100000) { // 1 lakh
      const lakhs = numAmount / 100000;
      return `₹${lakhs.toFixed(lakhs >= 10 ? 0 : 1)} lakh${lakhs !== 1 ? 's' : ''}`;
    } else if (numAmount >= 1000) { // thousands
      const thousands = numAmount / 1000;
      return `₹${thousands.toFixed(thousands >= 10 ? 0 : 1)}K`;
    } else {
      return `₹${numAmount.toLocaleString('en-IN')}`;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!db) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Loading Applications...</h2>
          <p className="text-gray-300">Preparing loan applications data...</p>
        </div>
      </div>
    );
  }

  // Detail View
  if (selectedApplication) {
    console.log('Rendering detail view for application:', selectedApplication.id);
    const isIncomplete = isApplicationIncomplete(selectedApplication);

    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <button
                onClick={() => setSelectedApplication(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 mr-4"
                title="Back to Applications"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Application Details</h1>
                <p className="text-gray-400 mt-1">Application ID: {selectedApplication.id}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {isIncomplete && (
                <button
                  onClick={() => handleContinueApplication(selectedApplication.id)}
                  className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all duration-200"
                >
                  <Edit size={20} className="mr-2" />
                  Continue Application
                </button>
              )}
              <div className={`px-4 py-2 rounded-lg text-sm font-medium border ${getStatusColor(selectedApplication.status)}`}>
                <div className="flex items-center">
                  {getStatusIcon(selectedApplication.status)}
                  <span className="ml-2 capitalize">{selectedApplication.status.replace('-', ' ')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Incomplete Application Warning */}
          {isIncomplete && (
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="text-orange-500 mr-3" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-orange-400">Application Incomplete</h3>
                  <p className="text-orange-200">This application is missing required information. Click "Continue Application" to complete it.</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Applicant Information */}
            <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <User className="text-blue-500 mr-3" size={24} />
                Applicant Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Full Name</label>
                  <p className="text-lg font-semibold">{selectedApplication.applicant_name}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Credit Score</label>
                  <p className={`text-lg font-semibold ${
                    selectedApplication.credit_score ? 'text-white' : 'text-yellow-400'
                  }`}>
                    {selectedApplication.credit_score || 'Not provided'}
                  </p>
                  {!selectedApplication.credit_score && (
                    <p className="text-xs text-yellow-300 mt-1">
                      Credit score required for loan processing
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Monthly Income</label>
                  <p className="text-lg font-semibold">{formatCurrency(selectedApplication.monthly_income)}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Employment Status</label>
                  <p className="text-lg font-semibold">{selectedApplication.employment_status || 'Not provided'}</p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-gray-400 block mb-1">Application Date</label>
                  <p className="text-lg font-semibold">{formatDate(selectedApplication.application_date)}</p>
                </div>
              </div>
            </div>

            {/* Loan Summary */}
            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg p-6 border border-blue-500/20">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <DollarSign className="text-green-500 mr-3" size={24} />
                Loan Summary
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Loan Type</label>
                  <p className="text-2xl font-bold text-blue-400">{selectedApplication.loan_type}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Requested Amount</label>
                  <p className="text-3xl font-bold text-green-400">{formatCurrency(selectedApplication.loan_amount)}</p>
                </div>

                {selectedApplication.interest_rate && selectedApplication.interest_rate !== '0.00%' ? (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Interest Rate</label>
                    <p className="text-xl font-semibold text-blue-400">{selectedApplication.interest_rate} APR</p>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Interest Rate</label>
                    <p className="text-lg text-yellow-400">To be determined after approval</p>
                    <p className="text-xs text-gray-400 mt-1">Rate depends on credit score and loan terms</p>
                  </div>
                )}

                {selectedApplication.loan_term && selectedApplication.loan_term > 0 ? (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Loan Term</label>
                    <p className="text-xl font-semibold text-blue-400">{selectedApplication.loan_term} years</p>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Loan Term</label>
                    <p className="text-lg text-yellow-400">To be finalized after approval</p>
                    <p className="text-xs text-gray-400 mt-1">Term varies by loan type and amount</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Loan Decision Analysis */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="text-purple-500 mr-3" size={20} />
              Loan Decision Analysis
            </h3>
            {(() => {
              const analysis = loanApplicationService.analyzeLoanDecision(selectedApplication);
              return (
                <div className="space-y-4">
                  {/* Overall Score */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Approval Score</span>
                      <span className={`text-xl font-bold ${
                        analysis.overallScore >= 75 ? 'text-green-400' :
                        analysis.overallScore >= 55 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {analysis.overallScore}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          analysis.overallScore >= 75 ? 'bg-green-500' :
                          analysis.overallScore >= 55 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${analysis.overallScore}%` }}
                      ></div>
                    </div>
                    <p className={`text-sm mt-2 font-medium ${
                      analysis.decision === 'approved' ? 'text-green-400' :
                      analysis.decision === 'under-review' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      Recommendation: {(analysis.decision || 'pending').toUpperCase()}
                    </p>
                  </div>

                  {/* Approval Reasons */}
                  {analysis.approvalReasons.length > 0 && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                      <h4 className="text-green-400 font-medium mb-2 flex items-center">
                        <CheckCircle size={16} className="mr-2" />
                        Approval Factors
                      </h4>
                      <ul className="space-y-1">
                        {analysis.approvalReasons.map((reason: string, index: number) => (
                          <li key={index} className="text-green-200 text-sm flex items-start">
                            <span className="text-green-400 mr-2">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risk Factors */}
                  {analysis.rejectionRisks.length > 0 && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                      <h4 className="text-red-400 font-medium mb-2 flex items-center">
                        <AlertCircle size={16} className="mr-2" />
                        Risk Factors
                      </h4>
                      <ul className="space-y-1">
                        {analysis.rejectionRisks.map((risk: string, index: number) => (
                          <li key={index} className="text-red-200 text-sm flex items-start">
                            <span className="text-red-400 mr-2">•</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Conditions */}
                  {analysis.conditions && analysis.conditions.length > 0 && (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                      <h4 className="text-yellow-400 font-medium mb-2 flex items-center">
                        <AlertCircle size={16} className="mr-2" />
                        Additional Requirements
                      </h4>
                      <ul className="space-y-1">
                        {analysis.conditions.map((condition: string, index: number) => (
                          <li key={index} className="text-yellow-200 text-sm flex items-start">
                            <span className="text-yellow-400 mr-2">•</span>
                            {condition}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Approved Terms Section */}
          {selectedApplication.status === 'approved' && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                <CheckCircle className="text-green-500 mr-3" size={20} />
                Approved Terms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-800/20 p-4 rounded-lg">
                  <label className="text-sm text-green-400 block mb-1">Interest Rate</label>
                  <p className="text-2xl font-semibold text-green-300">{selectedApplication.interest_rate}% APR</p>
                </div>
                <div className="bg-green-800/20 p-4 rounded-lg">
                  <label className="text-sm text-green-400 block mb-1">Loan Term</label>
                  <p className="text-2xl font-semibold text-green-300">{selectedApplication.loan_term} years</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 mr-4"
              title="Back to Dashboard"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Loan Applications</h1>
              <p className="text-gray-400 mt-1">Manage and track your loan applications</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            <Plus size={20} className="mr-2" />
            New Application
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or application ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under-review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Application ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Applicant</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Loan Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-blue-400">{application.id}</td>
                    <td className="px-6 py-4 text-sm">{application.applicant_name}</td>
                    <td className="px-6 py-4 text-sm">{application.loan_type}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(application.loan_amount)}</td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        <span className="ml-1 capitalize">{application.status.replace('-', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{formatDate(application.application_date)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            console.log('View button clicked for application:', application.id);
                            setSelectedApplication(application);
                          }}
                          className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                        >
                          <Eye size={16} className="mr-1" />
                          View
                        </button>
                        {isApplicationIncomplete(application) && (
                          <button
                            onClick={() => handleContinueApplication(application.id)}
                            className="flex items-center px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-md transition-colors"
                          >
                            <Edit size={16} className="mr-1" />
                            Continue
                          </button>
                        )}
                        {(application.status === 'pending' || application.status === 'under-review') && (
                          <button
                            onClick={() => handleWithdrawApplication(application.id)}
                            className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                          >
                            <XCircle size={16} className="mr-1" />
                            Withdraw
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredApplications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No applications found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
