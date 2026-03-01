"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { RegionSelector } from "./RegionSelector";
import { CLOUD_PROVIDERS, PROVIDER_LABELS } from "@/utils/constants";

interface CloudEditorProps {
  accountIndex: number;
}

export function CloudEditor({ accountIndex }: CloudEditorProps) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `accounts.${accountIndex}.clouds`,
  });

  return (
    <div className="space-y-3 pl-4 border-l-2 border-[hsl(var(--border))]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
          Cloud Providers
        </span>
        <button
          type="button"
          onClick={() =>
            append({ provider: "aws", regions: [], baseCidr: "" })
          }
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs hover:bg-[hsl(var(--accent))]"
        >
          <Plus className="h-3 w-3" />
          Add Cloud
        </button>
      </div>

      {fields.map((field, cloudIndex) => (
        <div
          key={field.id}
          className="rounded-md border border-[hsl(var(--border))] p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <select
              {...register(
                `accounts.${accountIndex}.clouds.${cloudIndex}.provider`
              )}
              className="rounded-md border border-[hsl(var(--input))] bg-transparent px-2 py-1 text-sm"
            >
              {CLOUD_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(cloudIndex)}
              className="rounded-md p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          <div>
            <input
              {...register(
                `accounts.${accountIndex}.clouds.${cloudIndex}.baseCidr`
              )}
              className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-2 py-1 text-xs font-mono"
              placeholder="Override CIDR (optional)"
            />
          </div>

          <div>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              Regions
            </span>
            <RegionSelector
              basePath={`accounts.${accountIndex}.clouds.${cloudIndex}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
