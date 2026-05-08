import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "نظام الإدارة المالية للمؤسسات التعليمية",
  description: "إدارة مالية شاملة للمدارس ورياض الأطفال",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
