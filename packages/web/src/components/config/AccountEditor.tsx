"use client";

import { useFormContext } from "react-hook-form";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { CloudEditor } from "./CloudEditor";
import { useState } from "react";

interface AccountEditorProps {
  index: number;
  onRemove: () => void;
}

export function AccountEditor({ index, onRemove }: AccountEditorProps) {
  const { register, watch } = useFormContext();
  const [expanded, setExpanded] = useState(true);
  const name = watch(`accounts.${index}.name`);

  return (
    <div className="rounded-md border border-[hsl(var(--border))] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-0.5"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <input
          {...register(`accounts.${index}.name`)}
          className="flex-1 rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-1.5 text-sm"
          placeholder="Account name (e.g., production)"
        />
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && <CloudEditor accountIndex={index} />}
    </div>
  );
}
