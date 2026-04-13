import type { ReactNode } from "react";

type PatternBannerProps = {
  /** Primary label (usually all-caps). */
  title: ReactNode;
  /** Right side (e.g. date). */
  trailing?: ReactNode;
  /**
   * `inCard`: sits under a white block in the same card — subtle blue hairline upward.
   * `standalone`: own rounded block (e.g. after stats cards).
   */
  variant?: "inCard" | "standalone";
  className?: string;
};

/**
 * Shared gradient + grid / diagonal pattern used on Fleet Profile and Technical Logbook banners.
 */
export function PatternBanner({
  title,
  trailing,
  variant = "inCard",
  className = "",
}: PatternBannerProps) {
  const shell =
    variant === "inCard"
      ? "shadow-[0_-1px_0_0_rgb(37,99,235)]"
      : "rounded-xl border border-blue-700/20 shadow-sm";

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 px-4 py-3 text-white sm:px-6 ${shell} ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
            "repeating-linear-gradient(-35deg, transparent, transparent 10px, rgba(255,255,255,0.06) 10px, rgba(255,255,255,0.06) 11px)",
            "radial-gradient(ellipse 120% 80% at 100% 0%, rgba(255,255,255,0.2), transparent 50%)",
          ].join(","),
          backgroundSize: "28px 28px, 28px 28px, 100% 100%, 100% 100%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 bottom-0 top-0 w-40 skew-x-[-18deg] bg-white/[0.06]"
      />
      <div className="relative z-[1] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <span className="text-sm font-semibold tracking-[0.2em] sm:text-base">
          {title}
        </span>
        {trailing != null ? (
          <span className="text-sm tabular-nums tracking-wide text-white/95">
            {trailing}
          </span>
        ) : null}
      </div>
    </div>
  );
}
