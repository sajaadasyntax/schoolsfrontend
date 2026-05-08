"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  CreditCard,
  Calendar,
  Receipt,
  DollarSign,
  UserCheck,
  Bus,
  Package,
  BarChart3,
  Settings,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const allMenuItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/branches", label: "الفروع", icon: Building2, roles: ["SUPER_ADMIN"] },
  { href: "/students", label: "الطلاب", icon: GraduationCap, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT", "TEACHER"] },
  { href: "/finance/payments", label: "المدفوعات", icon: CreditCard, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/finance/installments", label: "الأقساط", icon: Calendar, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/finance/receipts", label: "الإيصالات", icon: Receipt, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/finance/expenses", label: "المصاريف", icon: DollarSign, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/finance/salaries", label: "الرواتب", icon: UserCheck, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/finance/fee-templates", label: "قوالب الرسوم", icon: ClipboardList, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/transport", label: "النقل المدرسي", icon: Bus, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/inventory", label: "المستودع", icon: Package, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "INVENTORY_MANAGER"] },
  { href: "/reports", label: "التقارير", icon: BarChart3, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/settings/users", label: "المستخدمون", icon: Users, roles: ["SUPER_ADMIN"] },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["SUPER_ADMIN", "BRANCH_ADMIN"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || "";

  const menuItems = allMenuItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white leading-tight">
          نظام الإدارة المالية
        </h1>
        <p className="text-xs text-gray-400 mt-1">للمؤسسات التعليمية</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 text-center">
          © 2025 جميع الحقوق محفوظة
        </div>
      </div>
    </aside>
  );
}
