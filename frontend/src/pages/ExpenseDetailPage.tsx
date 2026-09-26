import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  FileText, 
  TrendingUp, 
  Clock, 
  ArrowLeft,
  DollarSign,
  ChevronRight,
  Send,
  Building
} from 'lucide-react';

export const ExpenseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulation state
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<any>(null);

  // Approval action state
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getExpenseDetail(id);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load expense');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleSimulate = async () => {
    if (!id) return;
    setSimulating(true);
    try {
      const res = await api.simulateExpense(id);
      setSimulation(res);
    } catch (err: any) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleAction = async (approvalId: string, action: 'approve' | 'reject' | 'escalate') => {
    setActionLoading(true);
    try {
      await api.actOnApproval(approvalId, action, comment);
      setActionSuccess(`Expense successfully ${action}d!`);
      setComment('');
      await fetchDetail();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} expense`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-slate-400">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <p>{error || 'Expense not found'}</p>
        <button
          onClick={() => navigate('/expenses')}
          className="mt-4 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs"
        >
          Back to Expenses
        </button>
      </div>
    );
  }

  const { expense, approvals, audit_logs } = data;
  const aiAnalysis = typeof expense.ai_analysis === 'string'
    ? JSON.parse(expense.ai_analysis || '{}')
    : (expense.ai_analysis || {});

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Find if current user has an actionable pending approval for this expense
  const pendingApproval = approvals.find((a: any) => {
    if (a.status !== 'pending') return false;
    if (user?.role === 'admin') return true;
    if (user?.role === 'finance' && a.approval_order >= 2) return true;
    if (user?.role === 'manager' && a.approver_id === user?.id) return true;
    return false;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to List
        </button>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase border ${
            expense.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
            expense.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
            expense.status === 'reimbursed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
            'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {expense.status.replace('_', ' ')}
          </span>

          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase border ${
            expense.risk_level === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
            expense.risk_level === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
            'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {expense.risk_level || 'low'} Risk
          </span>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Main Grid: Details + AI Review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Budget Impact */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  {expense.category}
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">{expense.merchant}</h2>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>{expense.employee_name} ({expense.employee_code})</span>
                  <span>•</span>
                  <span>{expense.department_name}</span>
                  <span>•</span>
                  <span>{expense.expense_date}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Total Claimed</div>
                <div className="text-3xl font-extrabold text-white mt-0.5">
                  {formatCurrency(expense.amount)}
                </div>
              </div>
            </div>

            {/* Description */}
            {expense.description && (
              <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
                <strong className="text-slate-400 block mb-1">Business Purpose:</strong>
                {expense.description}
              </div>
            )}

            {/* Invoice & Receipt Metadata */}
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Invoice Number</span>
                <span className="font-semibold text-slate-200">{expense.invoice_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Policy Status</span>
                <span className={`font-semibold ${expense.policy_status === 'violation' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {expense.policy_status === 'violation' ? 'Violation Flagged' : 'Compliant'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Receipt Attached</span>
                <span className="font-semibold text-slate-200 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  {expense.receipt_path ? 'receipt.pdf' : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Budget Impact Simulator (Major USP Feature) */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Live Budget Impact Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculates department budget utilization before and after approving this expense.
                </p>
              </div>

              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold transition"
              >
                {simulating ? 'Calculating...' : 'Simulate Approval'}
              </button>
            </div>

            {simulation ? (
              <div className="p-4 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-4 animate-fadeIn">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Current Spend</div>
                    <div className="text-sm font-bold text-white mt-1">
                      {formatCurrency(simulation.current_spent)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{simulation.current_utilization}% of Budget</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Post-Approval Spend</div>
                    <div className="text-sm font-bold text-indigo-300 mt-1">
                      {formatCurrency(simulation.after_spent)}
                    </div>
                    <div className="text-[10px] text-indigo-400 mt-0.5">{simulation.after_utilization}% of Budget</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Forecast Run-Rate</div>
                    <div className="text-sm font-bold text-white mt-1">
                      {simulation.after_forecast_pct}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Projected full-year</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Risk Assessment</div>
                    <div className={`text-sm font-bold mt-1 uppercase ${
                      simulation.risk_after === 'high' ? 'text-rose-400' :
                      simulation.risk_after === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {simulation.risk_before} → {simulation.risk_after}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{simulation.impact_classification}</div>
                  </div>
                </div>

                {/* Visual bar comparison */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Current: {simulation.current_utilization}%</span>
                    <span className="text-indigo-400 font-semibold">After Approval: {simulation.after_utilization}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-3"
                      style={{ width: `${Math.min(100, simulation.current_utilization)}%` }}
                    />
                    <div
                      className="bg-indigo-500 h-3 animate-pulse"
                      style={{ width: `${Math.min(100, simulation.after_utilization - simulation.current_utilization)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0b0f17] border border-slate-800/80 text-center text-xs text-slate-400">
                Click <strong>"Simulate Approval"</strong> to evaluate immediate budget impact and forecasting consequences without modifying any live data.
              </div>
            )}
          </div>

          {/* Multi-tier Approval Stages Timeline */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Multi-Stage Approval Hierarchy
            </h3>

            <div className="space-y-4">
              {approvals.map((app: any) => (
                <div
                  key={app.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-[#0b0f17] border border-slate-800"
                >
                  <div className="mt-0.5">
                    {app.status === 'approved' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : app.status === 'rejected' ? (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-200">
                        Stage {app.approval_order}: {app.approver_role?.toUpperCase()} Review
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border ${
                        app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        app.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {app.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mt-1">
                      Assigned to: <strong className="text-slate-300">{app.approver_name}</strong>
                      {app.acted_at && ` • Acted on ${new Date(app.acted_at).toLocaleString()}`}
                    </div>

                    {app.comment && (
                      <div className="mt-2 text-xs text-slate-300 italic bg-slate-900/80 p-2 rounded border border-slate-800">
                        "{app.comment}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Approver Action Box (if applicable) */}
            {pendingApproval && (
              <div className="mt-6 p-5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Your Decision Required ({user?.role?.toUpperCase()} Stage)
                </div>

                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Decision commentary or audit justification..."
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction(pendingApproval.id, 'reject')}
                    className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition"
                  >
                    Reject
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction(pendingApproval.id, 'escalate')}
                    className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
                  >
                    Escalate
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction(pendingApproval.id, 'approve')}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/30 transition"
                  >
                    Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Explainable AI Analysis */}
        <div className="space-y-6">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Explainable AI Intelligence
            </div>

            <div className="p-3.5 rounded-lg bg-[#0b0f17] border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Executive AI Summary</div>
              <div className="text-xs text-slate-200 mt-1 leading-relaxed">
                {expense.ai_summary || 'Standard corporate expenditure with clean verification.'}
              </div>
            </div>

            {/* Why This Expense Was Flagged Panel */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                Audit Reasons & Signals
              </div>
              <div className="space-y-2">
                {aiAnalysis.reasons?.map((reason: string, idx: number) => {
                  const isViolation = reason.includes('⚠') || reason.includes('Exceeds') || reason.includes('high');
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                        isViolation
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      <span className="shrink-0">{isViolation ? '⚠' : '✓'}</span>
                      <span className="leading-snug">{reason.replace(/^[⚠✓]\s*/, '')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Breakdown Matrix */}
            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Model Confidence</span>
                <span className="font-semibold text-slate-200">
                  {Math.round((aiAnalysis.confidence || 0.96) * 100)}%
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Duplicate Found</span>
                <span className={`font-semibold ${aiAnalysis.duplicate_detected ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {aiAnalysis.duplicate_detected ? 'Yes (Flagged)' : 'No'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Anomaly Detection</span>
                <span className={`font-semibold ${aiAnalysis.anomaly ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {aiAnalysis.anomaly ? 'Detected' : 'Normal'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Recommendation</span>
                <span className="font-semibold text-indigo-400 uppercase text-[11px]">
                  {aiAnalysis.recommendation?.replace(/_/g, ' ') || 'standard_review'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Trail Snippet */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm text-xs">
            <h4 className="font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Event Audit Trail
            </h4>
            <div className="space-y-2.5">
              {audit_logs.map((log: any) => (
                <div key={log.id} className="text-[11px] pb-2 border-b border-slate-800/80 last:border-0">
                  <div className="text-slate-300 font-medium">{log.action.replace(/_/g, ' ')}</div>
                  <div className="text-slate-500 mt-0.5">
                    {log.actor_name || 'System Engine'} • {new Date(log.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
