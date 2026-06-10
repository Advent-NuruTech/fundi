"use client";

import { useEffect, useState } from "react";
import { CreditCard, Banknote } from "lucide-react";
import { useCustomerPortal } from "@/features/customer-portal/customer-portal-context";
import { getMyPayments, getMyOrders } from "@/services/customer-portal.service";
import type { CustomerSafeOrder } from "@/services/customer-portal.service";
import type { Payment } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";

export default function PortalPaymentsPage() {
  const { customerIds, isLoaded } = useCustomerPortal();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<CustomerSafeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !customerIds.length) {
      setLoading(false);
      return;
    }
    Promise.all([getMyPayments(customerIds), getMyOrders(customerIds)]).then(([pmts, ords]) => {
      setPayments(pmts);
      setOrders(ords);
      setLoading(false);
    });
  }, [isLoaded, customerIds]);

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalBalance = orders.reduce((s, o) => s + o.balanceAmount, 0);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-900">Payments</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-100 bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-emerald-700 mb-1">Total paid</p>
            <p className="text-xl font-bold text-emerald-900">{formatKes(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className={totalBalance > 0 ? "border-amber-100 bg-amber-50" : "border-slate-100"}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-600 mb-1">Outstanding</p>
            <p className={`text-xl font-bold ${totalBalance > 0 ? "text-amber-800" : "text-slate-700"}`}>
              {formatKes(totalBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment list */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No payments recorded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    {p.method === "mpesa" ? (
                      <CreditCard className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <Banknote className="h-4 w-4 text-emerald-700" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {p.orderNumber ?? "Payment"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(p.recordedAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="text-sm font-bold text-emerald-700">{formatKes(Number(p.amount))}</p>
                  <Badge className="text-xs capitalize">
                    {p.method}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
