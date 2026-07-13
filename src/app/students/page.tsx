"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Student, Branch, Class } from "@/lib/api";
import { getStudentStatusLabel, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StudentsPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // List filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterBranchId, setFilterBranchId] = useState("ALL");
  const [filterClassId, setFilterClassId] = useState("ALL");
  const [filterClasses, setFilterClasses] = useState<Class[]>([]);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "", parentName: "", parentPhone: "", gender: "MALE",
    classId: "", branchId: "", status: "ACTIVE", notes: ""
  });
  const [dialogClasses, setDialogClasses] = useState<Class[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterStatus !== "ALL") params.status = filterStatus;
      if (filterBranchId !== "ALL") params.branchId = filterBranchId;
      if (filterClassId !== "ALL") params.classId = filterClassId;
      const [s, b] = await Promise.all([api.getStudents(params), api.getBranches()]);
      setStudents(s);
      setBranches(b);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل الطلاب", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search, filterStatus, filterBranchId, filterClassId]);

  async function handleFilterBranchChange(branchId: string) {
    setFilterBranchId(branchId);
    setFilterClassId("ALL");
    if (branchId === "ALL") {
      setFilterClasses([]);
      return;
    }
    const branch = await api.getBranch(branchId);
    setFilterClasses(branch.classes);
  }

  async function handleDialogBranchChange(branchId: string) {
    setForm({ ...form, branchId, classId: "" });
    if (!branchId) { setDialogClasses([]); return; }
    const branch = await api.getBranch(branchId);
    setDialogClasses(branch.classes);
  }

  function openDialog() {
    setForm({ fullName: "", parentName: "", parentPhone: "", gender: "MALE", classId: "", branchId: "", status: "ACTIVE", notes: "" });
    setDialogClasses([]);
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!form.fullName || !form.branchId) {
      toast({ title: "خطأ", description: "الاسم والفرع مطلوبان", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await api.createStudent(form);
      toast({ title: "تم إضافة الطالب" });
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب؟")) return;
    try {
      await api.deleteStudent(id);
      toast({ title: "تم الحذف" });
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "default", INACTIVE: "secondary", GRADUATED: "outline"
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">الطلاب ({students.length})</h1>
          <Button onClick={openDialog}>
            <Plus className="w-4 h-4 ml-1" /> إضافة طالب
          </Button>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-4">
            {/* Search + Status */}
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input placeholder="بحث..." className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">الكل</SelectItem>
                  <SelectItem value="ACTIVE">نشط</SelectItem>
                  <SelectItem value="INACTIVE">غير نشط</SelectItem>
                  <SelectItem value="GRADUATED">متخرج</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Branch radio filter */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">الفرع</p>
              <RadioGroup
                value={filterBranchId}
                onValueChange={handleFilterBranchChange}
                className="flex flex-wrap gap-x-6 gap-y-2"
                dir="rtl"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ALL" id="branch-all" />
                  <Label htmlFor="branch-all" className="cursor-pointer font-normal">الكل</Label>
                </div>
                {branches.map((b) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <RadioGroupItem value={b.id} id={`branch-${b.id}`} />
                    <Label htmlFor={`branch-${b.id}`} className="cursor-pointer font-normal">{b.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Class radio filter — shown only when a branch is selected */}
            {filterBranchId !== "ALL" && filterClasses.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">الفصل</p>
                <RadioGroup
                  value={filterClassId}
                  onValueChange={setFilterClassId}
                  className="flex flex-wrap gap-x-6 gap-y-2"
                  dir="rtl"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ALL" id="class-all" />
                    <Label htmlFor="class-all" className="cursor-pointer font-normal">الكل</Label>
                  </div>
                  {filterClasses.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <RadioGroupItem value={c.id} id={`class-${c.id}`} />
                      <Label htmlFor={`class-${c.id}`} className="cursor-pointer font-normal">{c.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>ولي الأمر</TableHead>
                  <TableHead>الفصل</TableHead>
                  <TableHead>الفرع</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow>
                ) : students.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">لا يوجد طلاب</TableCell></TableRow>
                ) : students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.fullName}</TableCell>
                    <TableCell>{s.parentName || "-"}</TableCell>
                    <TableCell>{s.class?.name || "-"}</TableCell>
                    <TableCell>{s.branch?.name || "-"}</TableCell>
                    <TableCell>{formatDate(s.enrollmentDate)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[s.status] as "default" | "secondary" | "outline"}>
                        {getStudentStatusLabel(s.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/students/${s.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Student Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إضافة طالب جديد</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>الاسم الكامل *</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <Label>اسم ولي الأمر</Label>
              <Input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} />
            </div>
            <div>
              <Label>هاتف ولي الأمر</Label>
              <Input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} />
            </div>
            <div>
              <Label>الجنس</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">ذكر</SelectItem>
                  <SelectItem value="FEMALE">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">نشط</SelectItem>
                  <SelectItem value="INACTIVE">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Branch radios */}
            <div className="col-span-2">
              <Label className="mb-2 block">الفرع *</Label>
              <RadioGroup
                value={form.branchId}
                onValueChange={handleDialogBranchChange}
                className="flex flex-wrap gap-x-5 gap-y-2"
                dir="rtl"
              >
                {branches.map((b) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <RadioGroupItem value={b.id} id={`dlg-branch-${b.id}`} />
                    <Label htmlFor={`dlg-branch-${b.id}`} className="cursor-pointer font-normal">{b.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Class radios — shown only after branch selected */}
            {form.branchId && dialogClasses.length > 0 && (
              <div className="col-span-2">
                <Label className="mb-2 block">الفصل</Label>
                <RadioGroup
                  value={form.classId}
                  onValueChange={(v) => setForm({ ...form, classId: v })}
                  className="flex flex-wrap gap-x-5 gap-y-2"
                  dir="rtl"
                >
                  {dialogClasses.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <RadioGroupItem value={c.id} id={`dlg-class-${c.id}`} />
                      <Label htmlFor={`dlg-class-${c.id}`} className="cursor-pointer font-normal">{c.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="col-span-2 flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "جارٍ الإضافة..." : "إضافة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
