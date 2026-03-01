import { create } from "zustand";
import type { Allocation } from "@subnetter/core";
import type { ValidationResult } from "@subnetter/core";

interface AllocationState {
  allocations: Allocation[];
  validationResult: ValidationResult | null;
  isGenerating: boolean;
  filters: {
    provider: string | null;
    account: string | null;
    region: string | null;
  };
  setAllocations: (allocations: Allocation[]) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setFilter: (key: "provider" | "account" | "region", value: string | null) => void;
  clearFilters: () => void;
  reset: () => void;
}

export const useAllocationStore = create<AllocationState>((set) => ({
  allocations: [],
  validationResult: null,
  isGenerating: false,
  filters: { provider: null, account: null, region: null },
  setAllocations: (allocations) => set({ allocations }),
  setValidationResult: (validationResult) => set({ validationResult }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  clearFilters: () =>
    set({ filters: { provider: null, account: null, region: null } }),
  reset: () =>
    set({
      allocations: [],
      validationResult: null,
      isGenerating: false,
      filters: { provider: null, account: null, region: null },
    }),
}));
