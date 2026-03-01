"use client";

import { useMemo } from "react";
import type { Allocation } from "@subnetter/core";
import { buildCidrTree, type TreeNode } from "@/utils/cidrHierarchy";

export function useCidrTree(
  allocations: Allocation[],
  baseCidr: string
): TreeNode | null {
  return useMemo(() => {
    if (!allocations.length || !baseCidr) return null;
    return buildCidrTree(allocations, baseCidr);
  }, [allocations, baseCidr]);
}
