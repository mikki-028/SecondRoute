import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { Confidence, RouteKey } from "@/lib/secondroute/types";

export function Panel({
  title,
  action,
  children,
  className,
  dense,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card shadow-panel",
        className,
      )}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="label-xs">{title}</h2>
          {action}
        </header>
      )}
      <div className={dense ? "" : "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

export function Field({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="label-xs">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "ink";
  className?: string;
}) {
  const tones = {
    neutral: "border-border bg-muted text-muted-foreground",
    success: "border-success/25 bg-success-soft text-success",
    warning: "border-warning/25 bg-warning-soft text-warning",
    danger: "border-destructive/25 bg-destructive/10 text-destructive",
    ink: "border-primary/20 bg-primary/8 text-primary",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ConfidenceTag({ value }: { value: Confidence }) {
  const tone = value === "HIGH" ? "success" : value === "MEDIUM" ? "warning" : "danger";
  return <Tag tone={tone}>{value}</Tag>;
}

export function RouteTag({ route }: { route: RouteKey | null }) {
  if (!route) return <span className="text-xs text-muted-foreground">—</span>;
  const tone = route === "WRITE_OFF" ? "danger" : route === "RESELL" ? "success" : "ink";
  return <Tag tone={tone}>{route.replace("_", "-")}</Tag>;
}

export function PrototypeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-border-strong bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      Prototype data
    </span>
  );
}
