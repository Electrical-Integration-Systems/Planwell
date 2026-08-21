import { cn } from "@/lib/utils";

type PlanwellLogoMarkProps = {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  xs: {
    frame: "h-10 w-10",
    glowInset: "inset-1 rounded-[0.9rem]",
    glowOrbA: "-left-1 top-1.5 h-4 w-4",
    glowOrbB: "-right-1 bottom-1 h-4 w-4",
    card: "h-8 w-8 rounded-[0.8rem] text-[1.2rem]",
    inner: "inset-[1px] rounded-[0.72rem]",
  },
  sm: {
    frame: "h-14 w-14",
    glowInset: "inset-1.5 rounded-[1.15rem]",
    glowOrbA: "-left-1 top-2 h-5 w-5",
    glowOrbB: "-right-1 bottom-1 h-6 w-6",
    card: "h-11 w-11 rounded-[1rem] text-[1.7rem]",
    inner: "inset-[1px] rounded-[0.95rem]",
  },
  md: {
    frame: "h-22 w-22 sm:h-24 sm:w-24",
    glowInset: "inset-2 rounded-[1.75rem]",
    glowOrbA: "-left-2 top-3 h-8 w-8",
    glowOrbB: "-right-1 bottom-2 h-10 w-10",
    card: "h-18 w-18 rounded-[1.6rem] text-4xl sm:h-20 sm:w-20 sm:text-[2.8rem]",
    inner: "inset-[1px] rounded-[1.5rem]",
  },
  lg: {
    frame: "h-26 w-26 sm:h-28 sm:w-28",
    glowInset: "inset-2 rounded-[2rem]",
    glowOrbA: "-left-2 top-4 h-9 w-9",
    glowOrbB: "-right-2 bottom-2 h-11 w-11",
    card: "h-22 w-22 rounded-[1.8rem] text-[3rem] sm:h-24 sm:w-24 sm:text-[3.2rem]",
    inner: "inset-[1px] rounded-[1.7rem]",
  },
} as const;

export function PlanwellLogoMark({
  size = "md",
  className,
}: PlanwellLogoMarkProps) {
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div className={cn("relative flex justify-center", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center",
          sizeClasses.frame,
        )}
      >
        <span
          className={cn(
            "absolute bg-blue-500/30 blur-2xl animate-subtle-pulse",
            sizeClasses.glowInset,
          )}
          style={{ animationDuration: "2.8s" }}
        />
        <span
          className={cn(
            "absolute rounded-full bg-sky-300/50 blur-xl animate-subtle-pulse",
            sizeClasses.glowOrbA,
          )}
          style={{ animationDelay: "0.4s", animationDuration: "2.2s" }}
        />
        <span
          className={cn(
            "absolute rounded-full bg-blue-600/45 blur-xl animate-subtle-pulse",
            sizeClasses.glowOrbB,
          )}
          style={{ animationDelay: "1s", animationDuration: "3s" }}
        />
        <div
          className={cn(
            "relative flex items-center justify-center border bg-blue-500/85 text-white font-serif font-semibold shadow-[0_18px_45px_rgba(37,99,235,0.25)] dark:border-blue-200/40 dark:bg-blue-500/28",
            sizeClasses.card,
          )}
        >
          <span
            className={cn(
              "absolute border border-white/20",
              sizeClasses.inner,
            )}
          />
          <span className="relative z-10">P</span>
        </div>
      </div>
    </div>
  );
}