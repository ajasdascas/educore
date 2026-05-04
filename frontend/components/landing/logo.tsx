import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  variant?: "default" | "dark" | "mono";
  size?: "sm" | "md";
};

export function Logo({ className, variant = "default", size = "md" }: LogoProps) {
  const isDark = variant === "dark";
  const isMono = variant === "mono";
  const glyphSize = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const textSize = size === "sm" ? "text-xl" : "text-[26px]";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg className={cn(glyphSize, "shrink-0")} viewBox="0 0 44 44" role="img" aria-label="Educore">
        <defs>
          <linearGradient id="educore-logo-gradient" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor={isMono ? (isDark ? "#fff" : "#0F172A") : "#2563EB"} />
            <stop offset="1" stopColor={isMono ? (isDark ? "#fff" : "#0F172A") : "#0EA5E9"} />
          </linearGradient>
        </defs>
        <rect width="44" height="44" rx="12" fill="url(#educore-logo-gradient)" />
        <path d="M16 13h12M16 22h12M16 31h12" stroke={isMono && !isDark ? "#fff" : "#fff"} strokeWidth="3.2" strokeLinecap="round" />
        {[16, 28].map((x) =>
          [13, 22, 31].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.7" fill="#fff" />)
        )}
      </svg>
      <span
        className={cn("font-display font-extrabold", textSize)}
        style={{ color: isDark ? "#ffffff" : "var(--landing-ink, #0F172A)" }}
      >
        Educore
      </span>
    </div>
  );
}
