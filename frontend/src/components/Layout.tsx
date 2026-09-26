import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Receipt, 
  PlusCircle, 
  CheckSquare, 
  PieChart, 
  Bot, 
  ShieldCheck, 
  LogOut, 
  Building2,
  TrendingUp,
  FileCheck
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadgeColors: Record<string, string> = {
    employee: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
    manager: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
    finance: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
    admin: 'bg-purple-900/60 text-purple-300 border-purple-700/50',
  };

  return (
    <div className="flex h-screen bg-[#0b0f17] text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Brand */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                FINCONTROL <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">AI</span>
              </div>
              <div className="text-[11px] text-slate-400">Expense & Budget OS</div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-5 space-y-1">
            <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Navigation
            </div>

            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </NavLink>

            <NavLink
              to="/expenses"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Receipt className="w-4 h-4" />
              {user?.role === 'employee' ? 'My Expenses' : 'All Expenses'}
            </NavLink>

            {/* Employee quick submit */}
            {user?.role === 'employee' && (
              <NavLink
                to="/submit-expense"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <PlusCircle className="w-4 h-4" />
                Submit Expense
              </NavLink>
            )}

            {/* Manager / Finance / Admin Approval Queue */}
            {['manager', 'finance', 'admin'].includes(user?.role || '') && (
              <NavLink
                to="/approvals"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <CheckSquare className="w-4 h-4" />
                Approval Queue
              </NavLink>
            )}

            {/* Budgets */}
            {['manager', 'finance', 'admin'].includes(user?.role || '') && (
              <NavLink
                to="/budgets"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <PieChart className="w-4 h-4" />
                Budgets & Forecast
              </NavLink>
            )}

            {/* Finance Copilot */}
            {['finance', 'admin', 'manager'].includes(user?.role || '') && (
              <NavLink
                to="/copilot"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Bot className="w-4 h-4 text-emerald-400" />
                Finance Copilot
              </NavLink>
            )}

            {/* Admin Center */}
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Building2 className="w-4 h-4" />
                Admin Controls
              </NavLink>
            )}
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0b1329]/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-200 truncate">{user?.full_name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">{user?.department_name || 'Organization'}</span>
            <span className={`px-2 py-0.5 rounded-full font-medium border uppercase tracking-wider text-[10px] ${roleBadgeColors[user?.role || 'employee']}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-[#0f172a]/90 backdrop-blur border-b border-slate-800 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-white tracking-tight">
              Intelligent Financial Governance
            </h1>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              Live Supabase DB
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user?.role === 'employee' && (
              <button
                onClick={() => navigate('/submit-expense')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/30 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Submit New Expense
              </button>
            )}
            <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1 rounded-md border border-slate-700/50">
              FY 2026 Active
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#0b0f17]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
