"use client";

import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/shared/FormField";

export function PrefixLengthsSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const prefixErrors = errors.prefixLengths as Record<string, { message?: string }> | undefined;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Prefix Lengths</h3>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        Control CIDR block sizes at each hierarchy level (1-32).
      </p>
      <div className="grid grid-cols-3 gap-4">
        <FormField
          label="Account"
          error={prefixErrors?.account?.message}
          description="Default: /16"
        >
          <input
            type="number"
            {...register("prefixLengths.account", { valueAsNumber: true })}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm"
            min={1}
            max={32}
            placeholder="16"
          />
        </FormField>

        <FormField
          label="Region"
          error={prefixErrors?.region?.message}
          description="Default: /20"
        >
          <input
            type="number"
            {...register("prefixLengths.region", { valueAsNumber: true })}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm"
            min={1}
            max={32}
            placeholder="20"
          />
        </FormField>

        <FormField
          label="AZ"
          error={prefixErrors?.az?.message}
          description="Default: /24"
        >
          <input
            type="number"
            {...register("prefixLengths.az", { valueAsNumber: true })}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm"
            min={1}
            max={32}
            placeholder="24"
          />
        </FormField>
      </div>
    </div>
  );
}
