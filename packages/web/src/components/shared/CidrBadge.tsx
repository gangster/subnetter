import { cn } from "@/utils/cn";

interface CidrBadgeProps {
  cidr: string;
  className?: string;
}

export function CidrBadge({ cidr, className }: CidrBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-mono font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
        className
      )}
    >
      {cidr}
    </span>
  );
}
