"use client";

import {
  Banknote,
  CalendarClock,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Route,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type SubmitEvent } from "react";

import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiRequest, errorMessage } from "@/lib/api";
import type { AuthSession, PaymentMethod, Ride, RouteOption } from "@/lib/types";

interface PassengerDashboardProps {
  session: AuthSession;
  onUnauthorized: () => void;
}

function formatZone(zone: string) {
  return zone
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PassengerDashboard({ session, onUnauthorized }: PassengerDashboardProps) {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [pickupZone, setPickupZone] = useState("");
  const [destinationZone, setDestinationZone] = useState("");
  const [seatsRequested, setSeatsRequested] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError && caught.status === 401) {
        onUnauthorized();
        return;
      }
      setError(errorMessage(caught));
    },
    [onUnauthorized],
  );

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [routeOptions, passengerRides] = await Promise.all([
        apiRequest<RouteOption[]>("/rides/options", {}, session.accessToken),
        apiRequest<Ride[]>("/rides/me", {}, session.accessToken),
      ]);
      setRoutes(routeOptions);
      setRides(passengerRides);
      setPickupZone((current) => current || routeOptions[0]?.pickupZone || "");
      setDestinationZone((current) => current || routeOptions[0]?.destinationZone || "");
    } catch (caught) {
      handleError(caught);
    } finally {
      setIsLoading(false);
    }
  }, [handleError, session.accessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pickupZones = useMemo(
    () => [...new Set(routes.map((route) => route.pickupZone))],
    [routes],
  );
  const destinations = useMemo(
    () => routes.filter((route) => route.pickupZone === pickupZone),
    [pickupZone, routes],
  );
  const selectedRoute = routes.find(
    (route) => route.pickupZone === pickupZone && route.destinationZone === destinationZone,
  );

  function changePickup(nextPickup: string | null) {
    if (!nextPickup) return;
    setPickupZone(nextPickup);
    const firstDestination = routes.find((route) => route.pickupZone === nextPickup);
    setDestinationZone(firstDestination?.destinationZone ?? "");
  }

  function changePaymentMethod(value: string | null) {
    if (value === "CASH" || value === "TESLAPAY") {
      setPaymentMethod(value);
    }
  }

  async function requestRide(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoute) return;

    setPendingAction("create");
    setError(null);
    try {
      await apiRequest<Ride>(
        "/rides",
        {
          method: "POST",
          body: JSON.stringify({
            pickupZone,
            destinationZone,
            seatsRequested: Number(seatsRequested),
            paymentMethod,
          }),
        },
        session.accessToken,
      );
      await loadData();
    } catch (caught) {
      handleError(caught);
    } finally {
      setPendingAction(null);
    }
  }

  async function cancelRide(rideId: number) {
    setPendingAction(`cancel-${rideId}`);
    setError(null);
    try {
      await apiRequest<Ride>(`/rides/${rideId}/cancel`, { method: "POST" }, session.accessToken);
      await loadData();
    } catch (caught) {
      handleError(caught);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Passenger dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Hello, {session.user.name}</h1>
          <p className="mt-2 text-muted-foreground">
            Choose a route, see the exact fare, and request your seat.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadData()} disabled={isLoading}>
          <RefreshCw className={isLoading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Something needs attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Request a ride</CardTitle>
            <CardDescription>Fares already include the 20% pooling discount.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-5">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-28" />
                <Skeleton className="h-10" />
              </div>
            ) : routes.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No routes are available right now.
              </div>
            ) : (
              <form className="space-y-5" onSubmit={(event) => void requestRide(event)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pickup</Label>
                    <Select value={pickupZone} onValueChange={changePickup}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pickupZones.map((zone) => (
                          <SelectItem key={zone} value={zone}>
                            {formatZone(zone)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Select
                      value={destinationZone}
                      onValueChange={(value) => setDestinationZone(value ?? "")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map((route) => (
                          <SelectItem key={route.destinationZone} value={route.destinationZone}>
                            {formatZone(route.destinationZone)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Seats</Label>
                    <Select
                      value={seatsRequested}
                      onValueChange={(value) => setSeatsRequested(value ?? "1")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3].map((count) => (
                          <SelectItem key={count} value={String(count)}>
                            {count} {count === 1 ? "seat" : "seats"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment</Label>
                    <Select value={paymentMethod} onValueChange={changePaymentMethod}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="TESLAPAY">TeslaPay wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedRoute && (
                  <div className="rounded-xl border bg-muted/50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated pooled fare</p>
                        <p className="mt-1 text-3xl font-semibold">
                          {selectedRoute.currency} {selectedRoute.estimatedFare}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {(selectedRoute.distanceMeters / 1000).toFixed(1)} km
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Final quote is fixed when your request is created. Cash and simulated TeslaPay
                      are supported.
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  type="submit"
                  disabled={!selectedRoute || pendingAction === "create"}
                >
                  {pendingAction === "create" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Route />
                  )}
                  Request this ride
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Your rides</h2>
              <p className="text-sm text-muted-foreground">Newest requests appear first.</p>
            </div>
            <Badge variant="outline">{rides.length}</Badge>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : rides.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
                <MapPin className="mb-3 size-8 text-muted-foreground" />
                <p className="font-medium">No rides yet</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Your first request will appear here with live lifecycle status.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => (
                <Card key={ride.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {formatZone(ride.pickupZone)} → {formatZone(ride.destinationZone)}
                          </p>
                          <StatusBadge status={ride.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Request #{ride.id}</p>
                      </div>
                      <p className="text-lg font-semibold">
                        {ride.currency} {ride.quotedFare}
                      </p>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <span className="flex items-center gap-2">
                        <Users className="size-4" /> {ride.seatsRequested} seat
                        {ride.seatsRequested === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-2">
                        {ride.paymentMethod === "CASH" ? (
                          <Banknote className="size-4" />
                        ) : (
                          <WalletCards className="size-4" />
                        )}
                        {ride.paymentMethod === "CASH" ? "Cash" : "TeslaPay"}
                      </span>
                      <span className="flex items-center gap-2 sm:col-span-2">
                        <CalendarClock className="size-4" /> {formatDate(ride.createdAt)}
                      </span>
                    </div>
                    {(ride.status === "REQUESTED" || ride.status === "MATCHED") && (
                      <div className="mt-4 border-t pt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={pendingAction === `cancel-${ride.id}`}
                          onClick={() => void cancelRide(ride.id)}
                        >
                          {pendingAction === `cancel-${ride.id}` && (
                            <LoaderCircle className="animate-spin" />
                          )}
                          Cancel request
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
