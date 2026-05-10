"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, User, Menu } from "lucide-react";
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

interface HeaderProps {
  onOpenSidebar: () => void;
}

export default function Header({ onOpenSidebar }: HeaderProps) {
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
    <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-1.5 rounded text-gray-600 hover:bg-gray-100"
          aria-label="فتح القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-base md:text-lg font-semibold text-gray-800 truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm hidden sm:block">
              <div className="font-medium text-gray-700 leading-tight">{user.name}</div>
              <div className="text-gray-400 text-xs">{getRoleLabel(user.role)}</div>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">خروج</span>
        </Button>
      </div>
    </header>
  );
}
