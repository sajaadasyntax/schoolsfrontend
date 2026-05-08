"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, Settings2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/settings/users">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  إدارة المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">إضافة وتعديل وحذف مستخدمي النظام وتحديد صلاحياتهم</p>
              </CardContent>
            </Card>
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-gray-600" />
                إعدادات عامة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">إعدادات النظام العامة (قريباً)</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
