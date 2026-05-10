"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, TransportSubscription, Student } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ToggleLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TransportPage() {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<TransportSubscription[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ studentId: "", route: "", monthlyFee: "", startDate: "" });

  async function load() {
    try {
      const [s, sts] = await Promise.all([api.getTransport(), api.getStudents({ status: "ACTIVE" })]);
      setSubscriptions(s);
      setStudents(sts);
    } catch {
      toast({ title: "خطأ", description: "تعذر التحميل", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    try {
      await api.createTransport(form);
      toast({ title: "تم إضافة الاشتراك" });
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function handleToggle(sub: TransportSubscription) {
    const newStatus = sub.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await api.updateTransport(sub.id, { status: newStatus });
    toast({ title: `تم ${newStatus === "ACTIVE" ? "تفعيل" : "تعليق"} الاشتراك` });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف هذا الاشتراك؟")) return;
    await api.deleteTransport(id);
    toast({ title: "تم الحذف" });
    load();
  }

  const statusVariants: Record<string, "default" | "secondary" | "destructive"> = { ACTIVE: "default", SUSPENDED: "destructive", INACTIVE: "secondary" };
  const statusLabels: Record<string, string> = { ACTIVE: "نشط", SUSPENDED: "معلق", INACTIVE: "غير نشط" };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">النقل المدرسي ({subscriptions.length})</h1>
          <Button onClick={() => { setForm({ studentId: "", route: "", monthlyFee: "", startDate: "" }); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 ml-1" /> إضافة اشتراك
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>الطالب</TableHead><TableHead>الفصل</TableHead><TableHead>المسار</TableHead><TableHead>الرسوم الشهرية</TableHead><TableHead>تاريخ البدء</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow>
                  : subscriptions.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">لا توجد اشتراكات</TableCell></TableRow>
                    : subscriptions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.student?.fullName}</TableCell>
                        <TableCell>{s.student?.class?.name || "-"}</TableCell>
                        <TableCell>{s.route || "-"}</TableCell>
                        <TableCell>{formatCurrency(Number(s.monthlyFee))}</TableCell>
                        <TableCell>{formatDate(s.startDate)}</TableCell>
                        <TableCell><Badge variant={statusVariants[s.status]}>{statusLabels[s.status]}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleToggle(s)}><ToggleLeft className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
          <DialogHeader><DialogTitle>إضافة اشتراك نقل</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الطالب *</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName} - {s.branch?.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>المسار</Label><Input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} /></div>
            <div><Label>الرسوم الشهرية *</Label><Input type="number" value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} /></div>
            <div><Label>تاريخ البدء</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button><Button onClick={handleCreate}>إضافة</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
