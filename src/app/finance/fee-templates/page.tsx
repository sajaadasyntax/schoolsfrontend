"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Branch, Class, ClassFeeTemplate } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, Play, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BUCKET_COLS = [
  { key: "registration", label: "التسجيل" },
  { key: "installment1", label: "القسط 1" },
  { key: "installment2", label: "القسط 2" },
  { key: "installment3", label: "القسط 3" },
  { key: "installment4", label: "القسط 4" },
  { key: "books", label: "كتب" },
  { key: "uniform", label: "زي" },
] as const;

type BucketKey = (typeof BUCKET_COLS)[number]["key"];

type RowState = Record<BucketKey, string> & { dirty: boolean; saving: boolean; applying: boolean; templateId?: string };

const emptyRow = (): RowState => ({
  registration: "0",
  installment1: "0",
  installment2: "0",
  installment3: "0",
  installment4: "0",
  books: "0",
  uniform: "0",
  dirty: false,
  saving: false,
  applying: false,
});

function templateToRow(t: ClassFeeTemplate): RowState {
  return {
    registration: String(t.registration),
    installment1: String(t.installment1),
    installment2: String(t.installment2),
    installment3: String(t.installment3),
    installment4: String(t.installment4),
    books: String(t.books),
    uniform: String(t.uniform),
    dirty: false,
    saving: false,
    applying: false,
    templateId: t.id,
  };
}

export default function FeeTemplatesPage() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [bs, templates] = await Promise.all([
        api.getBranches(),
        api.getFeeTemplates({ academicYear }),
      ]);
      setBranches(bs);

      // Collect all classes from branch details
      const allClasses: Class[] = [];
      for (const b of bs) {
        const detail = await api.getBranch(b.id);
        allClasses.push(...detail.classes.map((c) => ({ ...c, branchId: b.id, branch: b } as unknown as Class)));
      }
      setClasses(allClasses);

      const initialRows: Record<string, RowState> = {};
      for (const cls of allClasses) {
        const t = templates.find((t) => t.classId === cls.id);
        initialRows[cls.id] = t ? templateToRow(t) : emptyRow();
      }
      setRows(initialRows);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [academicYear]);

  const updateCell = useCallback((classId: string, key: BucketKey, value: string) => {
    setRows((prev) => ({
      ...prev,
      [classId]: { ...prev[classId], [key]: value, dirty: true },
    }));
  }, []);

  async function saveRow(classId: string) {
    const row = rows[classId];
    if (!row) return;
    setRows((prev) => ({ ...prev, [classId]: { ...prev[classId], saving: true } }));
    try {
      await api.upsertFeeTemplate(classId, {
        academicYear,
        registration: Number(row.registration),
        installment1: Number(row.installment1),
        installment2: Number(row.installment2),
        installment3: Number(row.installment3),
        installment4: Number(row.installment4),
        books: Number(row.books),
        uniform: Number(row.uniform),
      });
      setRows((prev) => ({ ...prev, [classId]: { ...prev[classId], dirty: false, saving: false } }));
      toast({ title: "تم الحفظ" });
    } catch (e: unknown) {
      setRows((prev) => ({ ...prev, [classId]: { ...prev[classId], saving: false } }));
      toast({ title: "خطأ", description: e instanceof Error ? e.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function applyToStudents(classId: string) {
    setRows((prev) => ({ ...prev, [classId]: { ...prev[classId], applying: true } }));
    try {
      const result = await api.applyFeeTemplate(classId, academicYear);
      toast({
        title: "تم التطبيق",
        description: `تم إنشاء ${result.created} رسوم، تخطي ${result.skipped} موجودة`,
      });
    } catch (e: unknown) {
      toast({ title: "خطأ", description: e instanceof Error ? e.message : "حدث خطأ", variant: "destructive" });
    } finally {
      setRows((prev) => ({ ...prev, [classId]: { ...prev[classId], applying: false } }));
    }
  }

  const filteredClasses = selectedBranch === "ALL"
    ? classes
    : classes.filter((c) => c.branchId === selectedBranch);

  const totalForRow = (row: RowState) =>
    BUCKET_COLS.reduce((s, col) => s + (Number(row[col.key]) || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">قوالب الرسوم الدراسية</h1>
        <p className="text-gray-500 text-sm">
          حدد مبالغ كل بند (التسجيل، الأقساط، الكتب، الزي) لكل فصل دراسي، ثم طبّقها على الطلاب.
        </p>

        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label>السنة الدراسية</Label>
                <Input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2024-2025"
                  className="w-36"
                />
              </div>
              <div>
                <Label>الفرع</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">جميع الفروع</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={loadData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ml-1 ${loading ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>جدول الرسوم ({filteredClasses.length} فصل)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">الفصل</TableHead>
                  <TableHead>الفرع</TableHead>
                  {BUCKET_COLS.map((col) => (
                    <TableHead key={col.key} className="min-w-[110px] text-center">{col.label}</TableHead>
                  ))}
                  <TableHead className="text-center">الإجمالي</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={BUCKET_COLS.length + 4} className="text-center py-10">
                      جارٍ التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={BUCKET_COLS.length + 4} className="text-center py-10 text-gray-500">
                      لا توجد فصول
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClasses.map((cls) => {
                    const row = rows[cls.id] || emptyRow();
                    const total = totalForRow(row);
                    return (
                      <TableRow key={cls.id}>
                        <TableCell className="font-medium">
                          {cls.name}
                          {row.dirty && <Badge variant="outline" className="ml-2 text-xs">معدّل</Badge>}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {(cls as unknown as { branch?: { name: string } }).branch?.name || "-"}
                        </TableCell>
                        {BUCKET_COLS.map((col) => (
                          <TableCell key={col.key} className="p-1">
                            <Input
                              type="number"
                              min={0}
                              value={row[col.key]}
                              onChange={(e) => updateCell(cls.id, col.key, e.target.value)}
                              className="text-center h-8 text-sm"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-semibold text-blue-700">
                          {formatNumber(total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveRow(cls.id)}
                              disabled={row.saving || !row.dirty}
                              title="حفظ القالب"
                            >
                              {row.saving ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => applyToStudents(cls.id)}
                              disabled={row.applying || row.dirty}
                              title="تطبيق على الطلاب"
                            >
                              {row.applying ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="text-xs text-gray-400 space-y-1">
          <p><Save className="w-3 h-3 inline ml-1" />حفظ: يحفظ القالب دون التأثير على الطلاب.</p>
          <p><Play className="w-3 h-3 inline ml-1" />تطبيق: ينشئ رسوماً للطلاب النشطين في هذا الفصل (يتخطى الموجودة).</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
