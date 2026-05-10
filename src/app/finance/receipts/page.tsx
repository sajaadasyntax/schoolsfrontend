"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, apiBaseUrl, Payment } from "@/lib/api";
import { formatCurrency, formatDate, getPaymentMethodLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, RefreshCw, ExternalLink, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReceiptsPage() {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchNumber, setSearchNumber] = useState("");
  const [searchResult, setSearchResult] = useState<Payment | null | "not-found">(null);
  const [searching, setSearching] = useState(false);

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  async function loadRecent() {
    setLoading(true);
    try {
      const data = await api.getRecentReceipts(50);
      setReceipts(data);
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل الإيصالات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRecent(); }, []);

  async function handleSearch() {
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

  const displayList = searchResult && searchResult !== "not-found"
    ? [searchResult]
    : searchResult === null
      ? receipts
      : [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">الإيصالات</h1>
          <Button variant="outline" size="sm" onClick={loadRecent} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-1 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>

        {/* Search bar */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2 items-center">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <Input
                placeholder="بحث برقم الإيصال..."
                value={searchNumber}
                onChange={(e) => {
                  setSearchNumber(e.target.value);
                  if (!e.target.value) setSearchResult(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-sm"
              />
              <Button onClick={handleSearch} disabled={searching || !searchNumber.trim()} size="sm">
                {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "بحث"}
              </Button>
              {searchResult !== null && (
                <Button variant="ghost" size="sm" onClick={() => { setSearchResult(null); setSearchNumber(""); }}>
                  إلغاء البحث
                </Button>
              )}
            </div>
            {searchResult === "not-found" && (
              <p className="text-sm text-red-600 mt-2">لم يتم العثور على إيصال بهذا الرقم.</p>
            )}
          </CardContent>
        </Card>

        {/* Receipts list */}
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
                {loading ? (
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
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightboxSrc} onOpenChange={() => setLightboxSrc(null)}>
        <DialogContent className="max-w-3xl w-[95vw] p-2">
          {lightboxSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightboxSrc} alt="إيصال" className="max-w-full max-h-[85vh] object-contain rounded mx-auto block" />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
