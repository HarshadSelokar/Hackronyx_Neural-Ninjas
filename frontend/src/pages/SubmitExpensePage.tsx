import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Info
} from 'lucide-react';

export const SubmitExpensePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState('Travel');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [receiptPath, setReceiptPath] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [policyLimits, setPolicyLimits] = useState<Record<string, number>>({});
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    'Travel', 'Accommodation', 'Food', 'Office Supplies', 'Cloud Infrastructure', 'Other'
  ]);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const res = await api.getPolicies();
        if (res.policies && res.policies.length > 0) {
          const limits: Record<string, number> = {};
          const cats: string[] = [];
          res.policies.forEach((p: any) => {
            if (p.is_active) {
              limits[p.category] = Number(p.max_amount_per_transaction);
              cats.push(p.category);
            }
          });
          setPolicyLimits(limits);
          if (cats.length > 0) {
            setAvailableCategories(cats);
          }
        }
      } catch (err) {
        console.error('Failed to load database policies:', err);
      }
    }
    loadPolicies();
  }, []);

  const currentLimit = policyLimits[category];
  const isOverPolicy = typeof amount === 'number' && currentLimit && amount > currentLimit;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await api.extractReceipt(file);
      setExtractedData(res);
      setMerchant(res.merchant || '');
      setAmount(res.amount || '');
      setCategory(res.category || 'Travel');
      setExpenseDate(res.expense_date || new Date().toISOString().split('T')[0]);
      setInvoiceNumber(res.invoice_number || '');
      setDescription(res.description || '');
      setReceiptPath(res.receipt_path || '');
    } catch (err: any) {
      setError(err.message || 'Receipt extraction failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Please specify a valid expense amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.createExpense({
        merchant,
        amount: Number(amount),
        category,
        expense_date: expenseDate,
        invoice_number: invoiceNumber,
        description,
        receipt_path: receiptPath || `receipts/${Date.now()}.pdf`,
        department_id: user?.department_id,
      });
      navigate(`/expenses/${res.expense.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Autonomous Financial Verification
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Submit New Expense</h2>
        <p className="text-sm text-slate-400 mt-1">
          Upload your tax invoice or receipt. The AI engine extracts line-items and validates against corporate policy before submission.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receipt Upload Box */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              1. Receipt / Tax Invoice
            </h3>

            <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-[#0b0f17]/50 group">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div className="text-xs font-medium text-slate-200">
                {uploading ? 'Scanning receipt...' : 'Click or drag receipt'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                PNG, JPG or PDF up to 10MB
              </div>
            </label>

            {/* Extracted AI Badge */}
            {extractedData && (
              <div className="mt-4 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI OCR Extracted Successfully
                </div>
                <div className="text-[11px] text-slate-300">
                  Extracted <strong>{extractedData.merchant}</strong> • ₹{extractedData.amount?.toLocaleString('en-IN')}
                </div>
                {extractedData.tax_amount && (
                  <div className="text-[10px] text-emerald-400/80">
                    Includes GST/Tax estimation: ₹{extractedData.tax_amount?.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Policy Guidelines */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-sm text-xs">
            <div className="font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Active Policy Thresholds
            </div>
            <div className="space-y-1.5">
              {Object.entries(policyLimits).length > 0 ? (
                Object.entries(policyLimits).map(([catName, limitVal]) => (
                  <div key={catName} className="p-2 rounded bg-slate-800/40 border border-slate-800 flex items-center justify-between text-slate-300">
                    <span>{catName}</span>
                    <span className="text-emerald-400 font-medium">Up to ₹{limitVal.toLocaleString('en-IN')}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 py-2">Loading active corporate policies...</div>
              )}
            </div>
          </div>
        </div>

        {/* Expense Form */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
            2. Verified Expense Details
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Merchant / Vendor *
                </label>
                <input
                  type="text"
                  required
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. AWS, Marriott, IndiGo"
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount (INR ₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Live Policy Feedback Warning */}
            {isOverPolicy && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>Policy Threshold Alert:</strong> Exceeds {category} cap of ₹{currentLimit?.toLocaleString('en-IN')} by ₹{((amount as number) - currentLimit).toLocaleString('en-IN')}.
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">
                  Manager Review
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c} {policyLimits[c] ? `(Cap: ₹${policyLimits[c].toLocaleString('en-IN')})` : ''}
                    </option>
                  ))}
                  {!availableCategories.includes('Other') && <option value="Other">Other</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expense Date *
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Invoice / Bill Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-99214"
                className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Business Description & Justification
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe business purpose, client involved, or sprint objective..."
                className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Submit for AI Verification <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
