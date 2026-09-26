import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Building2, 
  ShieldCheck, 
  Sliders, 
  History, 
  Plus, 
  PieChart, 
  CheckCircle2, 
  Clock,
  Layers
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [tab, setTab] = useState<'departments' | 'policies' | 'rules' | 'audit'>('departments');

  const [departments, setDepartments] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const [policyCat, setPolicyCat] = useState('');
  const [policyLimit, setPolicyLimit] = useState<number | ''>('');
  const [policyDesc, setPolicyDesc] = useState('');

  const [ruleMin, setRuleMin] = useState<number | ''>('');
  const [ruleMax, setRuleMax] = useState<number | ''>('');
  const [ruleRole, setRuleRole] = useState('manager');
  const [ruleOrder, setRuleOrder] = useState<number>(1);

  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptRes, polRes, ruleRes, logRes] = await Promise.all([
        api.getDepartments(),
        api.getPolicies(),
        api.getApprovalRules(),
        api.getAuditLogs(30),
      ]);
      setDepartments(deptRes.departments || []);
      setPolicies(polRes.policies || []);
      setRules(ruleRes.approval_rules || []);
      setAuditLogs(logRes.audit_logs || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName) return;
    try {
      await api.createDepartment({ name: deptName, description: deptDesc });
      setDeptName('');
      setDeptDesc('');
      setMessage('Department created successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyCat || !policyLimit) return;
    try {
      await api.createPolicy({
        category: policyCat,
        max_amount_per_transaction: Number(policyLimit),
        receipt_required: true,
        description: policyDesc,
        is_active: true,
      });
      setPolicyCat('');
      setPolicyLimit('');
      setPolicyDesc('');
      setMessage('Policy created successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ruleMin === '') return;
    try {
      await api.createApprovalRule({
        min_amount: Number(ruleMin),
        max_amount: ruleMax === '' ? null : Number(ruleMax),
        required_role: ruleRole,
        approval_order: Number(ruleOrder),
        is_active: true,
      });
      setRuleMin('');
      setRuleMax('');
      setMessage('Approval rule registered successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
          <Building2 className="w-3.5 h-3.5" />
          Enterprise Configuration Hub
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Admin Controls & Governance</h2>
        <p className="text-xs text-slate-400 mt-1">
          Maintain departments, spending policies, multi-tier approval rules, and inspect immutable audit logs.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {message}
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'departments'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Departments ({departments.length})
        </button>

        <button
          onClick={() => setTab('policies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'policies'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Expense Policies ({policies.length})
        </button>

        <button
          onClick={() => setTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'rules'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Approval Hierarchy ({rules.length})
        </button>

        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'audit'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. DEPARTMENTS */}
      {tab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 font-semibold text-xs text-white uppercase tracking-wider">
              Active Departments
            </div>
            <div className="divide-y divide-slate-800">
              {departments.map((d) => (
                <div key={d.id} className="p-4 hover:bg-slate-800/30 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-slate-100">{d.name}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{d.description || 'No description'}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {d.id.slice(0, 8)}...
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Add Dept Form */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-400" />
              Add Department
            </h3>
            <form onSubmit={handleAddDept} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Legal & Compliance"
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  placeholder="Operational scope..."
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition"
              >
                Create Department
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. POLICIES */}
      {tab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 font-semibold text-xs text-white uppercase tracking-wider">
              Enforced Expense Policies
            </div>
            <div className="divide-y divide-slate-800">
              {policies.map((p) => (
                <div key={p.id} className="p-4 hover:bg-slate-800/30 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      {p.category}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {p.receipt_required ? 'Receipt Required' : 'No Receipt'}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{p.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-sm">
                      {formatCurrency(p.max_amount_per_transaction)}
                    </div>
                    <div className="text-[10px] text-slate-500">Per Transaction Cap</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Policy Form */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-400" />
              Define New Policy
            </h3>
            <form onSubmit={handleAddPolicy} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={policyCat}
                  onChange={(e) => setPolicyCat(e.target.value)}
                  placeholder="e.g. Training & Certifications"
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Max Transaction Limit (₹) *</label>
                <input
                  type="number"
                  required
                  value={policyLimit}
                  onChange={(e) => setPolicyLimit(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="15000"
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Policy Description</label>
                <input
                  type="text"
                  value={policyDesc}
                  onChange={(e) => setPolicyDesc(e.target.value)}
                  placeholder="Rules and guidelines..."
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition"
              >
                Save Policy
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. APPROVAL RULES */}
      {tab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 font-semibold text-xs text-white uppercase tracking-wider">
              Configured Routing Rules
            </div>
            <div className="divide-y divide-slate-800">
              {rules.map((r) => (
                <div key={r.id} className="p-4 hover:bg-slate-800/30 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <span className="uppercase text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/40">
                        {r.required_role}
                      </span>
                      <span>Order Stage: {r.approval_order}</span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-1">
                      Applies from {formatCurrency(r.min_amount)} {r.max_amount ? `to ${formatCurrency(r.max_amount)}` : 'and above'}
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase">Active Rule</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add Rule Form */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-400" />
              Add Approval Rule
            </h3>
            <form onSubmit={handleAddRule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Required Approver Role</label>
                <select
                  value={ruleRole}
                  onChange={(e) => setRuleRole(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="manager">Manager</option>
                  <option value="finance">Finance</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Approval Stage Order</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={ruleOrder}
                  onChange={(e) => setRuleOrder(parseInt(e.target.value))}
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Min Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={ruleMin}
                    onChange={(e) => setRuleMin(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0"
                    className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Max Amount (₹)</label>
                  <input
                    type="number"
                    value={ruleMax}
                    onChange={(e) => setRuleMax(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="No limit"
                    className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition"
              >
                Save Approval Rule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. AUDIT LOGS */}
      {tab === 'audit' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 font-semibold text-xs text-white uppercase tracking-wider flex justify-between items-center">
            <span>System Event Ledger</span>
            <span className="text-[11px] text-slate-500">Immutable Audit Trail</span>
          </div>
          <div className="divide-y divide-slate-800">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-800/30 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span className="text-indigo-400">{log.action.replace(/_/g, ' ')}</span>
                    {log.merchant && (
                      <span className="text-slate-400 font-normal">
                        ({log.merchant} - {formatCurrency(log.amount)})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Triggered by <strong>{log.user_name || 'System Engine'}</strong> ({log.user_role || 'automated'})
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
