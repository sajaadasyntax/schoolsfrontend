"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { api, removeToken } from "@/lib/api";
import { clearUser } from "@/lib/auth";
import { getRoleLabel } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "لوحة التحكم",
  "/branches": "الفروع",
  "/students": "الطلاب",
  "/finance/payments": "المدفوعات",
  "/finance/installments": "الأقساط",
  "/finance/receipts": "التحقق من الإيصالات",
  "/finance/expenses": "المصاريف التشغيلية",
  "/finance/salaries": "إدارة الرواتب",
  "/transport": "النقل المدرسي",
  "/inventory": "إدارة المستودع",
  "/reports": "التقارير المالية",
  "/settings/users": "إدارة المستخدمين",
  "/settings": "الإعدادات",
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const title = Object.entries(pageTitles).find(([path]) =>
    path === pathname || pathname.startsWith(path + "/")
  )?.[1] ?? "النظام";

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    removeToken();
    clearUser();
    router.push("/login");
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-700">{user.name}</div>
              <div className="text-gray-400 text-xs">{getRoleLabel(user.role)}</div>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          خروج
        </Button>
      </div>
    </header>
  );
}
