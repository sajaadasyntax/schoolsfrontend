"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  CreditCard,
  DollarSign,
  UserCheck,
  Bus,
  Package,
  BarChart3,
  Settings,
  ClipboardList,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const allMenuItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/branches", label: "الفروع", icon: Building2, roles: ["SUPER_ADMIN"] },
  { href: "/students", label: "الطلاب", icon: GraduationCap, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT", "TEACHER"] },
  { href: "/finance/payments", label: "المدفوعات", icon: CreditCard, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/finance/expenses", label: "المصاريف", icon: DollarSign, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/finance/salaries", label: "الرواتب", icon: UserCheck, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/finance/fee-templates", label: "قوالب الرسوم", icon: ClipboardList, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/transport", label: "النقل المدرسي", icon: Bus, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/inventory", label: "المستودع", icon: Package, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "INVENTORY_MANAGER"] },
  { href: "/reports", label: "التقارير", icon: BarChart3, roles: ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"] },
  { href: "/settings/users", label: "المستخدمون", icon: Users, roles: ["SUPER_ADMIN"] },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["SUPER_ADMIN", "BRANCH_ADMIN"] },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || "";

  const menuItems = allMenuItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={cn(
        "fixed top-0 right-0 z-40 w-64 h-screen bg-gray-900 text-white flex flex-col",
        "transform transition-transform duration-300",
        "md:static md:translate-x-0 md:z-auto md:h-auto md:min-h-screen",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Logo + title */}
      <div className="p-4 border-b border-gray-700 flex items-center gap-3">
        <img
          src="/logo.png"
          alt="شعار المؤسسة"
          className="w-10 h-10 rounded-full bg-white object-contain p-0.5 flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold leading-tight truncate">نظام الإدارة المالية</h1>
          <p className="text-xs text-gray-400 mt-0.5 truncate">للمؤسسات التعليمية</p>
        </div>
        {/* Close button — visible on mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
          aria-label="إغلاق القائمة"
        >
          <X className="w-5 h-5" />
        </button>
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
                  onClick={onClose}
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
