"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  api,
  Branch,
  Class,
  ClassFeesReport,
  StudentFeesReport,
  SalaryRegisterReport,
  ExpenseRegisterReport,
} from "@/lib/api";
import { formatNumber, ARABIC_MONTHS, getEmployeeCategoryLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BUCKET_LABELS = [
  { key: "registration", label: "التسجيل" },
  { key: "installment1", label: "القسط الأول" },
  { key: "installment2", label: "القسط الثاني" },
  { key: "installment3", label: "القسط الثالث" },
  { key: "installment4", label: "القسط الرابع" },
  { key: "books", label: "كتب" },
  { key: "uniform", label: "زي" },
];

function N(v: number | undefined) {
  return formatNumber(v ?? 0);
}

function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [filters, setFilters] = useState({
    branchId: "ALL",
    academicYear: "2024-2025",
    classId: "ALL",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
  });

  const [classFees, setClassFees] = useState<ClassFeesReport | null>(null);
  const [studentFees, setStudentFees] = useState<StudentFeesReport | null>(null);
  const [salaryReg, setSalaryReg] = useState<SalaryRegisterReport | null>(null);
  const [expenseReg, setExpenseReg] = useState<ExpenseRegisterReport | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function loadMeta() {
    const bs = await api.getBranches();
    setBranches(bs);
    const allClasses: Class[] = [];
    for (const b of bs) {
      const detail = await api.getBranch(b.id);
      allClasses.push(...detail.classes);
    }
    setClasses(allClasses);
  }

  useEffect(() => { loadMeta(); }, []);

  function setLoad(key: string, v: boolean) {
    setLoading((prev) => ({ ...prev, [key]: v }));
  }

  async function loadClassFees() {
    setLoad("classFees", true);
    try {
      const params: Record<string, string> = { academicYear: filters.academicYear };
      if (filters.branchId !== "ALL") params.branchId = filters.branchId;
      setClassFees(await api.getClassFeesReport(params));
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل تقرير الفصول", variant: "destructive" });
    } finally {
      setLoad("classFees", false);
    }
  }

  async function loadStudentFees() {
    setLoad("studentFees", true);
    try {
      const params: Record<string, string> = { academicYear: filters.academicYear };
      if (filters.branchId !== "ALL") params.branchId = filters.branchId;
      if (filters.classId !== "ALL") params.classId = filters.classId;
      setStudentFees(await api.getStudentFeesReport(params));
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل تقرير الطلاب", variant: "destructive" });
    } finally {
      setLoad("studentFees", false);
    }
  }

  async function loadSalaryReg() {
    setLoad("salaryReg", true);
    try {
      const params: Record<string, string> = {
        month: filters.month,
        year: filters.year,
      };
      if (filters.branchId !== "ALL") params.branchId = filters.branchId;
      setSalaryReg(await api.getSalaryRegisterReport(params));
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل كشف الرواتب", variant: "destructive" });
    } finally {
      setLoad("salaryReg", false);
    }
  }

  async function loadExpenseReg() {
    setLoad("expenseReg", true);
    try {
      const params: Record<string, string> = { year: filters.year };
      if (filters.branchId !== "ALL") params.branchId = filters.branchId;
      if (filters.month !== "ALL") params.month = filters.month;
      setExpenseReg(await api.getExpensesRegisterReport(params));
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل كشف المصروفات", variant: "destructive" });
    } finally {
      setLoad("expenseReg", false);
    }
  }

  function exportClassFees() {
    if (!classFees) return;
    const headers = ["الفصل", "الفرع", "الطلاب", ...BUCKET_LABELS.map((b) => b.label + " (مستحق)"), ...BUCKET_LABELS.map((b) => b.label + " (محصل)"), "الإجمالي المستحق", "الإجمالي المحصل", "المتبقي"];
    const rows = classFees.rows.map((r) => [
      r.className, r.branchName, r.studentCount,
      ...BUCKET_LABELS.map((b) => r.buckets[b.key as keyof typeof r.buckets]?.due ?? 0),
      ...BUCKET_LABELS.map((b) => r.buckets[b.key as keyof typeof r.buckets]?.paid ?? 0),
      r.totalDue, r.totalPaid, r.remaining,
    ]);
    exportCSV(`class-fees-${filters.academicYear}.csv`, headers, rows);
  }

  function exportStudentFees() {
    if (!studentFees) return;
    const headers = ["م", "الاسم", "الفصل", "الفرع", ...BUCKET_LABELS.map((b) => b.label), "الإجمالي", "المحصل", "المتبقي", "ملاحظات"];
    const rows = studentFees.rows.map((r) => [
      r.index, r.fullName, r.className, r.branchName,
      ...BUCKET_LABELS.map((b) => r.buckets[b.key]?.paid ?? 0),
      r.totalDue, r.totalPaid, r.remaining, r.notes,
    ]);
    exportCSV(`student-fees-${filters.academicYear}.csv`, headers, rows);
  }

  function exportSalaryReg() {
    if (!salaryReg) return;
    const headers = ["م", "الاسم", "الوظيفة", "الفئة", "الراتب الأساسي", "علاوة 1", "علاوة 2", "بدل نقل", "الحافز", "جملة الاستحقاق", "سلفية", "إجازة", "جزاءات", "اشتراكات", "أخرى", "جملة الاستقطاع", "الصافي"];
    const allRows = [...salaryReg.teaching, ...salaryReg.staff];
    const rows = allRows.map((r) => [
      r.index, r.fullName, r.jobTitle, getEmployeeCategoryLabel(r.category),
      r.baseSalary, r.allowance1, r.allowance2, r.transportAllowance, r.bonus, r.totalEarnings,
      r.loan, r.leaveDeduction, r.penalty, r.subscription, r.otherDeduction, r.totalDeductions, r.netSalary,
    ]);
    exportCSV(`salary-register-${ARABIC_MONTHS[Number(filters.month) - 1]}-${filters.year}.csv`, headers, rows);
  }

  function exportExpenseReg() {
    if (!expenseReg) return;
    const headers = ["الشهر", "السنة", "التاريخ", "المبلغ", "البيان", "الملاحظات"];
    const rows = expenseReg.months.flatMap((m) =>
      m.items.map((e) => [
        ARABIC_MONTHS[m.month - 1], m.year,
        new Date(e.date).toLocaleDateString("ar-SA"),
        e.amount, e.description || "", e.notes || "",
      ])
    );
    exportCSV(`expenses-${filters.year}.csv`, headers, rows);
  }

  const commonFilters = (
    <div className="flex flex-wrap gap-4 items-end mb-4">
      <div>
        <Label>الفرع</Label>
        <Select value={filters.branchId} onValueChange={(v) => setFilters({ ...filters, branchId: v })}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع الفروع</SelectItem>
            {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">التقارير المالية</h1>

        <Tabs defaultValue="class-fees">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="class-fees">تقرير الفصول</TabsTrigger>
            <TabsTrigger value="student-fees">تقرير الطلاب</TabsTrigger>
            <TabsTrigger value="salary-register">كشف الرواتب</TabsTrigger>
            <TabsTrigger value="expenses-register">كشف المصروفات</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Class Fees (تقرير.xlsx layout) ── */}
          <TabsContent value="class-fees" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                {commonFilters}
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <Label>السنة الدراسية</Label>
                    <Input
                      value={filters.academicYear}
                      onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
                      className="w-36"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadClassFees} disabled={loading.classFees}>
                      <RefreshCw className={`w-4 h-4 ml-1 ${loading.classFees ? "animate-spin" : ""}`} />
                      {loading.classFees ? "جارٍ..." : "تحديث"}
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                      <Printer className="w-4 h-4 ml-1" /> طباعة
                    </Button>
                    <Button variant="outline" onClick={exportClassFees} disabled={!classFees}>
                      <Download className="w-4 h-4 ml-1" /> CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {classFees && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    تقرير الفصول — السنة الدراسية {filters.academicYear}
                    {filters.branchId !== "ALL" && ` — ${branches.find((b) => b.id === filters.branchId)?.name}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto print:overflow-visible">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الصف</TableHead>
                        <TableHead>المبلغ المستحق</TableHead>
                        {BUCKET_LABELS.map((b) => (
                          <TableHead key={b.key} className="text-center">{b.label}</TableHead>
                        ))}
                        <TableHead className="text-center">المتبقي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classFees.rows.map((row) => (
                        <TableRow key={row.classId}>
                          <TableCell className="font-medium">{row.className}</TableCell>
                          <TableCell className="font-semibold">{N(row.totalDue)}</TableCell>
                          {BUCKET_LABELS.map((b) => {
                            const bucket = row.buckets[b.key as keyof typeof row.buckets];
                            return (
                              <TableCell key={b.key} className="text-center text-sm">
                                {bucket.paid > 0 ? (
                                  <span className="text-green-700">{N(bucket.paid)}</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-semibold text-red-600">{N(row.remaining)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Grand Total */}
                      <TableRow className="bg-gray-100 font-bold">
                        <TableCell>الإجمالي</TableCell>
                        <TableCell>{N(classFees.totals.totalDue)}</TableCell>
                        {BUCKET_LABELS.map((b) => {
                          const bucket = classFees.totals.buckets[b.key as keyof typeof classFees.totals.buckets];
                          return (
                            <TableCell key={b.key} className="text-center text-green-700">{N(bucket.paid)}</TableCell>
                          );
                        })}
                        <TableCell className="text-center text-red-700">{N(classFees.totals.remaining)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab 2: Student Fees (كل الطلاب-1.xlsx layout) ── */}
          <TabsContent value="student-fees" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                {commonFilters}
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <Label>الفصل</Label>
                    <Select value={filters.classId} onValueChange={(v) => setFilters({ ...filters, classId: v })}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">جميع الفصول</SelectItem>
                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>السنة الدراسية</Label>
                    <Input
                      value={filters.academicYear}
                      onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
                      className="w-36"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadStudentFees} disabled={loading.studentFees}>
                      <RefreshCw className={`w-4 h-4 ml-1 ${loading.studentFees ? "animate-spin" : ""}`} />
                      {loading.studentFees ? "جارٍ..." : "تحديث"}
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                      <Printer className="w-4 h-4 ml-1" /> طباعة
                    </Button>
                    <Button variant="outline" onClick={exportStudentFees} disabled={!studentFees}>
                      <Download className="w-4 h-4 ml-1" /> CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {studentFees && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    جميع الطلاب — السنة الدراسية {filters.academicYear}
                    {" "}({studentFees.rows.length} طالب)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>م</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الصف</TableHead>
                        <TableHead className="text-center">المستحق</TableHead>
                        {BUCKET_LABELS.map((b) => (
                          <TableHead key={b.key} className="text-center">{b.label}</TableHead>
                        ))}
                        <TableHead className="text-center">المتبقي</TableHead>
                        <TableHead>ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentFees.rows.map((row) => (
                        <TableRow key={row.studentId} className={row.isOrphan ? "bg-amber-50" : ""}>
                          <TableCell className="text-gray-500 text-sm">{row.index}</TableCell>
                          <TableCell className="font-medium">{row.fullName}</TableCell>
                          <TableCell className="text-sm">{row.className}</TableCell>
                          <TableCell className="text-center font-semibold">{N(row.totalDue)}</TableCell>
                          {BUCKET_LABELS.map((b) => {
                            const bucket = row.buckets[b.key];
                            return (
                              <TableCell key={b.key} className="text-center text-sm">
                                {bucket && bucket.paid > 0 ? (
                                  <span className="text-green-700">{N(bucket.paid)}</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-semibold text-red-600">{N(row.remaining)}</TableCell>
                          <TableCell>
                            {row.isOrphan && <Badge variant="outline" className="text-amber-700 border-amber-400">ايتام</Badge>}
                            {row.notes && !row.isOrphan && <span className="text-xs text-gray-500">{row.notes}</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className="bg-gray-100 font-bold">
                        <TableCell colSpan={2}>الجملة</TableCell>
                        <TableCell />
                        <TableCell className="text-center">{N(studentFees.totals.totalDue)}</TableCell>
                        {BUCKET_LABELS.map((b) => {
                          const bucket = studentFees.totals.buckets[b.key];
                          return (
                            <TableCell key={b.key} className="text-center text-green-700">
                              {N(bucket?.paid ?? 0)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center text-red-700">{N(studentFees.totals.remaining)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab 3: Salary Register (مرتبات مارس.xlsx layout) ── */}
          <TabsContent value="salary-register" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                {commonFilters}
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <Label>الشهر</Label>
                    <Select value={filters.month} onValueChange={(v) => setFilters({ ...filters, month: v })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
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
                      value={filters.year}
                      onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                      className="w-24"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadSalaryReg} disabled={loading.salaryReg}>
                      <RefreshCw className={`w-4 h-4 ml-1 ${loading.salaryReg ? "animate-spin" : ""}`} />
                      {loading.salaryReg ? "جارٍ..." : "تحديث"}
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                      <Printer className="w-4 h-4 ml-1" /> طباعة
                    </Button>
                    <Button variant="outline" onClick={exportSalaryReg} disabled={!salaryReg}>
                      <Download className="w-4 h-4 ml-1" /> CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {salaryReg && (
              <div className="space-y-6">
                {/* Teaching Section */}
                {salaryReg.teaching.length > 0 && (
                  <SalarySection
                    title={`المعلمون (${salaryReg.teaching.length})`}
                    rows={salaryReg.teaching}
                    totals={salaryReg.teachingTotals}
                  />
                )}
                {/* Staff Section */}
                {salaryReg.staff.length > 0 && (
                  <SalarySection
                    title={`الموظفون (${salaryReg.staff.length})`}
                    rows={salaryReg.staff}
                    totals={salaryReg.staffTotals}
                  />
                )}
                {/* Grand Total */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-blue-700">{N(salaryReg.grandTotal.baseSalary)}</div>
                        <div className="text-xs text-blue-600 mt-1">إجمالي الرواتب</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-green-700">{N(salaryReg.grandTotal.totalEarnings)}</div>
                        <div className="text-xs text-green-600 mt-1">إجمالي الاستحقاق</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-red-700">{N(salaryReg.grandTotal.totalDeductions)}</div>
                        <div className="text-xs text-red-600 mt-1">إجمالي الاستقطاع</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-purple-700">{N(salaryReg.grandTotal.netSalary)}</div>
                        <div className="text-xs text-purple-600 mt-1">صافي الرواتب</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Tab 4: Expenses Register (مصروفات.xlsx layout) ── */}
          <TabsContent value="expenses-register" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                {commonFilters}
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <Label>السنة</Label>
                    <Input
                      type="number"
                      value={filters.year}
                      onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                      className="w-24"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadExpenseReg} disabled={loading.expenseReg}>
                      <RefreshCw className={`w-4 h-4 ml-1 ${loading.expenseReg ? "animate-spin" : ""}`} />
                      {loading.expenseReg ? "جارٍ..." : "تحديث"}
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                      <Printer className="w-4 h-4 ml-1" /> طباعة
                    </Button>
                    <Button variant="outline" onClick={exportExpenseReg} disabled={!expenseReg}>
                      <Download className="w-4 h-4 ml-1" /> CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {expenseReg && (
              <div className="space-y-4">
                {expenseReg.months.map((monthGroup) => (
                  <Card key={`${monthGroup.year}-${monthGroup.month}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          مصروفات {ARABIC_MONTHS[monthGroup.month - 1]} {monthGroup.year}
                        </CardTitle>
                        <span className="font-bold text-red-600">{N(monthGroup.total)}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>الرقم</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>المبلغ</TableHead>
                            <TableHead>البيان</TableHead>
                            <TableHead>الملاحظات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthGroup.items.map((item, idx) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-gray-500 text-sm">{idx + 1}</TableCell>
                              <TableCell className="text-sm">
                                {new Date(item.date).toLocaleDateString("ar-SA")}
                              </TableCell>
                              <TableCell className="font-semibold text-red-700">{N(Number(item.amount))}</TableCell>
                              <TableCell>{item.description || item.category}</TableCell>
                              <TableCell className="text-gray-500 text-sm">{item.notes || ""}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-gray-50">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-red-700">{N(expenseReg.grandTotal)}</div>
                    <div className="text-sm text-gray-500 mt-1">إجمالي المصروفات</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ─── Salary Section Component ───────────────────────────────────────────────

import type { SalaryRegisterRow, SalaryRegisterTotals } from "@/lib/api";

function SalarySection({
  title,
  rows,
  totals,
}: {
  title: string;
  rows: SalaryRegisterRow[];
  totals: SalaryRegisterTotals;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>م</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>الوظيفة</TableHead>
              <TableHead className="text-center bg-green-50">الراتب</TableHead>
              <TableHead className="text-center bg-green-50">علاوة 1</TableHead>
              <TableHead className="text-center bg-green-50">علاوة 2</TableHead>
              <TableHead className="text-center bg-green-50">ب. نقل</TableHead>
              <TableHead className="text-center bg-green-50">حافز</TableHead>
              <TableHead className="text-center bg-green-100 font-bold">جملة الاستحقاق</TableHead>
              <TableHead className="text-center bg-red-50">سلفية</TableHead>
              <TableHead className="text-center bg-red-50">إجازة</TableHead>
              <TableHead className="text-center bg-red-50">جزاءات</TableHead>
              <TableHead className="text-center bg-red-50">اشتراكات</TableHead>
              <TableHead className="text-center bg-red-100 font-bold">الصافي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-gray-500 text-sm">{row.index}</TableCell>
                <TableCell className="font-medium">{row.fullName}</TableCell>
                <TableCell className="text-sm text-gray-600">{row.jobTitle}</TableCell>
                <TableCell className="text-center bg-green-50">{N(row.baseSalary)}</TableCell>
                <TableCell className="text-center bg-green-50">{row.allowance1 > 0 ? N(row.allowance1) : "—"}</TableCell>
                <TableCell className="text-center bg-green-50">{row.allowance2 > 0 ? N(row.allowance2) : "—"}</TableCell>
                <TableCell className="text-center bg-green-50">{row.transportAllowance > 0 ? N(row.transportAllowance) : "—"}</TableCell>
                <TableCell className="text-center bg-green-50">{row.bonus > 0 ? N(row.bonus) : "—"}</TableCell>
                <TableCell className="text-center bg-green-100 font-semibold text-green-700">{N(row.totalEarnings)}</TableCell>
                <TableCell className="text-center bg-red-50">{row.loan > 0 ? N(row.loan) : "—"}</TableCell>
                <TableCell className="text-center bg-red-50">{row.leaveDeduction > 0 ? N(row.leaveDeduction) : "—"}</TableCell>
                <TableCell className="text-center bg-red-50">{row.penalty > 0 ? N(row.penalty) : "—"}</TableCell>
                <TableCell className="text-center bg-red-50">{row.subscription > 0 ? N(row.subscription) : "—"}</TableCell>
                <TableCell className="text-center bg-red-100 font-bold text-blue-700">{N(row.netSalary)}</TableCell>
              </TableRow>
            ))}
            {/* Totals Row */}
            <TableRow className="bg-gray-100 font-bold text-sm">
              <TableCell colSpan={3}>الجملة</TableCell>
              <TableCell className="text-center bg-green-100">{N(totals.baseSalary)}</TableCell>
              <TableCell className="text-center bg-green-100">{N(totals.allowance1)}</TableCell>
              <TableCell className="text-center bg-green-100">{N(totals.allowance2)}</TableCell>
              <TableCell className="text-center bg-green-100">{N(totals.transportAllowance)}</TableCell>
              <TableCell className="text-center bg-green-100">{N(totals.bonus)}</TableCell>
              <TableCell className="text-center bg-green-200 text-green-800">{N(totals.totalEarnings)}</TableCell>
              <TableCell className="text-center bg-red-100">{N(totals.loan)}</TableCell>
              <TableCell className="text-center bg-red-100">{N(totals.leaveDeduction)}</TableCell>
              <TableCell className="text-center bg-red-100">{N(totals.penalty)}</TableCell>
              <TableCell className="text-center bg-red-100">{N(totals.subscription)}</TableCell>
              <TableCell className="text-center bg-red-200 text-blue-800">{N(totals.netSalary)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
