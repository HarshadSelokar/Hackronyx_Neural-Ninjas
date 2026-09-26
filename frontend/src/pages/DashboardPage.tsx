import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldAlert, 
  PlusCircle, 
  ExternalLink,
  Building,
  Sparkles
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.getDashboard();
        setData(res);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isEmployee = user?.role === 'employee';
  const summary = data?.summary || {};

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#111827] via-[#0f172a] to-[#1e1b4b] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Financial Intelligence Console
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Welcome back, {user?.full_name}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isEmployee
              ? `Track your corporate expenses, policy compliance, and reimbursement status in ${user?.department_name || 'Engineering'}.`
              : `Active financial control oversight for ${user?.role.toUpperCase()} role across 6 organizational departments.`}
          </p>
        </div>

        {isEmployee ? (
          <button
            onClick={() => navigate('/submit-expense')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition shadow-lg shadow-indigo-600/30 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Submit Expense
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/approvals')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition shadow-lg shadow-indigo-600/30 shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              Review Queue ({summary.pending_count || 0})
            </button>
            <button
              onClick={() => navigate('/copilot')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-medium px-3.5 py-2.5 rounded-lg text-sm transition shrink-0"
            >
              Ask Copilot
            </button>
          </div>
        )}
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isEmployee ? 'Total Submitted' : 'Organization Spend'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(summary.total_spend)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">FY 2026 To Date</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending Action
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-300 tracking-tight">
            {summary.pending_count || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting multi-stage review</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Approved
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {summary.approved_count || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Compliant & verified</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isEmployee ? 'Reimbursed' : 'High Risk Flagged'}
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isEmployee ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {isEmployee ? <TrendingUp className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${
            isEmployee ? 'text-blue-400' : 'text-rose-400'
          }`}>
            {isEmployee ? formatCurrency(summary.reimbursed_amount) : (summary.high_risk_count || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isEmployee ? 'Credited to account' : 'Policy / anomaly violations'}
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      {isEmployee ? (
        /* EMPLOYEE VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Expenses List */}
          <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Recent Expenses
              </h3>
              <button
                onClick={() => navigate('/expenses')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {data?.recent_expenses?.length > 0 ? (
                data.recent_expenses.map((exp: any) => (
                  <div
                    key={exp.id}
                    onClick={() => navigate(`/expenses/${exp.id}`)}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200">{exp.merchant}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{exp.category}</span>
                        <span>•</span>
                        <span>{exp.expense_date}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">
                        {formatCurrency(exp.amount)}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase border ${
                          exp.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          exp.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                          exp.status === 'reimbursed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {exp.status.replace('_', ' ')}
                        </span>
                        {exp.policy_status === 'violation' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Policy Exceeded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No expenses submitted yet.
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Spending by Category
            </h3>
            <div className="space-y-4">
              {data?.categories?.map((cat: any) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">{cat.category}</span>
                    <span className="text-slate-400 font-semibold">{formatCurrency(cat.total)}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (cat.total / (summary.total_spend || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* MANAGER / FINANCE / ADMIN VIEW */
        <div className="space-y-6">
          {/* Department Budgets Grid */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-400" />
                  Department Budget Utilization (FY 2026)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated dynamically from real expenses and approved transactions.
                </p>
              </div>
              <button
                onClick={() => navigate('/budgets')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Detailed Forecasts <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.budgets?.map((dept: any) => (
                <div
                  key={dept.department_id}
                  className="p-4 rounded-lg bg-[#0b0f17] border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-slate-200">{dept.department_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border uppercase ${
                      dept.risk_level === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                      dept.risk_level === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {dept.risk_level} Risk
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex justify-between mb-1.5">
                    <span>Spent: {formatCurrency(dept.spent_amount)}</span>
                    <span>Budget: {formatCurrency(dept.total_budget)}</span>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden relative">
                    {/* Spent portion */}
                    <div
                      className={`h-2.5 rounded-full ${
                        dept.utilization_pct > 90 ? 'bg-rose-500' :
                        dept.utilization_pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, dept.utilization_pct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>Utilization: <strong className="text-white">{dept.utilization_pct}%</strong></span>
                    <span>Pending: {formatCurrency(dept.pending_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Approvals & SLA Aging */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Priority Queue */}
            <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Pending Approvals Queue
                </h3>
                <button
                  onClick={() => navigate('/approvals')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  Open Full Queue <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {data?.pending_queue?.slice(0, 5).map((q: any) => (
                  <div
                    key={q.approval_id}
                    onClick={() => navigate(`/expenses/${q.id}`)}
                    className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                        {q.merchant}
                        {q.amount >= 25000 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            High Impact
                          </span>
                        )}
                        {q.policy_status === 'violation' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Policy Review
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {q.employee_name} ({q.department_name}) • {q.category}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">
                        {formatCurrency(q.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Stage {q.approval_order} Pending
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Approval SLA Aging */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Approval Aging & SLAs
              </h3>
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-[#0b0f17] border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Manager Review Avg</span>
                    <span className="text-slate-200 font-bold">{data?.aging_metrics?.manager !== undefined ? `${data.aging_metrics.manager} days` : '0 days'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1">✓ Within 2-day target SLA</div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0b0f17] border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Finance Review Avg</span>
                    <span className="text-slate-200 font-bold">{data?.aging_metrics?.finance !== undefined ? `${data.aging_metrics.finance} days` : '0 days'}</span>
                  </div>
                  <div className="text-[11px] text-amber-400 mt-1">Target SLA: 2.0 days</div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0b0f17] border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Admin Escalations Avg</span>
                    <span className="text-slate-200 font-bold">{data?.aging_metrics?.admin !== undefined ? `${data.aging_metrics.admin} days` : '0 days'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1">✓ Executive response queue</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
