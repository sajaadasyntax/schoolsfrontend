"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, apiBaseUrl, Expense, Branch } from "@/lib/api";
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ExpensesPage() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ branchId: "", category: "", description: "", amount: "", date: "", notes: "" });

  async function load() {
    try {
      const params: Record<string, string> = {};
      if (filterCategory !== "ALL") params.category = filterCategory;
      const [e, b] = await Promise.all([api.getExpenses(params), api.getBranches()]);
      setExpenses(e);
      setBranches(b);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل المصاريف", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterCategory]);

  function requestCreate() {
    if (!form.category || !form.amount) {
      toast({ title: "خطأ", description: "الفئة والمبلغ مطلوبان", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      await api.createExpense(form);
      toast({ title: "تم إضافة المصروف" });
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف هذا المصروف؟")) return;
    await api.deleteExpense(id);
    toast({ title: "تم الحذف" });
    load();
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">المصاريف التشغيلية</h1>
          <div className="flex items-center gap-3">
            <span className="text-red-600 font-bold">{formatCurrency(total)}</span>
            <Button onClick={() => { setForm({ branchId: "", category: "", description: "", amount: "", date: "", notes: "" }); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 ml-1" /> إضافة مصروف
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48"><SelectValue placeholder="الفئة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">الكل</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفرع</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الفاتورة</TableHead>
                  <TableHead>حذف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">لا توجد مصاريف</TableCell></TableRow>
                ) : expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.branch?.name}</TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell>{e.description || "-"}</TableCell>
                    <TableCell className="text-red-600 font-medium">{formatCurrency(Number(e.amount))}</TableCell>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell>
                      {e.invoicePath ? (
                        <a
                          href={`${apiBaseUrl}${e.invoicePath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                          title={e.invoiceOriginalName || "عرض الفاتورة"}
                        >
                          <FileText className="w-4 h-4" />
                          عرض
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة مصروف</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الفرع *</Label>
              <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الفئة *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>المبلغ *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button><Button onClick={requestCreate} disabled={submitting}>إضافة</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إضافة المصروف</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد إضافة مصروف بقيمة {form.amount} — {form.category}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreate} disabled={submitting}>
              {submitting ? "جارٍ..." : "تأكيد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
