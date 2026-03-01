"use client";

import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/shared/FormField";

export function BaseCidrField() {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <FormField
      label="Base CIDR"
      error={errors.baseCidr?.message as string}
      required
      description="The root IPv4 CIDR block for all allocations (e.g., 10.0.0.0/8)"
    >
      <input
        {...register("baseCidr")}
        className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm font-mono"
        placeholder="10.0.0.0/8"
      />
    </FormField>
  );
}
