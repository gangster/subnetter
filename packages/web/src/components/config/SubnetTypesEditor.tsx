"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

export function SubnetTypesEditor() {
  const { register, control, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "subnetTypesArray",
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Subnet Types</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Define subnet roles and their prefix lengths.
          </p>
        </div>
        <button
          type="button"
          onClick={() => append({ name: "", prefixLength: 24 })}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
        >
          <Plus className="h-3 w-3" />
          Add Type
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4 border border-dashed border-[hsl(var(--border))] rounded-md">
          No subnet types defined. Add at least one.
        </p>
      )}

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-3">
            <input
              {...register(`subnetTypesArray.${index}.name`)}
              className="flex-1 rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm"
              placeholder="e.g., public, private, database"
            />
            <div className="flex items-center gap-1">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                /
              </span>
              <input
                type="number"
                {...register(`subnetTypesArray.${index}.prefixLength`, {
                  valueAsNumber: true,
                })}
                className="w-16 rounded-md border border-[hsl(var(--input))] bg-transparent px-2 py-2 text-sm"
                min={1}
                max={32}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
