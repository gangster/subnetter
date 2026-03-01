import { Cloud } from "lucide-react";
import { PROVIDER_COLORS, PROVIDER_LABELS } from "@/utils/constants";
import { cn } from "@/utils/cn";

interface ProviderIconProps {
  provider: string;
  className?: string;
  showLabel?: boolean;
}

export function ProviderIcon({
  provider,
  className,
  showLabel = false,
}: ProviderIconProps) {
  const color = PROVIDER_COLORS[provider.toLowerCase()] || "#666";
  const label = PROVIDER_LABELS[provider.toLowerCase()] || provider;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Cloud className="h-4 w-4" style={{ color }} />
      {showLabel && <span className="text-sm">{label}</span>}
    </span>
  );
}
