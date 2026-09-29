import { Check, CircleX } from "lucide-react";

import type { RideStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const steps = [
  { status: "REQUESTED", label: "Requested" },
  { status: "MATCHED", label: "Matched" },
  { status: "DRIVER_ARRIVED", label: "Driver arrived" },
  { status: "STARTED", label: "On trip" },
  { status: "COMPLETED", label: "Completed" },
] as const;

export function RideProgress({ status }: { status: RideStatus }) {
  if (status === "CANCELED") {
    return (
      <output className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
        <CircleX aria-hidden="true" className="size-5 shrink-0" />
        <span>This ride was canceled.</span>
      </output>
    );
  }

  const currentIndex = steps.findIndex((step) => step.status === status);
  const isFinished = status === "COMPLETED";

  return (
    <ol aria-label="Ride progress" className="flex w-full items-start py-1">
      {steps.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={step.status}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
          >
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-3.5 left-1/2 h-0.5 w-full",
                  isComplete ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                (isComplete || (isCurrent && isFinished)) &&
                  "border-primary bg-primary text-primary-foreground",
                isCurrent &&
                  (isFinished
                    ? "ring-4 ring-primary/15"
                    : "border-primary bg-background text-primary ring-4 ring-primary/15"),
                !isComplete && !isCurrent && "border-border bg-background text-muted-foreground",
              )}
            >
              {isComplete || (isCurrent && isFinished) ? <Check className="size-4" /> : index + 1}
            </span>
            <span
              className={cn(
                "max-w-full px-0.5 text-[10px] leading-tight sm:text-xs",
                isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
