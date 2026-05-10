"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Branch } from "@/lib/api";
import { getBranchTypeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Pencil, Trash2, Users, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function BranchesPage() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: "", type: "SCHOOL", address: "", phone: "" });

  async function load() {
    try {
      const data = await api.getBranches();
      setBranches(data);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل الفروع", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", type: "SCHOOL", address: "", phone: "" });
    setDialogOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setForm({ name: branch.name, type: branch.type, address: branch.address || "", phone: branch.phone || "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editing) {
        await api.updateBranch(editing.id, form);
        toast({ title: "تم التحديث" });
      } else {
        await api.createBranch(form);
        toast({ title: "تم إنشاء الفرع" });
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الفرع؟")) return;
    try {
      await api.deleteBranch(id);
      toast({ title: "تم الحذف" });
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">الفروع والمدارس</h1>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> إضافة فرع
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <Card key={branch.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{branch.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {getBranchTypeLabel(branch.type)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(branch)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(branch.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {branch.address && <p className="text-sm text-gray-500 mb-2">{branch.address}</p>}
                  {branch.phone && <p className="text-sm text-gray-500 mb-3">{branch.phone}</p>}
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <GraduationCap className="w-4 h-4" /> {branch._count?.students ?? 0} طالب
                    </span>
                    <span className="flex items-center gap-1 text-gray-600">
                      <Users className="w-4 h-4" /> {branch._count?.employees ?? 0} موظف
                    </span>
                  </div>
                  <Link href={`/branches/${branch.id}`} className="mt-3 block">
                    <Button variant="outline" size="sm" className="w-full">عرض التفاصيل</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
            {branches.length === 0 && (
              <p className="text-center text-gray-500 col-span-3 py-12">لا توجد فروع</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الفرع" : "إضافة فرع جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم الفرع *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHOOL">مدرسة</SelectItem>
                  <SelectItem value="KINDERGARTEN">روضة أطفال</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave}>{editing ? "حفظ التغييرات" : "إنشاء"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
