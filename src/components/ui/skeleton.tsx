import { cn } from "cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // A soft sheen passing over the muted surface, rather than the whole
      // block pulsing: it reads as "arriving" rather than "broken".
      className={cn(
        "rounded-md bg-muted bg-[linear-gradient(90deg,transparent_25%,var(--accent)_50%,transparent_75%)] bg-[length:200%_100%] motion-safe:animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
