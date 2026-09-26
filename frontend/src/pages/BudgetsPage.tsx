import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DepartmentBudget } from '../types';
import { 
  Building, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Calculator, 
  PieChart,
  ArrowRight
} from 'lucide-react';

export const BudgetsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Standalone Simulator state
  const [simDept, setSimDept] = useState('');
  const [simAmount, setSimAmount] = useState<number | ''>('');
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await api.getBudgets(2026);
      setData(res);
      if (res.departments?.length > 0 && !simDept) {
        setSimDept(res.departments[0].department_id);
      }
    } catch (err) {
      console.error('Error fetching budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simDept || !simAmount || Number(simAmount) <= 0) return;
    setSimLoading(true);
    try {
      const res = await api.simulateBudget(simDept, Number(simAmount));
      setSimResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimLoading(false);
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

  const { summary = {}, departments = [] } = data || {};

  return (
    <div className="max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
          <PieChart className="w-3.5 h-3.5" />
          Predictive Capital Allocation
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Department Budget Monitoring</h2>
        <p className="text-xs text-slate-400 mt-1">
          Dynamic calculations of committed expenses, run-rate forecasts, and overspend projections.
        </p>
      </div>

      {/* Organization Macro Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Allocated Budget</div>
          <div className="text-2xl font-bold text-white mt-2">
            {formatCurrency(summary.total_org_budget)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across 6 Departments (FY 2026)</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Actual Spent</div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {formatCurrency(summary.total_org_spent)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Approved & Reimbursed to date</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Commitments</div>
          <div className="text-2xl font-bold text-amber-300 mt-2">
            {formatCurrency(summary.total_org_pending)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">In active approval queue</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Overall Utilization</div>
          <div className="text-2xl font-bold text-indigo-400 mt-2">
            {summary.org_utilization_pct}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Healthy organizational reserve</div>
        </div>
      </div>

      {/* Standalone Simulator */}
      <div className="bg-[#0f172a] border border-indigo-900/40 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Budget Impact Simulator
            </h3>
            <p className="text-xs text-slate-400">
              Hypothetically test the impact of a planned expenditure on department runway and annual forecast.
            </p>
          </div>
        </div>

        <form onSubmit={handleSimulate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Department
            </label>
            <select
              value={simDept}
              onChange={(e) => setSimDept(e.target.value)}
              className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {departments.map((d: any) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.department_name} (Budget: {formatCurrency(d.total_budget)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Simulated Amount (INR ₹)
            </label>
            <input
              type="number"
              required
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="e.g. 75000"
              className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={simLoading}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg text-xs transition shadow-md shadow-indigo-600/30"
          >
            {simLoading ? 'Simulating...' : 'Run Simulation'}
          </button>
        </form>

        {simResult && (
          <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center animate-fadeIn">
            <div className="p-3 rounded-lg bg-[#0b0f17] border border-slate-800">
              <div className="text-[11px] text-slate-400">Current Spent</div>
              <div className="text-sm font-bold text-white mt-1">
                {formatCurrency(simResult.current_spent)}
              </div>
              <div className="text-[10px] text-slate-500">{simResult.current_utilization}%</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0b0f17] border border-slate-800">
              <div className="text-[11px] text-slate-400">Post-Spend Utilization</div>
              <div className="text-sm font-bold text-indigo-400 mt-1">
                {simResult.after_utilization}%
              </div>
              <div className="text-[10px] text-slate-500">{formatCurrency(simResult.after_spent)}</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0b0f17] border border-slate-800">
              <div className="text-[11px] text-slate-400">Annual Forecast</div>
              <div className="text-sm font-bold text-white mt-1">
                {simResult.after_forecast_pct}%
              </div>
              <div className="text-[10px] text-slate-500">Projected Run-rate</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0b0f17] border border-slate-800">
              <div className="text-[11px] text-slate-400">Projected Risk Shift</div>
              <div className="text-sm font-bold text-rose-400 mt-1 uppercase">
                {simResult.risk_before} → {simResult.risk_after}
              </div>
              <div className="text-[10px] text-slate-500">{simResult.impact_classification}</div>
            </div>
          </div>
        )}
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept: DepartmentBudget) => (
          <div
            key={dept.department_id}
            className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-100 text-sm">{dept.department_name}</h4>
                <div className="text-[11px] text-slate-500">{dept.department_desc}</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border ${
                dept.risk_level === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                dept.risk_level === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {dept.risk_level} Risk
              </span>
            </div>

            {/* Spent vs Budget */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Spent: <strong>{formatCurrency(dept.spent_amount)}</strong></span>
                <span className="text-slate-400">Budget: <strong>{formatCurrency(dept.total_budget)}</strong></span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full ${
                    dept.utilization_pct > 90 ? 'bg-rose-500' :
                    dept.utilization_pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, dept.utilization_pct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{dept.utilization_pct}% Used</span>
                <span>Remaining: {formatCurrency(dept.remaining_amount)}</span>
              </div>
            </div>

            {/* Predictive Forecast Section */}
            <div className="p-3 rounded-lg bg-[#0b0f17] border border-slate-800/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Projected Full Year</span>
                <span className="font-semibold text-slate-200">{formatCurrency(dept.projected_spend)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Projected Utilization</span>
                <span className={`font-semibold ${dept.projected_utilization_pct > 100 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {dept.projected_utilization_pct}%
                </span>
              </div>
              {dept.potential_overspend > 0 && (
                <div className="text-[10px] text-rose-400 pt-1 border-t border-slate-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Potential Overspend: {formatCurrency(dept.potential_overspend)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
