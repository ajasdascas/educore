import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type LandingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "white" | "outline";
  size?: "sm" | "md" | "lg";
};

export function LandingButton({ className, variant = "primary", size = "md", ...props }: LandingButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-display font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
        size === "sm" && "h-10 px-4 text-sm",
        size === "md" && "h-12 px-5 text-[14px]",
        size === "lg" && "h-14 px-6 text-[15px]",
        variant === "primary" && "bg-[#2563EB] text-white shadow-[0_1px_2px_rgba(37,99,235,0.2),0_4px_12px_rgba(37,99,235,0.15)] hover:-translate-y-0.5 hover:bg-[#1D4ED8]",
        variant === "secondary" && "border border-[var(--landing-line)] bg-[var(--landing-card)] text-[var(--landing-ink)] hover:-translate-y-0.5 hover:border-[#2563EB]",
        variant === "ghost" && "bg-transparent text-[var(--landing-ink-soft)] hover:bg-[var(--landing-soft)]",
        variant === "white" && "landing-button-white bg-white text-[#2563EB] hover:-translate-y-0.5 hover:bg-slate-50",
        variant === "outline" && "border border-white/25 bg-white/5 text-white hover:bg-white/10",
        className
      )}
      {...props}
    />
  );
}

export function LandingBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-[var(--landing-primary-soft)] px-3 py-1.5 text-[11.5px] font-bold text-[var(--landing-primary-strong)]", className)}>
      {children}
    </span>
  );
}

export function EyebrowLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-display text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--landing-primary)]", className)}>{children}</p>;
}

export function MarketingCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "landing-card rounded-lg border border-[var(--landing-line)] bg-[var(--landing-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.15)]",
        className
      )}
      {...props}
    />
  );
}
