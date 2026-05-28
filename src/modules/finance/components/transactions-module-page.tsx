"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { listenTransactions } from "@/services/finance.service";
import type { Transaction, TransactionType } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatKes } from "@/lib/utils";

const TYPE_LABELS: Record<TransactionType, string> = {
  payment_received: "Payment Received",
  expense: "Expense",
  withdrawal: "Withdrawal",
  inventory_purchase: "Inventory Purchase",
  refund: "Refund",
  adjustment: "Adjustment",
};

const TYPE_VARIANTS: Record<TransactionType, "success" | "danger" | "warning" | "default"> = {
  payment_received: "success",
  expense: "danger",
  withdrawal: "warning",
  inventory_purchase: "warning",
  refund: "danger",
  adjustment: "default",
};

export function TransactionsModulePage() {
  const { businessId, ready } = useBusinessContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    if (!ready) return;
    return listenTransactions(businessId, setTransactions);
  }, [businessId, ready]);

  const filtered = useMemo(() => {
    let result = transactions;

    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (dateFilter !== "all") {
      const now = new Date();
      let start: Date;
      switch (dateFilter) {
        case "today":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week": {
          start = new Date(now);
          start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1));
          start.setHours(0, 0, 0, 0);
          break;
        }
        case "month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          start = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          start = new Date(0);
      }
      result = result.filter((t) => {
        const d = t.createdAt?.toDate?.() ?? new Date();
        return d >= start;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.referenceLabel || "").toLowerCase().includes(q) ||
          (t.linkedEntityName || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, typeFilter, dateFilter, search]);

  const totals = useMemo(() => {
    const cashIn = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const cashOut = filtered.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { cashIn, cashOut, net: cashIn - cashOut };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Transaction Ledger</h1>
        <p className="text-sm text-slate-500">Unified view of all financial transactions</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Cash In (filtered)</p>
            <p className="text-2xl font-bold text-emerald-600">{formatKes(totals.cashIn)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Cash Out (filtered)</p>
            <p className="text-2xl font-bold text-rose-600">{formatKes(totals.cashOut)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Net Flow</p>
            <p className={`text-2xl font-bold ${totals.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {totals.net >= 0 ? "+" : ""}{formatKes(totals.net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search transactions..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
        <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Filter className="h-8 w-8" />}
              title="No transactions found"
              description="Try adjusting your filters."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs text-slate-500">
                      {tx.createdAt?.toDate?.().toLocaleString() ?? "-"}
                    </TableCell>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell>
                      <Badge variant={TYPE_VARIANTS[tx.type] || "default"} className="text-xs">
                        {tx.type === "payment_received" || tx.type === "expense" ? (
                          tx.type === "payment_received" ? (
                            <ArrowUpRight className="mr-1 h-3 w-3 inline" />
                          ) : (
                            <ArrowDownRight className="mr-1 h-3 w-3 inline" />
                          )
                        ) : null}
                        {TYPE_LABELS[tx.type] || tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{tx.referenceLabel || tx.referenceId?.slice(0, 8) || "-"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{tx.linkedEntityName || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.status === "completed" ? "success" : tx.status === "pending" ? "warning" : "danger"}
                        className="text-xs"
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${tx.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {tx.amount >= 0 ? "+" : ""}{formatKes(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
