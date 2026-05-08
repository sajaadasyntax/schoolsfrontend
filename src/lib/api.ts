import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get("auth_token") || null;
}

export function setToken(token: string) {
  Cookies.set("auth_token", token, { expires: 30, sameSite: "lax" });
}

export function removeToken() {
  Cookies.remove("auth_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "فشل الطلب" }));
    throw new Error(err.error || err.message || "فشل الطلب");
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: UserProfile }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: UserProfile }>("/api/auth/me"),
  logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),

  // Branches
  getBranches: () => request<Branch[]>("/api/branches"),
  createBranch: (data: Partial<Branch>) =>
    request<Branch>("/api/branches", { method: "POST", body: JSON.stringify(data) }),
  updateBranch: (id: string, data: Partial<Branch>) =>
    request<Branch>(`/api/branches/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBranch: (id: string) =>
    request<{ message: string }>(`/api/branches/${id}`, { method: "DELETE" }),
  getBranch: (id: string) => request<BranchDetail>(`/api/branches/${id}`),
  createClass: (branchId: string, data: Partial<Class>) =>
    request<Class>(`/api/branches/${branchId}/classes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateClass: (classId: string, data: Partial<Class>) =>
    request<Class>(`/api/branches/classes/${classId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteClass: (classId: string) =>
    request<{ message: string }>(`/api/branches/classes/${classId}`, { method: "DELETE" }),

  // Students
  getStudents: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<Student[]>(`/api/students${qs}`);
  },
  createStudent: (data: Partial<Student>) =>
    request<Student>("/api/students", { method: "POST", body: JSON.stringify(data) }),
  getStudent: (id: string) => request<StudentDetail>(`/api/students/${id}`),
  updateStudent: (id: string, data: Partial<Student>) =>
    request<Student>(`/api/students/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteStudent: (id: string) =>
    request<{ message: string }>(`/api/students/${id}`, { method: "DELETE" }),
  getStudentFinancialSummary: (id: string) =>
    request<FinancialSummary>(`/api/students/${id}/financial-summary`),

  // Fees
  getFees: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<Fee[]>(`/api/payments/fees${qs}`);
  },
  createFee: (data: Partial<Fee>) =>
    request<Fee>("/api/payments/fees", { method: "POST", body: JSON.stringify(data) }),
  deleteFee: (id: string) =>
    request<{ message: string }>(`/api/payments/fees/${id}`, { method: "DELETE" }),

  // Payments
  getPayments: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<Payment[]>(`/api/payments${qs}`);
  },
  createPayment: (data: FormData) =>
    request<Payment>("/api/payments", { method: "POST", body: data }),
  deletePayment: (id: string) =>
    request<{ message: string }>(`/api/payments/${id}`, { method: "DELETE" }),
  verifyReceipt: (receiptNumber: string) =>
    request<Payment>(`/api/payments/verify/${encodeURIComponent(receiptNumber)}`),
  getRecentReceipts: (limit?: number) =>
    request<Payment[]>(`/api/payments/receipts/recent${limit ? `?limit=${limit}` : ""}`),

  // Installments
  getInstallments: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<Installment[]>(`/api/payments/installments${qs}`);
  },
  createInstallmentsBulk: (studentId: string, installments: Partial<Installment>[]) =>
    request<{ count: number }>("/api/payments/installments/bulk", {
      method: "POST",
      body: JSON.stringify({ studentId, installments }),
    }),
  updateInstallment: (id: string, paidAmount: number) =>
    request<Installment>(`/api/payments/installments/${id}`, {
      method: "PUT",
      body: JSON.stringify({ paidAmount }),
    }),
  markOverdueInstallments: () =>
    request<{ updated: number }>("/api/payments/installments/mark-overdue", { method: "POST" }),

  // Expenses
  getExpenses: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<Expense[]>(`/api/expenses${qs}`);
  },
  createExpense: (data: Partial<Expense>) =>
    request<Expense>("/api/expenses", { method: "POST", body: JSON.stringify(data) }),
  updateExpense: (id: string, data: Partial<Expense>) =>
    request<Expense>(`/api/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExpense: (id: string) =>
    request<{ message: string }>(`/api/expenses/${id}`, { method: "DELETE" }),

  // Employees
  getEmployees: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<Employee[]>(`/api/expenses/employees${qs}`);
  },
  createEmployee: (data: Partial<Employee>) =>
    request<Employee>("/api/expenses/employees", { method: "POST", body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: Partial<Employee>) =>
    request<Employee>(`/api/expenses/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteEmployee: (id: string) =>
    request<{ message: string }>(`/api/expenses/employees/${id}`, { method: "DELETE" }),

  // Salary Payments
  getSalaryPayments: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<SalaryPayment[]>(`/api/expenses/salary-payments${qs}`);
  },
  createSalaryPayment: (data: Partial<SalaryPayment>) =>
    request<SalaryPayment>("/api/expenses/salary-payments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Transport
  getTransport: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<TransportSubscription[]>(`/api/transport${qs}`);
  },
  createTransport: (data: Partial<TransportSubscription>) =>
    request<TransportSubscription>("/api/transport", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTransport: (id: string, data: Partial<TransportSubscription>) =>
    request<TransportSubscription>(`/api/transport/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteTransport: (id: string) =>
    request<{ message: string }>(`/api/transport/${id}`, { method: "DELETE" }),

  // Inventory Categories
  getInventoryCategories: () => request<InventoryCategory[]>("/api/inventory/categories"),
  createInventoryCategory: (data: Partial<InventoryCategory>) =>
    request<InventoryCategory>("/api/inventory/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteInventoryCategory: (id: string) =>
    request<{ message: string }>(`/api/inventory/categories/${id}`, { method: "DELETE" }),

  // Inventory Items
  getInventoryItems: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<InventoryItem[]>(`/api/inventory/items${qs}`);
  },
  getLowStockItems: () => request<InventoryItem[]>("/api/inventory/items/low-stock"),
  createInventoryItem: (data: FormData | Partial<InventoryItem>) => {
    const isFormData = data instanceof FormData;
    return request<InventoryItem>("/api/inventory/items", {
      method: "POST",
      body: isFormData ? data : JSON.stringify(data),
      ...(isFormData ? {} : {}),
    });
  },
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) =>
    request<InventoryItem>(`/api/inventory/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteInventoryItem: (id: string) =>
    request<{ message: string }>(`/api/inventory/items/${id}`, { method: "DELETE" }),

  // Inventory Distributions
  getDistributions: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<InventoryDistribution[]>(`/api/inventory/distributions${qs}`);
  },
  distributeItem: (data: { itemId: string; studentId: string; quantity: number; notes?: string }) =>
    request<InventoryDistribution>("/api/inventory/distribute", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Users
  getUsers: () => request<User[]>("/api/users"),
  createUser: (data: Partial<User> & { password: string }) =>
    request<User>("/api/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<User> & { password?: string }) =>
    request<User>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request<{ message: string }>(`/api/users/${id}`, { method: "DELETE" }),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>("/api/dashboard/stats"),
  getReports: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<ReportData>(`/api/dashboard/reports${qs}`);
  },

  // Fee Templates
  getFeeTemplates: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<ClassFeeTemplate[]>(`/api/fee-templates${qs}`);
  },
  getFeeTemplate: (classId: string, academicYear?: string) => {
    const qs = academicYear ? `?academicYear=${academicYear}` : "";
    return request<ClassFeeTemplate>(`/api/fee-templates/${classId}${qs}`);
  },
  upsertFeeTemplate: (classId: string, data: Partial<ClassFeeTemplate>) =>
    request<ClassFeeTemplate>(`/api/fee-templates/${classId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  applyFeeTemplate: (classId: string, academicYear: string) =>
    request<{ created: number; skipped: number; students: number }>(
      `/api/fee-templates/${classId}/apply`,
      { method: "POST", body: JSON.stringify({ academicYear }) }
    ),

  // Reports (Excel-shaped)
  getClassFeesReport: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<ClassFeesReport>(`/api/reports/class-fees${qs}`);
  },
  getStudentFeesReport: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<StudentFeesReport>(`/api/reports/student-fees${qs}`);
  },
  getSalaryRegisterReport: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<SalaryRegisterReport>(`/api/reports/salary-register${qs}`);
  },
  getExpensesRegisterReport: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<ExpenseRegisterReport>(`/api/reports/expenses-register${qs}`);
  },
};

// --- Types ---
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId?: string;
  branchName?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId?: string;
  branch?: Branch;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  createdAt: string;
  _count?: { students: number; classes: number; employees: number };
}

export interface BranchDetail extends Branch {
  classes: Class[];
  employees: Employee[];
}

export interface Class {
  id: string;
  name: string;
  grade?: string;
  branchId: string;
  teacherId?: string;
  teacher?: { id: string; name: string };
  academicYear: string;
  _count?: { students: number };
}

export interface Student {
  id: string;
  fullName: string;
  parentName?: string;
  parentPhone?: string;
  dateOfBirth?: string;
  gender?: string;
  classId?: string;
  class?: Class;
  branchId: string;
  branch?: Branch;
  enrollmentDate: string;
  status: string;
  notes?: string;
  isOrphan?: boolean;
}

export interface StudentDetail extends Student {
  fees: Fee[];
  payments: Payment[];
  installments: Installment[];
  transportSubscription?: TransportSubscription;
  distributions: InventoryDistribution[];
}

export type FeeBucket =
  | "REGISTRATION"
  | "INSTALLMENT_1"
  | "INSTALLMENT_2"
  | "INSTALLMENT_3"
  | "INSTALLMENT_4"
  | "BOOKS"
  | "UNIFORM"
  | "TRANSPORT"
  | "OTHER";

export interface Fee {
  id: string;
  studentId: string;
  student?: { fullName: string; branch?: Branch };
  type: string;
  bucket: FeeBucket;
  amount: string | number;
  paidAmount: string | number;
  description?: string;
  academicYear: string;
  templateId?: string;
  createdAt: string;
  payments?: { id: string; amount: number; paymentDate: string }[];
}

export interface Payment {
  id: string;
  studentId: string;
  student?: { fullName: string; branch?: Branch };
  feeId?: string;
  fee?: Fee;
  amount: string | number;
  paymentDate: string;
  method: string;
  receiptNumber?: string;
  notes?: string;
  receipt?: Receipt;
  createdAt: string;
}

export interface Receipt {
  id: string;
  paymentId: string;
  imagePath: string;
  originalName: string;
  uploadedAt: string;
}

export interface Installment {
  id: string;
  studentId: string;
  student?: { fullName: string; branch?: Branch };
  amount: string | number;
  dueDate: string;
  paidAmount: string | number;
  status: string;
  notes?: string;
}

export interface TransportSubscription {
  id: string;
  studentId: string;
  student?: { fullName: string; branch?: Branch; class?: Class };
  route?: string;
  monthlyFee: string | number;
  startDate: string;
  endDate?: string;
  status: string;
  notes?: string;
}

export type EmployeeCategory = "TEACHING" | "ADMINISTRATIVE" | "SUPPORT";

export interface Employee {
  id: string;
  fullName: string;
  jobTitle?: string;
  phone?: string;
  email?: string;
  branchId: string;
  branch?: Branch;
  baseSalary: string | number;
  hireDate: string;
  status: string;
  category: EmployeeCategory;
  notes?: string;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  employee?: Employee;
  amount: string | number;
  baseSalary: string | number;
  allowance1: string | number;
  allowance2: string | number;
  transportAllowance: string | number;
  bonus: string | number;
  loan: string | number;
  leaveDeduction: string | number;
  penalty: string | number;
  subscription: string | number;
  otherDeduction: string | number;
  month: number;
  year: number;
  paidDate: string;
  signedAt?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  branchId: string;
  branch?: Branch;
  category: string;
  description?: string;
  amount: string | number;
  date: string;
  notes?: string;
  invoicePath?: string | null;
  invoiceOriginalName?: string | null;
  inventoryItemId?: string | null;
}

export interface InventoryCategory {
  id: string;
  name: string;
  type: string;
  description?: string;
  branchId: string;
  branch?: Branch;
  _count?: { items: number };
}

export interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  category?: InventoryCategory;
  branchId: string;
  branch?: Branch;
  quantity: number;
  minQuantity: number;
  unitPrice?: string | number;
  description?: string;
}

export interface InventoryDistribution {
  id: string;
  itemId: string;
  item?: InventoryItem;
  studentId: string;
  student?: { fullName: string; branch?: Branch };
  quantity: number;
  distributionDate: string;
  notes?: string;
  distributedBy?: { name: string };
}

export interface FinancialSummary {
  totalFees: number;
  totalPaid: number;
  remaining: number;
  totalInstallments: number;
  paidInstallments: number;
  pendingInstallments: number;
}

export interface DashboardStats {
  totalStudents: number;
  totalEmployees: number;
  totalBranches: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstanding: number;
  branches: { id: string; name: string; type: string; studentsCount: number; employeesCount: number; revenue: number; expenses: number }[];
}

export interface ReportData {
  payments: Payment[];
  expenses: Expense[];
  salaries: SalaryPayment[];
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalSalaries: number;
    totalCosts: number;
    netProfit: number;
    totalFees: number;
    outstanding: number;
    totalStudents: number;
  };
}

export interface ClassFeeTemplate {
  id: string;
  classId: string;
  class?: Class & { branch?: Branch };
  academicYear: string;
  registration: string | number;
  installment1: string | number;
  installment2: string | number;
  installment3: string | number;
  installment4: string | number;
  books: string | number;
  uniform: string | number;
  createdAt: string;
}

export interface BucketTotals {
  registration: { due: number; paid: number };
  installment1: { due: number; paid: number };
  installment2: { due: number; paid: number };
  installment3: { due: number; paid: number };
  installment4: { due: number; paid: number };
  books: { due: number; paid: number };
  uniform: { due: number; paid: number };
  other: { due: number; paid: number };
}

export interface ClassFeesReportRow {
  classId: string;
  className: string;
  branchName: string;
  studentCount: number;
  totalDue: number;
  totalPaid: number;
  remaining: number;
  buckets: BucketTotals;
}

export interface ClassFeesReport {
  rows: ClassFeesReportRow[];
  totals: { totalDue: number; totalPaid: number; remaining: number; buckets: BucketTotals };
}

export interface StudentFeesReportRow {
  index: number;
  studentId: string;
  fullName: string;
  className: string;
  branchName: string;
  isOrphan: boolean;
  notes: string;
  totalDue: number;
  totalPaid: number;
  remaining: number;
  buckets: Record<string, { due: number; paid: number }>;
}

export interface StudentFeesReport {
  rows: StudentFeesReportRow[];
  totals: { totalDue: number; totalPaid: number; remaining: number; buckets: Record<string, { due: number; paid: number }> };
}

export interface SalaryRegisterRow {
  index: number;
  id: string;
  employeeId: string;
  fullName: string;
  jobTitle: string;
  category: EmployeeCategory;
  branchName: string;
  baseSalary: number;
  allowance1: number;
  allowance2: number;
  transportAllowance: number;
  bonus: number;
  totalEarnings: number;
  loan: number;
  leaveDeduction: number;
  penalty: number;
  subscription: number;
  otherDeduction: number;
  totalDeductions: number;
  netSalary: number;
  month: number;
  year: number;
  paidDate: string;
  signedAt?: string;
  notes?: string;
}

export interface SalaryRegisterTotals {
  baseSalary: number;
  allowance1: number;
  allowance2: number;
  transportAllowance: number;
  bonus: number;
  totalEarnings: number;
  loan: number;
  leaveDeduction: number;
  penalty: number;
  subscription: number;
  otherDeduction: number;
  totalDeductions: number;
  netSalary: number;
}

export interface SalaryRegisterReport {
  teaching: SalaryRegisterRow[];
  staff: SalaryRegisterRow[];
  teachingTotals: SalaryRegisterTotals;
  staffTotals: SalaryRegisterTotals;
  grandTotal: SalaryRegisterTotals;
}

export interface ExpenseRegisterMonth {
  month: number;
  year: number;
  total: number;
  items: Expense[];
}

export interface ExpenseRegisterReport {
  months: ExpenseRegisterMonth[];
  grandTotal: number;
}
