export type Role = 'employee' | 'manager' | 'finance' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  employee_code?: string;
  role: Role;
  department_id?: string;
  department_name?: string;
}

export interface Expense {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  department_id: string;
  department_name?: string;
  amount: number;
  currency: string;
  category: string;
  merchant?: string;
  expense_date: string;
  description?: string;
  invoice_number?: string;
  receipt_path?: string;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'reimbursed';
  policy_status: 'pending' | 'compliant' | 'violation' | 'not_applicable';
  risk_level?: 'low' | 'medium' | 'high';
  ai_recommendation?: string;
  ai_summary?: string;
  ai_analysis?: {
    category: string;
    confidence: number;
    policy_compliant: boolean;
    duplicate_detected: boolean;
    anomaly: boolean;
    budget_impact: string;
    recommendation: string;
    reasons: string[];
    details?: any;
  };
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseApproval {
  id: string;
  expense_id: string;
  approver_id: string;
  approver_name?: string;
  approver_role?: string;
  approval_order: number;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comment?: string;
  acted_at?: string;
  created_at: string;
}

export interface DepartmentBudget {
  budget_id: string;
  department_id: string;
  department_name: string;
  department_desc?: string;
  fiscal_year: number;
  total_budget: number;
  spent_amount: number;
  pending_amount: number;
  remaining_amount: number;
  utilization_pct: number;
  pending_utilization_pct: number;
  monthly_run_rate: number;
  projected_spend: number;
  projected_utilization_pct: number;
  potential_overspend: number;
  risk_level: 'low' | 'medium' | 'high';
  total_expenses_count: number;
}

export interface ExpensePolicy {
  id: string;
  category: string;
  max_amount_per_transaction?: number;
  max_amount_per_day?: number;
  receipt_required: boolean;
  description?: string;
  is_active: boolean;
}

export interface ApprovalRule {
  id: string;
  min_amount: number;
  max_amount?: number;
  required_role: string;
  approval_order: number;
  is_active: boolean;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  expense_id?: string;
  merchant?: string;
  amount?: number;
  action: string;
  old_value?: any;
  new_value?: any;
  created_at: string;
}
