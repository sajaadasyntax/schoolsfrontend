import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0 ج.س";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return (
    new Intl.NumberFormat("ar-SD", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num) + " ج.س"
  );
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function getInstallmentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "معلق",
    PARTIAL: "مدفوع جزئياً",
    PAID: "مدفوع",
    OVERDUE: "متأخر",
  };
  return labels[status] ?? status;
}

export function getFeeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    TUITION: "رسوم دراسية",
    TRANSPORT: "رسوم نقل",
    OTHER: "أخرى",
  };
  return labels[type] ?? type;
}

export function getFeeBucketLabel(bucket: string): string {
  const labels: Record<string, string> = {
    REGISTRATION: "التسجيل",
    INSTALLMENT_1: "القسط الأول",
    INSTALLMENT_2: "القسط الثاني",
    INSTALLMENT_3: "القسط الثالث",
    INSTALLMENT_4: "القسط الرابع",
    BOOKS: "كتب",
    UNIFORM: "زي",
    TRANSPORT: "نقل",
    OTHER: "أخرى",
  };
  return labels[bucket] ?? bucket;
}

export function getEmployeeCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    TEACHING: "تدريسي",
    ADMINISTRATIVE: "إداري",
    SUPPORT: "دعم",
  };
  return labels[category] ?? category;
}

export function formatNumber(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("ar-SA").format(num);
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: "نقداً",
    BANK_TRANSFER: "تحويل بنكي",
    CHECK: "شيك",
  };
  return labels[method] ?? method;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "مدير عام",
    BRANCH_ADMIN: "مدير فرع",
    ACCOUNTANT: "محاسب",
    TEACHER: "معلم",
    INVENTORY_MANAGER: "مسؤول مستودع",
  };
  return labels[role] ?? role;
}

export function getBranchTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SCHOOL: "مدرسة",
    KINDERGARTEN: "روضة أطفال",
  };
  return labels[type] ?? type;
}

export function getStudentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "نشط",
    INACTIVE: "غير نشط",
    GRADUATED: "متخرج",
  };
  return labels[status] ?? status;
}

export function getInventoryCategoryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    TEXTBOOK: "كتب مدرسية",
    UNIFORM: "زي مدرسي",
    CUSTOM: "مخصص",
  };
  return labels[type] ?? type;
}

export const EXPENSE_CATEGORIES = [
  "رواتب",
  "صيانة",
  "فواتير",
  "مستلزمات",
  "إيجار",
  "تسويق",
  "نقل",
  "أخرى",
];

export const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export function isOverdue(dueDate: Date | string): boolean {
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return d < new Date();
}
