"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, InventoryCategory, InventoryItem, InventoryDistribution, Student, Branch } from "@/lib/api";
import { formatDate, formatCurrency, getInventoryCategoryTypeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, AlertTriangle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InventoryPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [distributions, setDistributions] = useState<InventoryDistribution[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [catDialog, setCatDialog] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", type: "CUSTOM", description: "", branchId: "" });

  const [itemDialog, setItemDialog] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", categoryId: "", branchId: "", quantity: "0", minQuantity: "0", unitPrice: "", description: "" });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const [distDialog, setDistDialog] = useState(false);
  const [distForm, setDistForm] = useState({ itemId: "", studentId: "", quantity: "1", notes: "" });

  async function load() {
    try {
      const [c, i, d, s, b, ls] = await Promise.all([
        api.getInventoryCategories(),
        api.getInventoryItems(),
        api.getDistributions(),
        api.getStudents({ status: "ACTIVE" }),
        api.getBranches(),
        api.getLowStockItems(),
      ]);
      setCategories(c);
      setItems(i);
      setDistributions(d);
      setStudents(s);
      setBranches(b);
      setLowStock(ls);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل بيانات المستودع", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreateCategory() {
    try {
      await api.createInventoryCategory(catForm);
      toast({ title: "تم إنشاء الفئة" });
      setCatDialog(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function handleCreateItem() {
    try {
      const fd = new FormData();
      fd.append("name", itemForm.name);
      fd.append("categoryId", itemForm.categoryId);
      fd.append("branchId", itemForm.branchId);
      fd.append("quantity", itemForm.quantity);
      fd.append("minQuantity", itemForm.minQuantity);
      if (itemForm.unitPrice) fd.append("unitPrice", itemForm.unitPrice);
      if (itemForm.description) fd.append("description", itemForm.description);
      if (invoiceFile) fd.append("invoice", invoiceFile);
      await api.createInventoryItem(fd);
      toast({ title: "تم إضافة العنصر" });
      setItemDialog(false);
      setInvoiceFile(null);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  async function handleDistribute() {
    try {
      await api.distributeItem({ ...distForm, quantity: Number(distForm.quantity) });
      toast({ title: "تم التوزيع" });
      setDistDialog(false);
      load();
    } catch (err: unknown) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">إدارة المستودع</h1>
          {lowStock.length > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4" />
              {lowStock.length} عنصر منخفض المخزون
            </div>
          )}
        </div>

        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">العناصر ({items.length})</TabsTrigger>
            <TabsTrigger value="categories">الفئات ({categories.length})</TabsTrigger>
            <TabsTrigger value="distributions">التوزيعات ({distributions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>عناصر المستودع</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setDistForm({ itemId: "", studentId: "", quantity: "1", notes: "" }); setDistDialog(true); }}>
                    توزيع
                  </Button>
                  <Button size="sm" onClick={() => { setItemForm({ name: "", categoryId: "", branchId: "", quantity: "0", minQuantity: "0", unitPrice: "", description: "" }); setItemDialog(true); }}>
                    <Plus className="w-4 h-4 ml-1" /> إضافة عنصر
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الفئة</TableHead><TableHead>الفرع</TableHead><TableHead>الكمية</TableHead><TableHead>الحد الأدنى</TableHead><TableHead>السعر</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow>
                      : items.map((item) => (
                        <TableRow key={item.id} className={item.quantity <= item.minQuantity ? "bg-yellow-50" : ""}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category?.name}</TableCell>
                          <TableCell>{item.branch?.name}</TableCell>
                          <TableCell className={item.quantity <= item.minQuantity ? "text-red-600 font-bold" : ""}>{item.quantity}</TableCell>
                          <TableCell>{item.minQuantity}</TableCell>
                          <TableCell>{item.unitPrice ? formatCurrency(Number(item.unitPrice)) : "-"}</TableCell>
                          <TableCell>
                            {item.quantity <= item.minQuantity
                              ? <Badge variant="destructive">منخفض</Badge>
                              : <Badge variant="default">متوفر</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>فئات المستودع</CardTitle>
                <Button size="sm" onClick={() => { setCatForm({ name: "", type: "CUSTOM", description: "", branchId: "" }); setCatDialog(true); }}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة فئة
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        <p className="text-sm text-gray-500">{getInventoryCategoryTypeLabel(cat.type)} | {cat._count?.items ?? 0} عنصر</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={async () => { await api.deleteInventoryCategory(cat.id); load(); }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distributions">
            <Card>
              <CardHeader><CardTitle>سجل التوزيعات</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>العنصر</TableHead><TableHead>الطالب</TableHead><TableHead>الكمية</TableHead><TableHead>التاريخ</TableHead><TableHead>موزع بواسطة</TableHead><TableHead>ملاحظات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {distributions.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.item?.name}</TableCell>
                        <TableCell>{d.student?.fullName}</TableCell>
                        <TableCell>{d.quantity}</TableCell>
                        <TableCell>{formatDate(d.distributionDate)}</TableCell>
                        <TableCell>{d.distributedBy?.name}</TableCell>
                        <TableCell>{d.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {distributions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">لا توجد توزيعات</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة فئة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الاسم *</Label><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></div>
            <div><Label>النوع</Label>
              <Select value={catForm.type} onValueChange={(v) => setCatForm({ ...catForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="TEXTBOOK">كتب مدرسية</SelectItem><SelectItem value="UNIFORM">زي مدرسي</SelectItem><SelectItem value="CUSTOM">مخصص</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>الفرع *</Label>
              <Select value={catForm.branchId} onValueChange={(v) => setCatForm({ ...catForm, branchId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setCatDialog(false)}>إلغاء</Button><Button onClick={handleCreateCategory}>إنشاء</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={(open) => { setItemDialog(open); if (!open) setInvoiceFile(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة عنصر</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الاسم *</Label><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></div>
            <div><Label>الفرع *</Label>
              <Select value={itemForm.branchId} onValueChange={(v) => setItemForm({ ...itemForm, branchId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الفئة *</Label>
              <Select value={itemForm.categoryId} onValueChange={(v) => setItemForm({ ...itemForm, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الكمية</Label><Input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} /></div>
              <div><Label>الحد الأدنى</Label><Input type="number" value={itemForm.minQuantity} onChange={(e) => setItemForm({ ...itemForm, minQuantity: e.target.value })} /></div>
            </div>
            <div><Label>سعر الوحدة</Label><Input type="number" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} /></div>
            <div>
              <Label>فاتورة الشراء (اختياري)</Label>
              <div className="mt-1">
                <label className="cursor-pointer flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 w-fit">
                  <Upload className="w-4 h-4" />
                  {invoiceFile ? invoiceFile.name : "رفع فاتورة (صورة أو PDF)"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  />
                </label>
                {invoiceFile && (
                  <button className="text-xs text-red-500 mt-1 hover:underline" onClick={() => setInvoiceFile(null)}>
                    إزالة الملف
                  </button>
                )}
              </div>
              {itemForm.unitPrice && itemForm.quantity && (
                <p className="text-xs text-gray-500 mt-1">
                  سيُضاف تلقائياً للمصاريف: {(parseFloat(itemForm.unitPrice || "0") * parseInt(itemForm.quantity || "0")).toLocaleString("ar-SD")} ج.س
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setItemDialog(false)}>إلغاء</Button><Button onClick={handleCreateItem}>إضافة</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Distribute Dialog */}
      <Dialog open={distDialog} onOpenChange={setDistDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>توزيع عنصر على طالب</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>العنصر *</Label>
              <Select value={distForm.itemId} onValueChange={(v) => setDistForm({ ...distForm, itemId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر العنصر" /></SelectTrigger>
                <SelectContent>{items.filter((i) => i.quantity > 0).map((i) => <SelectItem key={i.id} value={i.id}>{i.name} (متاح: {i.quantity})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الطالب *</Label>
              <Select value={distForm.studentId} onValueChange={(v) => setDistForm({ ...distForm, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الكمية</Label><Input type="number" min="1" value={distForm.quantity} onChange={(e) => setDistForm({ ...distForm, quantity: e.target.value })} /></div>
            <div><Label>ملاحظات</Label><Input value={distForm.notes} onChange={(e) => setDistForm({ ...distForm, notes: e.target.value })} /></div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setDistDialog(false)}>إلغاء</Button><Button onClick={handleDistribute}>توزيع</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
