"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, StudentDetail, FinancialSummary } from "@/lib/api";
import { formatCurrency, formatDate, getFeeTypeLabel, getPaymentMethodLabel, getInstallmentStatusLabel, getInventoryCategoryTypeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Upload, Bus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ARABIC_MONTHS } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [feeDialog, setFeeDialog] = useState(false);
  const [feeForm, setFeeForm] = useState({ type: "TUITION", amount: "", description: "", academicYear: "2024-2025" });

  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "CASH", receiptNumber: "", notes: "" });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [installmentDialog, setInstallmentDialog] = useState(false);
  const [installments, setInstallments] = useState([{ amount: "", dueDate: "" }]);

  // Pay installment from student profile
  const [payInstDialog, setPayInstDialog] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<StudentDetail["installments"][number] | null>(null);
  const [payInstAmount, setPayInstAmount] = useState("");

  async function load() {
    try {
      const [s, fin] = await Promise.all([
        api.getStudent(id),
        api.getStudentFinancialSummary(id),
      ]);
      setStudent(s);
      setSummary(fin);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل بيانات الطالب", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleAddFee() {
    try {
      await api.createFee({ ...feeForm, studentId: id, amount: feeForm.amount });
      toast({ title: "تم إضافة الرسم" });
      setFeeDialog(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function handleAddPayment() {
    try {
      const fd = new FormData();
      fd.append("studentId", id);
      fd.append("amount", paymentForm.amount);
      fd.append("method", paymentForm.method);
      if (paymentForm.receiptNumber) fd.append("receiptNumber", paymentForm.receiptNumber);
      if (paymentForm.notes) fd.append("notes", paymentForm.notes);
      if (receiptFile) fd.append("receipt", receiptFile);
      await api.createPayment(fd);
      toast({ title: "تم تسجيل الدفعة" });
      setPaymentDialog(false);
      setReceiptFile(null);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function handleAddInstallments() {
    try {
      const valid = installments.filter((i) => i.amount && i.dueDate);
      await api.createInstallmentsBulk(id, valid.map((i) => ({ amount: Number(i.amount), dueDate: i.dueDate })));
      toast({ title: "تم إنشاء الأقساط" });
      setInstallmentDialog(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function handleDeleteFee(feeId: string) {
    if (!confirm("حذف هذا الرسم؟")) return;
    await api.deleteFee(feeId);
    load();
  }

  async function handlePayInstallment() {
    if (!selectedInstallment || !payInstAmount) return;
    try {
      await api.updateInstallment(selectedInstallment.id, Number(payInstAmount));
      toast({ title: "تم تسجيل الدفع" });
      setPayInstDialog(false);
      setSelectedInstallment(null);
      setPayInstAmount("");
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div></DashboardLayout>;
  if (!student) return <DashboardLayout><p className="text-center">الطالب غير موجود</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{student.fullName}</h1>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span>الفرع: {student.branch?.name}</span>
                  <span>الفصل: {student.class?.name || "-"}</span>
                  <span>ولي الأمر: {student.parentName || "-"}</span>
                </div>
              </div>
              <Badge>{student.status === "ACTIVE" ? "نشط" : student.status}</Badge>
            </div>
            {summary && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-700">{formatCurrency(summary.totalFees)}</div>
                  <div className="text-xs text-blue-600">إجمالي الرسوم</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-700">{formatCurrency(summary.totalPaid)}</div>
                  <div className="text-xs text-green-600">المدفوع</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-red-700">{formatCurrency(summary.remaining)}</div>
                  <div className="text-xs text-red-600">المتبقي</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="fees">
          <TabsList>
            <TabsTrigger value="fees">الرسوم ({student.fees.length})</TabsTrigger>
            <TabsTrigger value="payments">المدفوعات ({student.payments.length})</TabsTrigger>
            <TabsTrigger value="installments">الأقساط ({student.installments.length})</TabsTrigger>
            <TabsTrigger value="inventory">المستودع ({student.distributions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="fees">
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>الرسوم الدراسية</CardTitle>
                  <Button size="sm" onClick={() => setFeeDialog(true)}><Plus className="w-4 h-4 ml-1" /> إضافة رسم</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>البند</TableHead><TableHead>المبلغ</TableHead><TableHead>المدفوع</TableHead><TableHead>المتبقي</TableHead><TableHead>العام</TableHead><TableHead>حذف</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {student.fees.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>{getFeeTypeLabel(f.type)}</TableCell>
                          <TableCell>{formatCurrency(Number(f.amount))}</TableCell>
                          <TableCell className="text-green-700">{formatCurrency(Number(f.paidAmount ?? 0))}</TableCell>
                          <TableCell className="text-red-600">{formatCurrency(Number(f.amount) - Number(f.paidAmount ?? 0))}</TableCell>
                          <TableCell>{f.academicYear}</TableCell>
                          <TableCell><Button variant="ghost" size="sm" onClick={() => handleDeleteFee(f.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                        </TableRow>
                      ))}
                      {student.fees.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-6">لا توجد رسوم</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Transport subscription card */}
              <Card className="border-blue-100 bg-blue-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bus className="w-4 h-4 text-blue-600" />
                    النقل المدرسي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {student.transportSubscription ? (
                    <div className="flex items-center justify-between">
                      <div className="text-sm space-y-1">
                        <div>الرسوم الشهرية: <span className="font-semibold">{formatCurrency(Number(student.transportSubscription.monthlyFee))}</span></div>
                        {student.transportSubscription.route && <div>المسار: {student.transportSubscription.route}</div>}
                        <div>
                          <Badge variant={student.transportSubscription.status === "ACTIVE" ? "default" : "secondary"}>
                            {student.transportSubscription.status === "ACTIVE" ? "نشط" : "غير نشط"}
                          </Badge>
                        </div>
                      </div>
                      <a href="/transport" className="text-sm text-blue-600 hover:underline">إدارة الاشتراك ←</a>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>لا يوجد اشتراك نقل لهذا الطالب</span>
                      <a href="/transport" className="text-blue-600 hover:underline">إضافة اشتراك ←</a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>سجل المدفوعات</CardTitle>
                <Button size="sm" onClick={() => setPaymentDialog(true)}><Plus className="w-4 h-4 ml-1" /> تسجيل دفعة</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>المبلغ</TableHead><TableHead>التاريخ</TableHead><TableHead>الطريقة</TableHead><TableHead>رقم الإيصال</TableHead><TableHead>الإيصال</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {student.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{formatCurrency(Number(p.amount))}</TableCell>
                        <TableCell>{formatDate(p.paymentDate)}</TableCell>
                        <TableCell>{getPaymentMethodLabel(p.method)}</TableCell>
                        <TableCell>{p.receiptNumber || "-"}</TableCell>
                        <TableCell>
                          {p.receipt && <a href={`${API_URL}${p.receipt.imagePath}`} target="_blank" className="text-blue-600 underline text-sm">عرض</a>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {student.payments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-6">لا توجد مدفوعات</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="installments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>الأقساط</CardTitle>
                <Button size="sm" onClick={() => { setInstallments([{ amount: "", dueDate: "" }]); setInstallmentDialog(true); }}><Plus className="w-4 h-4 ml-1" /> إنشاء أقساط</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>المدفوع</TableHead>
                      <TableHead>المتبقي</TableHead>
                      <TableHead>تاريخ الاستحقاق</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>دفع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.installments.map((inst) => {
                      const remaining = Number(inst.amount) - Number(inst.paidAmount);
                      return (
                        <TableRow key={inst.id}>
                          <TableCell>{formatCurrency(Number(inst.amount))}</TableCell>
                          <TableCell className="text-green-700">{formatCurrency(Number(inst.paidAmount))}</TableCell>
                          <TableCell className="text-red-600 font-medium">{formatCurrency(remaining)}</TableCell>
                          <TableCell>{formatDate(inst.dueDate)}</TableCell>
                          <TableCell>
                            <Badge variant={inst.status === "PAID" ? "default" : inst.status === "OVERDUE" ? "destructive" : "secondary"}>
                              {getInstallmentStatusLabel(inst.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {inst.status !== "PAID" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInstallment(inst);
                                  setPayInstAmount(String(remaining));
                                  setPayInstDialog(true);
                                }}
                              >
                                دفع
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {student.installments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-6">لا توجد أقساط</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardHeader><CardTitle>العناصر المستلمة من المستودع</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>العنصر</TableHead><TableHead>الفئة</TableHead><TableHead>الكمية</TableHead><TableHead>تاريخ التوزيع</TableHead><TableHead>موزع بواسطة</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {student.distributions.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.item?.name}</TableCell>
                        <TableCell>{d.item?.category ? getInventoryCategoryTypeLabel(d.item.category.type) : "-"}</TableCell>
                        <TableCell>{d.quantity}</TableCell>
                        <TableCell>{formatDate(d.distributionDate)}</TableCell>
                        <TableCell>{d.distributedBy?.name}</TableCell>
                      </TableRow>
                    ))}
                    {student.distributions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-6">لم يستلم الطالب أي عناصر</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Fee Dialog */}
      <Dialog open={feeDialog} onOpenChange={setFeeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة رسم</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>البند</Label>
              <Select value={feeForm.type} onValueChange={(v) => setFeeForm({ ...feeForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGISTRATION">التسجيل</SelectItem>
                  <SelectItem value="INSTALLMENT_1">القسط الأول</SelectItem>
                  <SelectItem value="INSTALLMENT_2">القسط الثاني</SelectItem>
                  <SelectItem value="INSTALLMENT_3">القسط الثالث</SelectItem>
                  <SelectItem value="INSTALLMENT_4">القسط الرابع</SelectItem>
                  <SelectItem value="BOOKS">كتب</SelectItem>
                  <SelectItem value="UNIFORM">زي</SelectItem>
                  <SelectItem value="OTHER">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>المبلغ *</Label><Input type="number" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} /></div>
            <div><Label>الوصف</Label><Input value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} /></div>
            <div><Label>العام الدراسي</Label><Input value={feeForm.academicYear} onChange={(e) => setFeeForm({ ...feeForm, academicYear: e.target.value })} /></div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setFeeDialog(false)}>إلغاء</Button><Button onClick={handleAddFee}>إضافة</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>تسجيل دفعة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>المبلغ *</Label><Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
            <div><Label>طريقة الدفع</Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CASH">نقداً</SelectItem><SelectItem value="BANK_TRANSFER">تحويل بنكي</SelectItem><SelectItem value="CHECK">شيك</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>رقم الإيصال</Label><Input value={paymentForm.receiptNumber} onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })} /></div>
            <div><Label>ملاحظات</Label><Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>
            <div>
              <Label>صورة الإيصال (اختياري)</Label>
              <div className="mt-1 flex items-center gap-2">
                <label className="cursor-pointer flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  {receiptFile ? receiptFile.name : "رفع صورة"}
                  <input type="file" className="hidden" accept="image/jpeg,image/png" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setPaymentDialog(false)}>إلغاء</Button><Button onClick={handleAddPayment}>تسجيل</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Installment Dialog */}
      <Dialog open={payInstDialog} onOpenChange={setPayInstDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>تسجيل دفعة قسط</DialogTitle></DialogHeader>
          {selectedInstallment && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div>الطالب: <span className="font-medium">{student.fullName}</span></div>
                <div>المبلغ الكلي: <span className="font-medium">{formatCurrency(Number(selectedInstallment.amount))}</span></div>
                <div>المتبقي: <span className="font-medium text-red-600">{formatCurrency(Number(selectedInstallment.amount) - Number(selectedInstallment.paidAmount))}</span></div>
              </div>
              <div>
                <Label>المبلغ المدفوع *</Label>
                <Input
                  type="number"
                  min={0}
                  max={Number(selectedInstallment.amount)}
                  value={payInstAmount}
                  onChange={(e) => setPayInstAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setPayInstDialog(false)}>إلغاء</Button>
                <Button onClick={handlePayInstallment}>تسجيل</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Installments Dialog */}
      <Dialog open={installmentDialog} onOpenChange={setInstallmentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>إنشاء خطة أقساط</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {installments.map((inst, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1"><Label>المبلغ</Label><Input type="number" value={inst.amount} onChange={(e) => { const copy = [...installments]; copy[i].amount = e.target.value; setInstallments(copy); }} /></div>
                <div className="flex-1"><Label>تاريخ الاستحقاق</Label><Input type="date" value={inst.dueDate} onChange={(e) => { const copy = [...installments]; copy[i].dueDate = e.target.value; setInstallments(copy); }} /></div>
                {installments.length > 1 && <Button variant="ghost" size="sm" onClick={() => setInstallments(installments.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setInstallments([...installments, { amount: "", dueDate: "" }])}><Plus className="w-4 h-4 ml-1" /> إضافة قسط</Button>
          </div>
          <div className="flex gap-2 justify-end pt-2"><Button variant="outline" onClick={() => setInstallmentDialog(false)}>إلغاء</Button><Button onClick={handleAddInstallments}>إنشاء</Button></div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
