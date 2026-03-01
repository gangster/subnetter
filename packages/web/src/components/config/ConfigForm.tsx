"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { configSchema } from "@subnetter/core";
import { useConfigStore } from "@/stores/configStore";
import { useAllocationStore } from "@/stores/allocationStore";
import { trpc } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useState, useEffect } from "react";

import { BaseCidrField } from "./BaseCidrField";
import { PrefixLengthsSection } from "./PrefixLengthsSection";
import { SubnetTypesEditor } from "./SubnetTypesEditor";
import { AccountsList } from "./AccountsList";
import { ConfigJsonPreview } from "./ConfigJsonPreview";
import { ConfigImport } from "./ConfigImport";
import { Play, Save } from "lucide-react";

// Extend the config schema for form handling
const formSchema = z.object({
  baseCidr: configSchema.shape.baseCidr,
  prefixLengths: z.object({
    account: z.number().int().min(1).max(32).optional(),
    region: z.number().int().min(1).max(32).optional(),
    az: z.number().int().min(1).max(32).optional(),
  }),
  accounts: z.array(
    z.object({
      name: z.string().min(1, { error: "Account name is required" }),
      clouds: z.array(
        z.object({
          provider: z.string(),
          regions: z.array(z.string()),
          baseCidr: z.string().optional(),
        })
      ),
    })
  ),
  subnetTypesArray: z.array(
    z.object({
      name: z.string().min(1, { error: "Type name is required" }),
      prefixLength: z.number().int().min(1).max(32),
    })
  ),
});

type FormData = z.infer<typeof formSchema>;

function formToConfig(data: FormData) {
  const subnetTypes: Record<string, number> = {};
  for (const st of data.subnetTypesArray) {
    if (st.name) subnetTypes[st.name] = st.prefixLength;
  }

  const accounts = data.accounts.map((acc) => {
    const clouds: Record<string, { regions: string[]; baseCidr?: string }> = {};
    for (const cloud of acc.clouds) {
      const cloudConfig: { regions: string[]; baseCidr?: string } = {
        regions: cloud.regions.filter(Boolean),
      };
      if (cloud.baseCidr) cloudConfig.baseCidr = cloud.baseCidr;
      clouds[cloud.provider] = cloudConfig;
    }
    return { name: acc.name, clouds };
  });

  return {
    baseCidr: data.baseCidr,
    prefixLengths: data.prefixLengths,
    accounts,
    subnetTypes,
  };
}

function configToForm(config: ReturnType<typeof formToConfig>): FormData {
  return {
    baseCidr: config.baseCidr || "",
    prefixLengths: config.prefixLengths || {
      account: 16,
      region: 20,
      az: 24,
    },
    accounts: (config.accounts || []).map((acc) => ({
      name: acc.name,
      clouds: Object.entries(acc.clouds || {}).map(([provider, cloud]) => ({
        provider,
        regions: cloud.regions || [],
        baseCidr: cloud.baseCidr || "",
      })),
    })),
    subnetTypesArray: Object.entries(config.subnetTypes || {}).map(
      ([name, prefixLength]) => ({ name, prefixLength })
    ),
  };
}

export function ConfigForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const storeConfig = useConfigStore((s) => s.config);
  const setConfig = useConfigStore((s) => s.setConfig);
  const setAllocations = useAllocationStore((s) => s.setAllocations);
  const setIsGenerating = useAllocationStore((s) => s.setIsGenerating);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const generateMutation = trpc.allocation.generate.useMutation();
  const saveMutation = trpc.savedConfig.create.useMutation();

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: configToForm(storeConfig as ReturnType<typeof formToConfig>),
  });

  const { handleSubmit, watch, formState } = methods;

  // Sync form to store on change
  const watchAll = watch();
  useEffect(() => {
    try {
      const config = formToConfig(watchAll);
      setConfig(config);
    } catch {
      // Ignore partial form states
    }
  }, [JSON.stringify(watchAll)]);

  const onGenerate = async (data: FormData) => {
    const config = formToConfig(data);
    const fullResult = configSchema.safeParse(config);
    if (!fullResult.success) return;

    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        config: fullResult.data,
      });
      setAllocations(result.allocations);
      router.push("/preview");
    } finally {
      setIsGenerating(false);
    }
  };

  const onSave = async () => {
    if (!saveName.trim()) return;
    const config = formToConfig(watchAll);
    await saveMutation.mutateAsync({
      name: saveName.trim(),
      config: JSON.stringify(config),
    });
    setSaveDialogOpen(false);
    setSaveName("");
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onGenerate)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <ConfigImport />
            <BaseCidrField />
            <PrefixLengthsSection />
            <SubnetTypesEditor />
            <AccountsList />
          </div>
          <div>
            <div className="sticky top-20">
              <ConfigJsonPreview />
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-[hsl(var(--border))] pt-6">
          <button
            type="submit"
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {generateMutation.isPending ? "Generating..." : "Generate Allocations"}
          </button>

          {session && (
            <>
              {saveDialogOpen ? (
                <div className="flex items-center gap-2">
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm"
                    placeholder="Config name"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saveMutation.isPending || !saveName.trim()}
                    className="rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveDialogOpen(false)}
                    className="rounded-md px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSaveDialogOpen(true)}
                  className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--accent))]"
                >
                  <Save className="h-4 w-4" />
                  Save Config
                </button>
              )}
            </>
          )}
        </div>

        {generateMutation.error && (
          <p className="text-sm text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] rounded px-3 py-2">
            {generateMutation.error.message}
          </p>
        )}
      </form>
    </FormProvider>
  );
}
