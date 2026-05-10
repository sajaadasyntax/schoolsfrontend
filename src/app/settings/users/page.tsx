"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, User, Branch } from "@/lib/api";
import { getRoleLabel, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["SUPER_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT", "TEACHER", "INVENTORY_MANAGER"];

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "BRANCH_ADMIN", branchId: "" });

  async function load() {
    try {
      const [u, b] = await Promise.all([api.getUsers(), api.getBranches()]);
      setUsers(u);
      setBranches(b);
    } catch {
      toast({ title: "خطأ", description: "تعذر التحميل", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", role: "BRANCH_ADMIN", branchId: "" });
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, branchId: user.branchId || "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editing) {
        const data: Partial<User> & { password?: string } = { name: form.name, email: form.email, role: form.role, branchId: form.branchId || undefined };
        if (form.password) data.password = form.password;
        await api.updateUser(editing.id, data);
        toast({ title: "تم التحديث" });
      } else {
        if (!form.password) { toast({ title: "خطأ", description: "كلمة المرور مطلوبة", variant: "destructive" }); return; }
        await api.createUser({ ...form, branchId: form.branchId || undefined });
        toast({ title: "تم إنشاء المستخدم" });
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف هذا المستخدم؟")) return;
    await api.deleteUser(id);
    toast({ title: "تم الحذف" });
    load();
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">إدارة المستخدمين ({users.length})</h1>
          <Button onClick={openCreate}><Plus className="w-4 h-4 ml-1" /> إضافة مستخدم</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>البريد الإلكتروني</TableHead><TableHead>الدور</TableHead><TableHead>الفرع</TableHead><TableHead>تاريخ الإنشاء</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow>
                  : users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary">{getRoleLabel(u.role)}</Badge></TableCell>
                      <TableCell>{u.branch?.name || "جميع الفروع"}</TableCell>
                      <TableCell>{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "تعديل المستخدم" : "إضافة مستخدم"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>البريد الإلكتروني *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>{editing ? "كلمة مرور جديدة (اتركها فارغة لعدم التغيير)" : "كلمة المرور *"}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><Label>الدور *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الفرع</Label>
              <Select value={form.branchId || "none"} onValueChange={(v) => setForm({ ...form, branchId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="جميع الفروع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">جميع الفروع</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button><Button onClick={handleSave}>{editing ? "حفظ" : "إنشاء"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
