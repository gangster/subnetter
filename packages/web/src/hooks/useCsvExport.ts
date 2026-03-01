"use client";

import { useCallback } from "react";
import type { Allocation } from "@subnetter/core";
import { allocationsToCsv } from "@/utils/csv";
import { downloadFile } from "@/utils/download";

export function useCsvExport() {
  const exportCsv = useCallback(
    (allocations: Allocation[], filename = "allocations.csv") => {
      const csv = allocationsToCsv(allocations);
      downloadFile(csv, filename, "text/csv;charset=utf-8;");
    },
    []
  );

  return { exportCsv };
}
