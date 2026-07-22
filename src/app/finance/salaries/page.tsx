"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Employee, SalaryPayment, Branch } from "@/lib/api";
import { formatCurrency, formatDate, ARABIC_MONTHS, getEmployeeCategoryLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type SalaryFormData = {
  employeeId: string;
  baseSalary: string;
  allowance1: string;
  allowance2: string;
  transportAllowance: string;
  bonus: string;
  loan: string;
  leaveDeduction: string;
  penalty: string;
  subscription: string;
  otherDeduction: string;
  month: string;
  year: string;
  notes: string;
};

const emptySalaryForm = (): SalaryFormData => ({
  employeeId: "",
  baseSalary: "",
  allowance1: "0",
  allowance2: "0",
  transportAllowance: "0",
  bonus: "0",
  loan: "0",
  leaveDeduction: "0",
  penalty: "0",
  subscription: "0",
  otherDeduction: "0",
  month: "",
  year: String(new Date().getFullYear()),
  notes: "",
});

function calcNet(f: SalaryFormData) {
  const earnings =
    Number(f.baseSalary) +
    Number(f.allowance1) +
    Number(f.allowance2) +
    Number(f.transportAllowance) +
    Number(f.bonus);
  const deductions =
    Number(f.loan) +
    Number(f.leaveDeduction) +
    Number(f.penalty) +
    Number(f.subscription) +
    Number(f.otherDeduction);
  return { earnings, deductions, net: earnings - deductions };
}

export default function SalariesPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [empDialog, setEmpDialog] = useState(false);
  const [salaryDialog, setSalaryDialog] = useState(false);
  const [empForm, setEmpForm] = useState<{ branchId: string; fullName: string; jobTitle: string; phone: string; email: string; baseSalary: string; category: "TEACHING" | "ADMINISTRATIVE" | "SUPPORT" }>({ branchId: "", fullName: "", jobTitle: "", phone: "", email: "", baseSalary: "", category: "TEACHING" });
  const [salaryForm, setSalaryForm] = useState<SalaryFormData>(emptySalaryForm());
  const [submittingSalary, setSubmittingSalary] = useState(false);
  const [salaryConfirmOpen, setSalaryConfirmOpen] = useState(false);

  const [filterBranch, setFilterBranch] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState("ALL");
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  async function load() {
    setLoading(true);
    try {
      const empParams: Record<string, string> = {};
      if (filterBranch !== "ALL") empParams.branchId = filterBranch;

      const payParams: Record<string, string> = {};
      if (filterBranch !== "ALL") payParams.branchId = filterBranch;
      if (filterMonth !== "ALL") payParams.month = filterMonth;
      if (filterYear) payParams.year = filterYear;

      const [e, s, b] = await Promise.all([
        api.getEmployees(empParams),
        api.getSalaryPayments(payParams),
        api.getBranches(),
      ]);
      setEmployees(e);
      setSalaryPayments(s);
      setBranches(b);
    } catch {
      toast({ title: "خطأ", description: "تعذر التحميل", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterBranch, filterMonth, filterYear]);

  const salaryStats = {
    count: salaryPayments.length,
    totalNet: salaryPayments.reduce((s, p) => s + Number(p.amount), 0),
    totalDeductions: salaryPayments.reduce(
      (s, p) =>
        s +
        Number(p.loan) +
        Number(p.leaveDeduction) +
        Number(p.penalty) +
        Number(p.subscription) +
        Number(p.otherDeduction),
      0
    ),
  };

  async function handleCreateEmployee() {
    try {
      await api.createEmployee(empForm);
      toast({ title: "تم إضافة الموظف" });
      setEmpDialog(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function handleDeleteEmployee(id: string) {
    if (!confirm("حذف هذا الموظف؟")) return;
    await api.deleteEmployee(id);
    toast({ title: "تم الحذف" });
    load();
  }

  async function handleCreateSalaryPayment() {
    if (!salaryForm.employeeId || !salaryForm.baseSalary || !salaryForm.month) {
      toast({ title: "خطأ", description: "الموظف والراتب الأساسي والشهر مطلوبة", variant: "destructive" });
      return;
    }
    setSubmittingSalary(true);
    try {
      const { earnings, deductions, net } = calcNet(salaryForm);
      await api.createSalaryPayment({
        employeeId: salaryForm.employeeId,
        amount: net,
        baseSalary: Number(salaryForm.baseSalary),
        allowance1: Number(salaryForm.allowance1),
        allowance2: Number(salaryForm.allowance2),
        transportAllowance: Number(salaryForm.transportAllowance),
        bonus: Number(salaryForm.bonus),
        loan: Number(salaryForm.loan),
        leaveDeduction: Number(salaryForm.leaveDeduction),
        penalty: Number(salaryForm.penalty),
        subscription: Number(salaryForm.subscription),
        otherDeduction: Number(salaryForm.otherDeduction),
        month: Number(salaryForm.month),
        year: Number(salaryForm.year),
        notes: salaryForm.notes,
      });
      toast({ title: "تم تسجيل الراتب", description: `الصافي: ${formatCurrency(net)}` });
      setSalaryDialog(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    } finally {
      setSubmittingSalary(false);
    }
  }

  function openSalaryDialog() {
    setSalaryForm(emptySalaryForm());
    setSalaryDialog(true);
  }

  function pickEmployee(id: string) {
    const emp = employees.find((e) => e.id === id);
    setSalaryForm((prev) => ({
      ...prev,
      employeeId: id,
      baseSalary: emp ? String(emp.baseSalary) : "",
    }));
  }

  const { earnings, deductions, net } = calcNet(salaryForm);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">إدارة الرواتب</h1>

        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label>الفرع</Label>
                <Select value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">جميع الفروع</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>شهر الرواتب</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">كل الأشهر</SelectItem>
                    {ARABIC_MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>السنة</Label>
                <Input
                  type="number"
                  className="w-28"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-700">{salaryStats.count}</div>
            <div className="text-xs text-blue-600">عدد الصرفيات</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-700">{formatCurrency(salaryStats.totalNet)}</div>
            <div className="text-xs text-green-600">إجمالي الصافي</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-700">{formatCurrency(salaryStats.totalDeductions)}</div>
            <div className="text-xs text-red-600">إجمالي الاستقطاعات</div>
          </div>
        </div>

        <Tabs defaultValue="employees">
          <TabsList>
            <TabsTrigger value="employees">الموظفون ({employees.length})</TabsTrigger>
            <TabsTrigger value="payments">سجل الرواتب ({salaryPayments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>قائمة الموظفين</CardTitle>
                <Button size="sm" onClick={() => { setEmpForm({ branchId: "", fullName: "", jobTitle: "", phone: "", email: "", baseSalary: "", category: "TEACHING" as const }); setEmpDialog(true); }}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة موظف
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>المسمى الوظيفي</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>الفرع</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>تاريخ التعيين</TableHead>
                      <TableHead>الراتب الأساسي</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <TableRow><TableCell colSpan={9} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow>
                      : employees.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">لا يوجد موظفون</TableCell></TableRow>
                      ) : employees.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.fullName}</TableCell>
                          <TableCell>{emp.jobTitle || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getEmployeeCategoryLabel(emp.category)}</Badge>
                          </TableCell>
                          <TableCell>{emp.branch?.name}</TableCell>
                          <TableCell>{emp.phone || "-"}</TableCell>
                          <TableCell>{emp.hireDate ? formatDate(emp.hireDate) : "-"}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(Number(emp.baseSalary))}</TableCell>
                          <TableCell><Badge variant={emp.status === "ACTIVE" ? "default" : "secondary"}>{emp.status === "ACTIVE" ? "نشط" : "غير نشط"}</Badge></TableCell>
                          <TableCell><Button variant="ghost" size="sm" onClick={() => handleDeleteEmployee(emp.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>سجل صرف الرواتب</CardTitle>
                <Button size="sm" onClick={openSalaryDialog}>
                  <Plus className="w-4 h-4 ml-1" /> صرف راتب
                </Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>الفرع</TableHead>
                      <TableHead>الشهر / السنة</TableHead>
                      <TableHead className="text-center bg-green-50">الأساسي</TableHead>
                      <TableHead className="text-center bg-green-50">علاوة 1</TableHead>
                      <TableHead className="text-center bg-green-50">علاوة 2</TableHead>
                      <TableHead className="text-center bg-green-50">ب. نقل</TableHead>
                      <TableHead className="text-center bg-green-50">حافز</TableHead>
                      <TableHead className="text-center bg-green-100 font-bold">الاستحقاق</TableHead>
                      <TableHead className="text-center bg-red-50">سلفية</TableHead>
                      <TableHead className="text-center bg-red-50">إجازة</TableHead>
                      <TableHead className="text-center bg-red-50">جزاءات</TableHead>
                      <TableHead className="text-center bg-red-50">اشتراكات</TableHead>
                      <TableHead className="text-center bg-red-50">أخرى</TableHead>
                      <TableHead className="text-center bg-red-100 font-bold">الاستقطاع</TableHead>
                      <TableHead className="text-center font-bold">الصافي</TableHead>
                      <TableHead>تاريخ الصرف</TableHead>
                      <TableHead>التوقيع</TableHead>
                      <TableHead>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={19} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow>
                    ) : salaryPayments.map((sp) => {
                      const earnings =
                        Number(sp.baseSalary) +
                        Number(sp.allowance1) +
                        Number(sp.allowance2) +
                        Number(sp.transportAllowance) +
                        Number(sp.bonus);
                      const deductions =
                        Number(sp.loan) +
                        Number(sp.leaveDeduction) +
                        Number(sp.penalty) +
                        Number(sp.subscription) +
                        Number(sp.otherDeduction);
                      return (
                        <TableRow key={sp.id}>
                          <TableCell className="font-medium">{sp.employee?.fullName}</TableCell>
                          <TableCell>{sp.employee?.branch?.name}</TableCell>
                          <TableCell>{ARABIC_MONTHS[sp.month - 1]} {sp.year}</TableCell>
                          <TableCell className="text-center bg-green-50 text-sm">{formatCurrency(Number(sp.baseSalary))}</TableCell>
                          <TableCell className="text-center bg-green-50 text-sm">{Number(sp.allowance1) > 0 ? formatCurrency(Number(sp.allowance1)) : "—"}</TableCell>
                          <TableCell className="text-center bg-green-50 text-sm">{Number(sp.allowance2) > 0 ? formatCurrency(Number(sp.allowance2)) : "—"}</TableCell>
                          <TableCell className="text-center bg-green-50 text-sm">{Number(sp.transportAllowance) > 0 ? formatCurrency(Number(sp.transportAllowance)) : "—"}</TableCell>
                          <TableCell className="text-center bg-green-50 text-sm">{Number(sp.bonus) > 0 ? formatCurrency(Number(sp.bonus)) : "—"}</TableCell>
                          <TableCell className="text-center bg-green-100 font-semibold text-green-700">{formatCurrency(earnings)}</TableCell>
                          <TableCell className="text-center bg-red-50 text-sm">{Number(sp.loan) > 0 ? formatCurrency(Number(sp.loan)) : "—"}</TableCell>
                          <TableCell className="text-center bg-red-50 text-sm">{Number(sp.leaveDeduction) > 0 ? formatCurrency(Number(sp.leaveDeduction)) : "—"}</TableCell>
                          <TableCell className="text-center bg-red-50 text-sm">{Number(sp.penalty) > 0 ? formatCurrency(Number(sp.penalty)) : "—"}</TableCell>
                          <TableCell className="text-center bg-red-50 text-sm">{Number(sp.subscription) > 0 ? formatCurrency(Number(sp.subscription)) : "—"}</TableCell>
                          <TableCell className="text-center bg-red-50 text-sm">{Number(sp.otherDeduction) > 0 ? formatCurrency(Number(sp.otherDeduction)) : "—"}</TableCell>
                          <TableCell className="text-center bg-red-100 font-semibold text-red-700">{deductions > 0 ? formatCurrency(deductions) : "—"}</TableCell>
                          <TableCell className="text-center font-bold text-blue-700">{formatCurrency(Number(sp.amount))}</TableCell>
                          <TableCell>{formatDate(sp.paidDate)}</TableCell>
                          <TableCell>{sp.signedAt ? formatDate(sp.signedAt) : "—"}</TableCell>
                          <TableCell className="max-w-[120px] truncate text-sm">{sp.notes || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {!loading && salaryPayments.length === 0 && <TableRow><TableCell colSpan={19} className="text-center py-8 text-gray-500">لا توجد مدفوعات</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Add Employee Dialog ── */}
      <Dialog open={empDialog} onOpenChange={setEmpDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة موظف</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الفرع *</Label>
              <Select value={empForm.branchId} onValueChange={(v) => setEmpForm({ ...empForm, branchId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الاسم *</Label><Input value={empForm.fullName} onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })} /></div>
            <div><Label>المسمى الوظيفي</Label><Input value={empForm.jobTitle} onChange={(e) => setEmpForm({ ...empForm, jobTitle: e.target.value })} /></div>
            <div>
              <Label>الفئة</Label>
              <Select value={empForm.category} onValueChange={(v) => setEmpForm({ ...empForm, category: v as "TEACHING" | "ADMINISTRATIVE" | "SUPPORT" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEACHING">تدريسي</SelectItem>
                  <SelectItem value="ADMINISTRATIVE">إداري</SelectItem>
                  <SelectItem value="SUPPORT">دعم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>الهاتف</Label><Input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} /></div>
            <div><Label>الراتب الأساسي *</Label><Input type="number" value={empForm.baseSalary} onChange={(e) => setEmpForm({ ...empForm, baseSalary: e.target.value })} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEmpDialog(false)}>إلغاء</Button>
              <Button onClick={handleCreateEmployee}>إضافة</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Salary Payment Dialog ── */}
      <Dialog open={salaryDialog} onOpenChange={setSalaryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>صرف راتب</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Employee + Month */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الموظف *</Label>
                <Select value={salaryForm.employeeId} onValueChange={pickEmployee}>
                  <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter((e) => e.status === "ACTIVE").map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>الشهر *</Label>
                  <Select value={salaryForm.month} onValueChange={(v) => setSalaryForm({ ...salaryForm, month: v })}>
                    <SelectTrigger><SelectValue placeholder="الشهر" /></SelectTrigger>
                    <SelectContent>{ARABIC_MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>السنة</Label>
                  <Input type="number" value={salaryForm.year} onChange={(e) => setSalaryForm({ ...salaryForm, year: e.target.value })} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Earnings */}
            <div>
              <h3 className="font-semibold text-green-700 mb-2">الاستحقاقات</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label>الراتب الأساسي *</Label>
                  <Input type="number" min={0} value={salaryForm.baseSalary} onChange={(e) => setSalaryForm({ ...salaryForm, baseSalary: e.target.value })} />
                </div>
                <div>
                  <Label>علاوة 1 (إشراف)</Label>
                  <Input type="number" min={0} value={salaryForm.allowance1} onChange={(e) => setSalaryForm({ ...salaryForm, allowance1: e.target.value })} />
                </div>
                <div>
                  <Label>علاوة 2 (ضباط)</Label>
                  <Input type="number" min={0} value={salaryForm.allowance2} onChange={(e) => setSalaryForm({ ...salaryForm, allowance2: e.target.value })} />
                </div>
                <div>
                  <Label>بدل ترحيل</Label>
                  <Input type="number" min={0} value={salaryForm.transportAllowance} onChange={(e) => setSalaryForm({ ...salaryForm, transportAllowance: e.target.value })} />
                </div>
                <div>
                  <Label>الحافز</Label>
                  <Input type="number" min={0} value={salaryForm.bonus} onChange={(e) => setSalaryForm({ ...salaryForm, bonus: e.target.value })} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Deductions */}
            <div>
              <h3 className="font-semibold text-red-700 mb-2">الاستقطاعات</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label>سلفية</Label>
                  <Input type="number" min={0} value={salaryForm.loan} onChange={(e) => setSalaryForm({ ...salaryForm, loan: e.target.value })} />
                </div>
                <div>
                  <Label>الإجازة</Label>
                  <Input type="number" min={0} value={salaryForm.leaveDeduction} onChange={(e) => setSalaryForm({ ...salaryForm, leaveDeduction: e.target.value })} />
                </div>
                <div>
                  <Label>جزاءات</Label>
                  <Input type="number" min={0} value={salaryForm.penalty} onChange={(e) => setSalaryForm({ ...salaryForm, penalty: e.target.value })} />
                </div>
                <div>
                  <Label>اشتراكات / أقساط</Label>
                  <Input type="number" min={0} value={salaryForm.subscription} onChange={(e) => setSalaryForm({ ...salaryForm, subscription: e.target.value })} />
                </div>
                <div>
                  <Label>أخرى</Label>
                  <Input type="number" min={0} value={salaryForm.otherDeduction} onChange={(e) => setSalaryForm({ ...salaryForm, otherDeduction: e.target.value })} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Live Net Summary */}
            <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <div className="font-bold text-green-700">{formatCurrency(earnings)}</div>
                <div className="text-gray-500">إجمالي الاستحقاق</div>
              </div>
              <div>
                <div className="font-bold text-red-700">{formatCurrency(deductions)}</div>
                <div className="text-gray-500">إجمالي الاستقطاع</div>
              </div>
              <div>
                <div className="font-bold text-blue-700 text-lg">{formatCurrency(net)}</div>
                <div className="text-gray-500">الصافي</div>
              </div>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Input value={salaryForm.notes} onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })} placeholder="اختياري" />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSalaryDialog(false)}>إلغاء</Button>
              <Button
                onClick={() => {
                  if (!salaryForm.employeeId || !salaryForm.baseSalary || !salaryForm.month) {
                    toast({ title: "خطأ", description: "الموظف والراتب الأساسي والشهر مطلوبة", variant: "destructive" });
                    return;
                  }
                  setSalaryConfirmOpen(true);
                }}
                disabled={submittingSalary || !salaryForm.employeeId || !salaryForm.baseSalary || !salaryForm.month}
              >
                {submittingSalary ? "جارٍ الصرف..." : "صرف الراتب"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={salaryConfirmOpen} onOpenChange={setSalaryConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد صرف الراتب</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const emp = employees.find((e) => e.id === salaryForm.employeeId);
                const { net } = calcNet(salaryForm);
                return `هل تريد صرف راتب ${emp?.fullName ?? ""} لشهر ${ARABIC_MONTHS[Number(salaryForm.month) - 1] ?? ""} ${salaryForm.year}؟ الصافي: ${formatCurrency(net)}`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateSalaryPayment} disabled={submittingSalary}>
              {submittingSalary ? "جارٍ..." : "تأكيد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
