"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  shouldGenerateWeeklyReport,
  generateWeeklyReportData,
  storeWeeklyReportNotification,
} from "@/services/weekly-report.service";
import type { FinanceData } from "@/services/finance.service";

const STORAGE_KEY = "fundiflow_weekly_report_generated";

export function useWeeklyReport(businessId: string, data: FinanceData | null) {
  const { user } = useAuth();
  const checked = useRef(false);

  useEffect(() => {
    if (!data || !user || checked.current) return;

    const today = new Date().toISOString().slice(0, 10);
    const alreadyGenerated = localStorage.getItem(STORAGE_KEY);

    if (alreadyGenerated === today) {
      checked.current = true;
      return;
    }

    if (!shouldGenerateWeeklyReport()) {
      return;
    }

    const report = generateWeeklyReportData(
      data.payments,
      data.expenses,
      data.withdrawals,
      data.orders.filter((o) => {
        const d = o.createdAt?.toDate?.() ?? new Date();
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
        weekStart.setHours(0, 0, 0, 0);
        return d >= weekStart;
      }).length
    );

    storeWeeklyReportNotification(businessId, report, user.uid).catch(console.error);
    localStorage.setItem(STORAGE_KEY, today);
    checked.current = true;
  }, [data, user, businessId]);
}
