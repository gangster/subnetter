"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus } from "lucide-react";
import { AccountEditor } from "./AccountEditor";

export function AccountsList() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "accounts",
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Accounts</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Define accounts with their cloud providers and regions.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            append({
              name: "",
              clouds: [{ provider: "aws", regions: [], baseCidr: "" }],
            })
          }
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
        >
          <Plus className="h-3 w-3" />
          Add Account
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-6 border border-dashed border-[hsl(var(--border))] rounded-md">
          No accounts defined. Add at least one account.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <AccountEditor
            key={field.id}
            index={index}
            onRemove={() => remove(index)}
          />
        ))}
      </div>
    </div>
  );
}
