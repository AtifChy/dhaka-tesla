// Preview only: the API recalculates and fixes the booking total when creating a request.
export function estimateFareForSeats(perSeatFare: string, seatsRequested: number): string {
  const [taka, poysha] = perSeatFare.split(".");
  const totalPoysha = (Number(taka) * 100 + Number(poysha)) * seatsRequested;
  return `${Math.floor(totalPoysha / 100)}.${String(totalPoysha % 100).padStart(2, "0")}`;
}
