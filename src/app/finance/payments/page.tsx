"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, apiBaseUrl, Payment, Student, Fee } from "@/lib/api";
import { formatCurrency, formatDate, getPaymentMethodLabel, getFeeBucketLabel, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, RefreshCw, Upload, Search, ExternalLink, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const methodColors: Record<string, string> = {
  CASH: "default",
  BANK_TRANSFER: "secondary",
  CHECK: "outline",
};

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
  const [tab, setTab] = useState("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState("ALL");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState<PaymentForm>(emptyForm());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFees, setStudentFees] = useState<Fee[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Receipts tab
  const [receipts, setReceipts] = useState<Payment[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [searchNumber, setSearchNumber] = useState("");
  const [searchResult, setSearchResult] = useState<Payment | null | "not-found">(null);
  const [searching, setSearching] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "receipts") setTab("receipts");
    }
  }, []);

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

  async function loadRecentReceipts() {
    setReceiptsLoading(true);
    try {
      const data = await api.getRecentReceipts(50);
      setReceipts(data);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل الإيصالات", variant: "destructive" });
    } finally {
      setReceiptsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterMethod]);

  useEffect(() => {
    if (tab === "receipts") loadRecentReceipts();
  }, [tab]);

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
    try {
      const fees = await api.getFees({ studentId: student.id });
      setStudentFees(fees.filter((f) => Number(f.paidAmount) < Number(f.amount)));
    } catch {
      setStudentFees([]);
    }
  }

  function selectFee(feeId: string) {
    if (feeId === "__none__") {
      setForm((prev) => ({ ...prev, feeId: "" }));
      return;
    }
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
      if (receiptFile) fd.append("receipt", receiptFile);
      await api.createPayment(fd);
      toast({ title: "تم تسجيل الدفعة" });
      setDialog(false);
      setForm(emptyForm());
      setReceiptFile(null);
      setSelectedStudent(null);
      setStudentSearch("");
      setStudentFees([]);
      load();
      if (tab === "receipts") loadRecentReceipts();
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

  async function handleReceiptSearch() {
    if (!searchNumber.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const result = await api.verifyReceipt(searchNumber.trim());
      setSearchResult(result);
    } catch {
      setSearchResult("not-found");
    } finally {
      setSearching(false);
    }
  }

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);
  const displayList =
    searchResult && searchResult !== "not-found"
      ? [searchResult]
      : searchResult === null
        ? receipts
        : [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">المدفوعات والإيصالات</h1>
          <div className="flex items-center gap-3">
            {tab === "payments" && (
              <div className="text-lg font-bold text-green-600">{formatCurrency(total)}</div>
            )}
            <Button
              size="sm"
              onClick={() => {
                setForm(emptyForm());
                setReceiptFile(null);
                setSelectedStudent(null);
                setStudentSearch("");
                setStudentFees([]);
                setDialog(true);
              }}
            >
              <Plus className="w-4 h-4 ml-1" /> دفعة جديدة
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="payments">المدفوعات ({payments.length})</TabsTrigger>
            <TabsTrigger value="receipts">الإيصالات</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <Select value={filterMethod} onValueChange={setFilterMethod}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="طريقة الدفع" />
                  </SelectTrigger>
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
                      <TableHead>صورة</TableHead>
                      <TableHead>ملاحظات</TableHead>
                      <TableHead>حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          جارٍ التحميل...
                        </TableCell>
                      </TableRow>
                    ) : payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          لا توجد مدفوعات
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((p) => {
                        const imgSrc = p.receipt ? `${apiBaseUrl}${p.receipt.imagePath}` : null;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.student?.fullName}</TableCell>
                            <TableCell>{p.student?.branch?.name || "-"}</TableCell>
                            <TableCell>
                              {p.fee ? (
                                <Badge variant="outline" className="text-xs">
                                  {getFeeBucketLabel(p.fee.bucket)}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-green-600 font-medium">
                              {formatCurrency(Number(p.amount))}
                            </TableCell>
                            <TableCell>{formatDate(p.paymentDate)}</TableCell>
                            <TableCell>
                              <Badge variant={methodColors[p.method] as "default" | "secondary" | "outline"}>
                                {getPaymentMethodLabel(p.method)}
                              </Badge>
                            </TableCell>
                            <TableCell>{p.receiptNumber || "-"}</TableCell>
                            <TableCell>
                              {imgSrc ? (
                                <button
                                  onClick={() => setLightboxSrc(imgSrc)}
                                  className="text-blue-600 underline text-sm"
                                >
                                  عرض
                                </button>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate text-sm text-gray-600">
                              {p.notes || "—"}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipts" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex gap-2 items-center flex-wrap">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <Input
                    placeholder="بحث برقم الإيصال..."
                    value={searchNumber}
                    onChange={(e) => {
                      setSearchNumber(e.target.value);
                      if (!e.target.value) setSearchResult(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleReceiptSearch()}
                    className="max-w-sm"
                  />
                  <Button
                    onClick={handleReceiptSearch}
                    disabled={searching || !searchNumber.trim()}
                    size="sm"
                  >
                    {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "بحث"}
                  </Button>
                  {searchResult !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchResult(null);
                        setSearchNumber("");
                      }}
                    >
                      إلغاء البحث
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadRecentReceipts}
                    disabled={receiptsLoading}
                    className="mr-auto"
                  >
                    <RefreshCw className={`w-4 h-4 ml-1 ${receiptsLoading ? "animate-spin" : ""}`} />
                    تحديث
                  </Button>
                </div>
                {searchResult === "not-found" && (
                  <p className="text-sm text-red-600 mt-2">لم يتم العثور على إيصال بهذا الرقم.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {searchResult && searchResult !== "not-found"
                    ? "نتيجة البحث"
                    : `آخر ${receipts.length} إيصال مرفوع`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>صورة</TableHead>
                      <TableHead>رقم الإيصال</TableHead>
                      <TableHead>الطالب</TableHead>
                      <TableHead>الفرع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الطريقة</TableHead>
                      <TableHead>عرض</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10">
                          جارٍ التحميل...
                        </TableCell>
                      </TableRow>
                    ) : displayList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                          لا توجد إيصالات مرفوعة بعد
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayList.map((p) => {
                        const imgSrc = p.receipt ? `${apiBaseUrl}${p.receipt.imagePath}` : null;
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              {imgSrc ? (
                                <button
                                  onClick={() => setLightboxSrc(imgSrc)}
                                  className="block w-12 h-12 rounded overflow-hidden border hover:opacity-80 transition"
                                  title="عرض الإيصال"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={imgSrc} alt="إيصال" className="w-full h-full object-cover" />
                                </button>
                              ) : (
                                <div className="w-12 h-12 rounded border bg-gray-50 flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-gray-300" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{p.receiptNumber || "-"}</span>
                            </TableCell>
                            <TableCell className="font-medium">{p.student?.fullName || "-"}</TableCell>
                            <TableCell>{p.student?.branch?.name || "-"}</TableCell>
                            <TableCell className="text-green-700 font-semibold">
                              {formatCurrency(Number(p.amount))}
                            </TableCell>
                            <TableCell>{formatDate(p.paymentDate)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getPaymentMethodLabel(p.method)}</Badge>
                            </TableCell>
                            <TableCell>
                              {imgSrc ? (
                                <a href={imgSrc} target="_blank" rel="noreferrer" title="فتح في تبويب جديد">
                                  <ExternalLink className="w-4 h-4 text-blue-600 hover:text-blue-800" />
                                </a>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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

            {studentFees.length > 0 && (
              <div>
                <Label>البند (الرسوم المستحقة)</Label>
                <Select value={form.feeId || "__none__"} onValueChange={selectFee}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البند — اختياري" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بدون تحديد بند</SelectItem>
                    {studentFees.map((fee) => (
                      <SelectItem key={fee.id} value={fee.id}>
                        {getFeeBucketLabel(fee.bucket)} — متبقي:{" "}
                        {formatNumber(Number(fee.amount) - Number(fee.paidAmount))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.feeId && (
                  <p className="text-xs text-gray-500 mt-1">سيتم تحديث رصيد البند تلقائياً عند الحفظ.</p>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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

            <div>
              <Label>صورة الإيصال (اختياري)</Label>
              <div className="mt-1">
                <label className="cursor-pointer inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  {receiptFile ? receiptFile.name : "رفع صورة"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (!form.studentId || !form.amount) {
                    toast({
                      title: "خطأ",
                      description: "الطالب والمبلغ مطلوبان",
                      variant: "destructive",
                    });
                    return;
                  }
                  setConfirmOpen(true);
                }}
                disabled={submitting}
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin ml-1" /> : null}
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تسجيل الدفعة</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد تسجيل دفعة بمبلغ {form.amount} للطالب {selectedStudent?.fullName}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              {submitting ? "جارٍ..." : "تأكيد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!lightboxSrc} onOpenChange={() => setLightboxSrc(null)}>
        <DialogContent className="max-w-3xl w-[95vw] p-2">
          {lightboxSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxSrc}
              alt="إيصال"
              className="max-w-full max-h-[85vh] object-contain rounded mx-auto block"
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
