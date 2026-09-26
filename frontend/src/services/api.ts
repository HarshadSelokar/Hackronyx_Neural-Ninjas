const API_BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function removeToken() {
  localStorage.removeItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    let errorDetail = 'API Request Failed';
    try {
      const err = await res.json();
      errorDetail = err.detail || JSON.stringify(err);
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<any>('/auth/me'),
  getDemoUsers: () => request<any>('/auth/demo-users'),

  // Dashboard
  getDashboard: () => request<any>('/dashboard'),

  // Expenses
  getExpenses: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/expenses${qs}`);
  },
  getExpenseDetail: (id: string) => request<any>(`/expenses/${id}`),
  createExpense: (data: any) =>
    request<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  extractReceipt: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/expenses/extract-receipt', {
      method: 'POST',
      body: formData,
    });
  },
  simulateExpense: (id: string) =>
    request<any>(`/expenses/${id}/simulate`, { method: 'POST' }),

  // Approvals
  getApprovals: () => request<any>('/approvals'),
  actOnApproval: (approvalId: string, action: 'approve' | 'reject' | 'escalate', comment?: string) =>
    request<any>(`/approvals/${approvalId}/act`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    }),

  // Budgets
  getBudgets: (fiscalYear: number = 2026) =>
    request<any>(`/budgets?fiscal_year=${fiscalYear}`),
  simulateBudget: (departmentId: string, amount: number) =>
    request<any>('/budgets/simulate', {
      method: 'POST',
      body: JSON.stringify({ department_id: departmentId, amount }),
    }),

  // Admin
  getDepartments: () => request<any>('/admin/departments'),
  createDepartment: (data: any) =>
    request<any>('/admin/departments', { method: 'POST', body: JSON.stringify(data) }),
  createBudget: (data: any) =>
    request<any>('/admin/budgets', { method: 'POST', body: JSON.stringify(data) }),
  getPolicies: () => request<any>('/admin/policies'),
  createPolicy: (data: any) =>
    request<any>('/admin/policies', { method: 'POST', body: JSON.stringify(data) }),
  getApprovalRules: () => request<any>('/admin/approval-rules'),
  createApprovalRule: (data: any) =>
    request<any>('/admin/approval-rules', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: (limit: number = 50) =>
    request<any>(`/admin/audit-logs?limit=${limit}`),

  // Copilot
  queryCopilot: (query: string) =>
    request<any>('/copilot/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
};
