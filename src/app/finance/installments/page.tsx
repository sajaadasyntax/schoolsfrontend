"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Installment } from "@/lib/api";
import { formatCurrency, formatDate, getInstallmentStatusLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "default", PARTIAL: "secondary", PENDING: "outline", OVERDUE: "destructive"
};

export default function InstallmentsPage() {
  const { toast } = useToast();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [payDialog, setPayDialog] = useState(false);
  const [selected, setSelected] = useState<Installment | null>(null);
  const [payAmount, setPayAmount] = useState("");

  async function load() {
    try {
      await api.markOverdueInstallments();
      const params: Record<string, string> = {};
      if (filterStatus !== "ALL") params.status = filterStatus;
      const data = await api.getInstallments(params);
      setInstallments(data);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل الأقساط", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterStatus]);

  async function handlePay() {
    if (!selected) return;
    try {
      await api.updateInstallment(selected.id, Number(payAmount));
      toast({ title: "تم تسجيل الدفعة" });
      setPayDialog(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  const counts = {
    PENDING: installments.filter((i) => i.status === "PENDING").length,
    PARTIAL: installments.filter((i) => i.status === "PARTIAL").length,
    OVERDUE: installments.filter((i) => i.status === "OVERDUE").length,
    PAID: installments.filter((i) => i.status === "PAID").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">الأقساط ({installments.length})</h1>

        <div className="grid grid-cols-4 gap-3">
          {[["PENDING", "معلق", "bg-yellow-50 text-yellow-700"], ["PARTIAL", "جزئي", "bg-blue-50 text-blue-700"], ["OVERDUE", "متأخر", "bg-red-50 text-red-700"], ["PAID", "مدفوع", "bg-green-50 text-green-700"]].map(([key, label, colors]) => (
            <div key={key} className={`rounded-lg p-3 text-center ${colors}`}>
              <div className="text-xl font-bold">{counts[key as keyof typeof counts]}</div>
              <div className="text-sm">{label}</div>
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="pt-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">الكل</SelectItem>
                <SelectItem value="PENDING">معلق</SelectItem>
                <SelectItem value="PARTIAL">جزئي</SelectItem>
                <SelectItem value="OVERDUE">متأخر</SelectItem>
                <SelectItem value="PAID">مدفوع</SelectItem>
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
                  <TableHead>المبلغ</TableHead>
                  <TableHead>المدفوع</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow>
                ) : installments.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">لا توجد أقساط</TableCell></TableRow>
                ) : installments.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.student?.fullName}</TableCell>
                    <TableCell>{formatCurrency(Number(inst.amount))}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(Number(inst.paidAmount))}</TableCell>
                    <TableCell className="text-red-600">{formatCurrency(Number(inst.amount) - Number(inst.paidAmount))}</TableCell>
                    <TableCell>{formatDate(inst.dueDate)}</TableCell>
                    <TableCell><Badge variant={statusVariants[inst.status]}>{getInstallmentStatusLabel(inst.status)}</Badge></TableCell>
                    <TableCell>
                      {inst.status !== "PAID" && (
                        <Button size="sm" variant="outline" onClick={() => { setSelected(inst); setPayAmount(String(Number(inst.amount) - Number(inst.paidAmount))); setPayDialog(true); }}>
                          دفع
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>تسجيل دفعة قسط</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">الطالب: <strong>{selected?.student?.fullName}</strong></p>
            <p className="text-sm text-gray-600">المبلغ المتبقي: <strong>{formatCurrency(Number(selected?.amount) - Number(selected?.paidAmount))}</strong></p>
            <div><Label>المبلغ المدفوع</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setPayDialog(false)}>إلغاء</Button><Button onClick={handlePay}>تسجيل</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
