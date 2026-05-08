"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, BranchDetail, Class } from "@/lib/api";
import { getBranchTypeLabel, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [classDialog, setClassDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [classForm, setClassForm] = useState({ name: "", grade: "", academicYear: "2024-2025" });

  async function load() {
    try {
      const data = await api.getBranch(id);
      setBranch(data);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل بيانات الفرع", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleSaveClass() {
    try {
      if (editingClass) {
        await api.updateClass(editingClass.id, classForm);
        toast({ title: "تم تحديث الفصل" });
      } else {
        await api.createClass(id, classForm);
        toast({ title: "تم إنشاء الفصل" });
      }
      setClassDialog(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function handleDeleteClass(classId: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الفصل؟")) return;
    try {
      await api.deleteClass(classId);
      toast({ title: "تم الحذف" });
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div></DashboardLayout>;
  if (!branch) return <DashboardLayout><p className="text-center text-gray-500">الفرع غير موجود</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{branch.name}</h1>
            <Badge variant="secondary">{getBranchTypeLabel(branch.type)}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>الفصول الدراسية ({branch.classes.length})</CardTitle>
              <Button size="sm" onClick={() => { setEditingClass(null); setClassForm({ name: "", grade: "", academicYear: "2024-2025" }); setClassDialog(true); }}>
                <Plus className="w-4 h-4 ml-1" /> إضافة
              </Button>
            </CardHeader>
            <CardContent>
              {branch.classes.length === 0 ? (
                <p className="text-center text-gray-500 py-6">لا توجد فصول</p>
              ) : (
                <div className="space-y-2">
                  {branch.classes.map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{cls.name}</p>
                        <p className="text-sm text-gray-500">
                          {cls.grade && `الصف: ${cls.grade} | `}
                          {cls._count?.students ?? 0} طالب | {cls.academicYear}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClass(cls.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> الموظفون ({branch.employees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {branch.employees.length === 0 ? (
                <p className="text-center text-gray-500 py-6">لا يوجد موظفون</p>
              ) : (
                <div className="space-y-2">
                  {branch.employees.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{emp.fullName}</p>
                        <p className="text-sm text-gray-500">{emp.jobTitle || "موظف"} | تاريخ التعيين: {formatDate(emp.hireDate)}</p>
                      </div>
                      <Badge variant={emp.status === "ACTIVE" ? "default" : "secondary"}>
                        {emp.status === "ACTIVE" ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={classDialog} onOpenChange={setClassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? "تعديل الفصل" : "إضافة فصل جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم الفصل *</Label>
              <Input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
            </div>
            <div>
              <Label>المرحلة الدراسية</Label>
              <Input value={classForm.grade} onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })} />
            </div>
            <div>
              <Label>العام الدراسي</Label>
              <Input value={classForm.academicYear} onChange={(e) => setClassForm({ ...classForm, academicYear: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setClassDialog(false)}>إلغاء</Button>
              <Button onClick={handleSaveClass}>{editingClass ? "حفظ" : "إنشاء"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
