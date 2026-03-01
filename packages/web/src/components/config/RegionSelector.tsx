"use client";

import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { PROVIDER_REGIONS } from "@/utils/constants";

interface RegionSelectorProps {
  basePath: string;
}

export function RegionSelector({ basePath }: RegionSelectorProps) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${basePath}.regions`,
  });
  const [newRegion, setNewRegion] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const provider = useWatch({ control, name: `${basePath}.provider` }) as string;
  const currentRegions = useWatch({ control, name: `${basePath}.regions` }) as string[];

  const allRegions = PROVIDER_REGIONS[provider] || [];
  const selectedSet = new Set(currentRegions || []);
  const availableRegions = allRegions.filter((r) => !selectedSet.has(r));

  const filtered = newRegion.trim()
    ? availableRegions.filter((r) =>
        r.toLowerCase().includes(newRegion.toLowerCase())
      )
    : availableRegions;

  const addRegion = (region?: string) => {
    const value = region || newRegion.trim();
    if (value && !selectedSet.has(value)) {
      append(value);
      setNewRegion("");
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected regions as tags */}
      <div className="flex flex-wrap gap-1.5">
        {fields.map((field, index) => (
          <span
            key={field.id}
            className="inline-flex items-center gap-1 rounded-md bg-[hsl(var(--muted))] px-2 py-1 text-xs"
          >
            <input
              {...register(`${basePath}.regions.${index}`)}
              className="bg-transparent border-none outline-none text-xs w-24"
              readOnly
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="hover:text-[hsl(var(--destructive))]"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Input with autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            value={newRegion}
            onChange={(e) => {
              setNewRegion(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filtered.length > 0) {
                  addRegion(filtered[0]);
                } else {
                  addRegion();
                }
              }
            }}
            className="flex-1 rounded-md border border-[hsl(var(--input))] bg-transparent px-2 py-1 text-xs"
            placeholder={`Search or type a region...`}
          />
          <button
            type="button"
            onClick={() => addRegion()}
            className="rounded-md p-1 hover:bg-[hsl(var(--accent))]"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Dropdown suggestions */}
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] shadow-md">
            {filtered.map((region) => (
              <button
                key={region}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  addRegion(region);
                  setShowSuggestions(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-[hsl(var(--accent))] cursor-pointer"
              >
                {region}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
