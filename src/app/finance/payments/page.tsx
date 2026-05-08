"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Payment, Student, Fee } from "@/lib/api";
import { formatCurrency, formatDate, getPaymentMethodLabel, getFeeBucketLabel, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const methodColors: Record<string, string> = { CASH: "default", BANK_TRANSFER: "secondary", CHECK: "outline" };

type PaymentForm = {
  studentId: string;
  feeId: string;
  amount: string;
  paymentDate: string;
  method: string;
  receiptNumber: string;
  notes: string;
};

const emptyForm = (): PaymentForm => ({
  studentId: "",
  feeId: "",
  amount: "",
  paymentDate: new Date().toISOString().slice(0, 10),
  method: "CASH",
  receiptNumber: "",
  notes: "",
});

export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState("ALL");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState<PaymentForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  // Student search state
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFees, setStudentFees] = useState<Fee[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  async function load() {
    try {
      const params: Record<string, string> = {};
      if (filterMethod !== "ALL") params.method = filterMethod;
      const data = await api.getPayments(params);
      setPayments(data);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل المدفوعات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterMethod]);

  async function searchStudents() {
    if (!studentSearch.trim()) return;
    setSearchLoading(true);
    try {
      const results = await api.getStudents({ search: studentSearch });
      setStudentResults(results.slice(0, 10));
    } catch {
      toast({ title: "خطأ", description: "تعذر البحث", variant: "destructive" });
    } finally {
      setSearchLoading(false);
    }
  }

  async function selectStudent(student: Student) {
    setSelectedStudent(student);
    setForm((prev) => ({ ...prev, studentId: student.id, feeId: "" }));
    setStudentResults([]);
    setStudentSearch(student.fullName);
    // Load outstanding fees
    try {
      const fees = await api.getFees({ studentId: student.id });
      setStudentFees(fees.filter((f) => Number(f.paidAmount) < Number(f.amount)));
    } catch {
      setStudentFees([]);
    }
  }

  function selectFee(feeId: string) {
    const fee = studentFees.find((f) => f.id === feeId);
    setForm((prev) => ({
      ...prev,
      feeId,
      amount: fee ? String(Number(fee.amount) - Number(fee.paidAmount)) : prev.amount,
    }));
  }

  async function handleSubmit() {
    if (!form.studentId || !form.amount) {
      toast({ title: "خطأ", description: "الطالب والمبلغ مطلوبان", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("studentId", form.studentId);
      fd.append("amount", form.amount);
      fd.append("paymentDate", form.paymentDate);
      fd.append("method", form.method);
      if (form.feeId) fd.append("feeId", form.feeId);
      if (form.receiptNumber) fd.append("receiptNumber", form.receiptNumber);
      if (form.notes) fd.append("notes", form.notes);
      await api.createPayment(fd);
      toast({ title: "تم تسجيل الدفعة" });
      setDialog(false);
      setForm(emptyForm());
      setSelectedStudent(null);
      setStudentSearch("");
      setStudentFees([]);
      load();
    } catch (e: unknown) {
      toast({ title: "خطأ", description: e instanceof Error ? e.message : "حدث خطأ", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف هذه الدفعة؟")) return;
    try {
      await api.deletePayment(id);
      toast({ title: "تم الحذف" });
      load();
    } catch {
      toast({ title: "خطأ", description: "تعذر الحذف", variant: "destructive" });
    }
  }

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">المدفوعات ({payments.length})</h1>
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold text-green-600">{formatCurrency(total)}</div>
            <Button size="sm" onClick={() => { setForm(emptyForm()); setSelectedStudent(null); setStudentSearch(""); setStudentFees([]); setDialog(true); }}>
              <Plus className="w-4 h-4 ml-1" /> دفعة جديدة
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4">
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-40"><SelectValue placeholder="طريقة الدفع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">الكل</SelectItem>
                <SelectItem value="CASH">نقداً</SelectItem>
                <SelectItem value="BANK_TRANSFER">تحويل بنكي</SelectItem>
                <SelectItem value="CHECK">شيك</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الفرع</TableHead>
                  <TableHead>البند</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الطريقة</TableHead>
                  <TableHead>رقم الإيصال</TableHead>
                  <TableHead>حذف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow>
                ) : payments.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">لا توجد مدفوعات</TableCell></TableRow>
                ) : payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.student?.fullName}</TableCell>
                    <TableCell>{p.student?.branch?.name || "-"}</TableCell>
                    <TableCell>
                      {p.fee ? (
                        <Badge variant="outline" className="text-xs">{getFeeBucketLabel(p.fee.bucket)}</Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">{formatCurrency(Number(p.amount))}</TableCell>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell>
                      <Badge variant={methodColors[p.method] as "default" | "secondary" | "outline"}>
                        {getPaymentMethodLabel(p.method)}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.receiptNumber || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Add Payment Dialog ── */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تسجيل دفعة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Student Search */}
            <div>
              <Label>الطالب *</Label>
              <div className="flex gap-2">
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchStudents()}
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                />
                <Button variant="outline" size="sm" onClick={searchStudents} disabled={searchLoading}>
                  {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "بحث"}
                </Button>
              </div>
              {studentResults.length > 0 && (
                <div className="border rounded-md mt-1 max-h-40 overflow-y-auto bg-white shadow-sm">
                  {studentResults.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-right px-3 py-2 hover:bg-gray-50 text-sm"
                      onClick={() => selectStudent(s)}
                    >
                      {s.fullName} — {s.class?.name || "بدون فصل"}
                    </button>
                  ))}
                </div>
              )}
              {selectedStudent && (
                <div className="text-sm text-green-700 mt-1">
                  ✓ {selectedStudent.fullName} — {selectedStudent.class?.name || "بدون فصل"}
                </div>
              )}
            </div>

            {/* Fee Bucket selector */}
            {studentFees.length > 0 && (
              <div>
                <Label>البند (الرسوم المستحقة)</Label>
                <Select value={form.feeId} onValueChange={selectFee}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البند — اختياري" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون تحديد بند</SelectItem>
                    {studentFees.map((fee) => (
                      <SelectItem key={fee.id} value={fee.id}>
                        {getFeeBucketLabel(fee.bucket)} — متبقي: {formatNumber(Number(fee.amount) - Number(fee.paidAmount))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.feeId && (
                  <p className="text-xs text-gray-500 mt-1">
                    سيتم تحديث رصيد البند تلقائياً عند الحفظ.
                  </p>
                )}
              </div>
            )}

            {selectedStudent && studentFees.length === 0 && (
              <p className="text-sm text-amber-600">لا توجد رسوم مستحقة لهذا الطالب.</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المبلغ *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>طريقة الدفع</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">نقداً</SelectItem>
                    <SelectItem value="BANK_TRANSFER">تحويل بنكي</SelectItem>
                    <SelectItem value="CHECK">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رقم الإيصال</Label>
                <Input
                  value={form.receiptNumber}
                  onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
                  placeholder="اختياري"
                />
              </div>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="اختياري"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin ml-1" /> : null}
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
