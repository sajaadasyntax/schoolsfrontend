"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReceiptsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/finance/payments?tab=receipts");
  }, [router]);
  return null;
}
