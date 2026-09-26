import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  CheckSquare, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.getApprovals();
      setData(res);
    } catch (err) {
      console.error('Error loading approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleQuickAction = async (approvalId: string, action: 'approve' | 'reject' | 'escalate') => {
    try {
      await api.actOnApproval(approvalId, action, `Actioned via Approval Hub (${action})`);
      setActionSuccess(`Expense successfully ${action}d!`);
      await fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { high_impact = [], policy_review = [], routine = [], aging_metrics = {} } = data || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <CheckSquare className="w-3.5 h-3.5" />
            Decision Cockpit
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Intelligent Approval Queue</h2>
          <p className="text-xs text-slate-400 mt-1">
            Approvals partitioned by organizational risk and financial exposure tiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#0f172a] border border-slate-800 px-3 py-1.5 rounded-lg text-xs flex items-center gap-3">
            <span className="text-slate-400">Aging SLA:</span>
            <span className="text-emerald-400 font-semibold">Mgr: {aging_metrics.manager !== undefined ? `${aging_metrics.manager}d` : '0d'}</span>
            <span className="text-amber-400 font-semibold">Fin: {aging_metrics.finance !== undefined ? `${aging_metrics.finance}d` : '0d'}</span>
            <span className="text-purple-400 font-semibold">Adm: {aging_metrics.admin !== undefined ? `${aging_metrics.admin}d` : '0d'}</span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* TIER 1: HIGH IMPACT */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              High Impact Tiers (≥ ₹25,000)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
              {high_impact.length} Pending
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Requires Multi-Tier Authorization</span>
        </div>

        <div className="bg-[#0f172a] border border-rose-900/30 rounded-xl divide-y divide-slate-800 shadow-sm overflow-hidden">
          {high_impact.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No high-impact expenses pending.</div>
          ) : (
            high_impact.map((item: any) => (
              <div
                key={item.approval_id}
                className="p-4 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div
                  onClick={() => navigate(`/expenses/${item.expense_id}`)}
                  className="cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{item.merchant}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/40">
                      Stage {item.approval_order}
                    </span>
                    {item.age_days >= 2 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Overdue ({Math.round(item.age_days)}d)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Submitted by <strong className="text-slate-200">{item.employee_name}</strong> • {item.department_name} • {item.category} • {item.expense_date}
                  </div>
                  {item.ai_summary && (
                    <div className="text-xs text-indigo-300/90 mt-1 italic">
                      "{item.ai_summary}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-white">
                      {formatCurrency(item.amount)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase">{item.policy_status}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuickAction(item.approval_id, 'reject')}
                      className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleQuickAction(item.approval_id, 'approve')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/30 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => navigate(`/expenses/${item.expense_id}`)}
                      className="p-1.5 text-slate-400 hover:text-white rounded"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* TIER 2: POLICY REVIEW */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Policy Review & Anomaly Alerts
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
              {policy_review.length} Pending
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Exceeds Policy or Behavioral Baselines</span>
        </div>

        <div className="bg-[#0f172a] border border-amber-900/30 rounded-xl divide-y divide-slate-800 shadow-sm overflow-hidden">
          {policy_review.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No policy violations pending review.</div>
          ) : (
            policy_review.map((item: any) => (
              <div
                key={item.approval_id}
                className="p-4 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div
                  onClick={() => navigate(`/expenses/${item.expense_id}`)}
                  className="cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{item.merchant}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40">
                      Policy Exceeded
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {item.employee_name} ({item.department_name}) • {item.category} • {item.expense_date}
                  </div>
                  {item.ai_summary && (
                    <div className="text-xs text-amber-300/80 mt-1 italic">
                      "{item.ai_summary}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-base font-bold text-white">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuickAction(item.approval_id, 'reject')}
                      className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleQuickAction(item.approval_id, 'approve')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/30 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => navigate(`/expenses/${item.expense_id}`)}
                      className="p-1.5 text-slate-400 hover:text-white rounded"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* TIER 3: ROUTINE EXPENSES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Routine & Standard Approvals
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              {routine.length} Pending
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Fully Compliant</span>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl divide-y divide-slate-800 shadow-sm overflow-hidden">
          {routine.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No routine expenses pending.</div>
          ) : (
            routine.map((item: any) => (
              <div
                key={item.approval_id}
                className="p-4 hover:bg-slate-800/40 transition flex items-center justify-between"
              >
                <div onClick={() => navigate(`/expenses/${item.expense_id}`)} className="cursor-pointer flex-1">
                  <div className="text-sm font-semibold text-white">{item.merchant}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item.employee_name} • {item.category} • {item.expense_date}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-bold text-white text-sm">
                    {formatCurrency(item.amount)}
                  </div>
                  <button
                    onClick={() => handleQuickAction(item.approval_id, 'approve')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Quick Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
