import { Badge } from "@/components/ui/badge";
import type { RideStatus } from "@/lib/types";

const labels: Record<RideStatus, string> = {
  REQUESTED: "Waiting for driver",
  MATCHED: "Driver matched",
  DRIVER_ARRIVED: "Driver arrived",
  STARTED: "On the way",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

export function StatusBadge({ status }: { status: RideStatus }) {
  const variant =
    status === "CANCELED"
      ? "destructive"
      : status === "COMPLETED"
        ? "secondary"
        : status === "REQUESTED"
          ? "outline"
          : "default";

  return <Badge variant={variant}>{labels[status]}</Badge>;
}
