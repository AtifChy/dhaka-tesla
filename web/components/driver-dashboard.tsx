"use client";

import {
  CarFront,
  CirclePower,
  Gauge,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Route,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiRequest, errorMessage } from "@/lib/api";
import type { AuthSession, AvailableRequest, Pool, RideStatus, Vehicle } from "@/lib/types";

interface DriverDashboardProps {
  session: AuthSession;
  onUnauthorized: () => void;
}

const nextAction: Partial<Record<RideStatus, { path: string; label: string }>> = {
  MATCHED: { path: "arrive", label: "Mark arrived" },
  DRIVER_ARRIVED: { path: "start", label: "Start trip" },
  STARTED: { path: "complete", label: "Complete trip" },
};

function formatZone(zone: string) {
  return zone
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function DriverDashboard({ session, onUnauthorized }: DriverDashboardProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [requests, setRequests] = useState<AvailableRequest[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleError(caught: unknown) {
    if (caught instanceof ApiError && caught.status === 401) {
      onUnauthorized();
      return;
    }
    setError(errorMessage(caught));
  }

  function reloadData() {
    setIsLoading(true);
    setError(null);
    setReloadVersion((version) => version + 1);
  }

  /* oxlint-disable react/exhaustive-effect-dependencies -- reloadVersion intentionally triggers a fetch after refresh or a driver action. */
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [driverVehicle, availableRequests, driverPools] = await Promise.all([
          apiRequest<Vehicle>("/driver/vehicle", {}, session.accessToken),
          apiRequest<AvailableRequest[]>("/driver/requests", {}, session.accessToken),
          apiRequest<Pool[]>("/driver/pools", {}, session.accessToken),
        ]);
        if (!active) return;
        setVehicle(driverVehicle);
        setRequests(availableRequests);
        setPools(driverPools);
      } catch (caught) {
        if (!active) return;
        if (caught instanceof ApiError && caught.status === 401) {
          onUnauthorized();
        } else {
          setError(errorMessage(caught));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [session.accessToken, onUnauthorized, reloadVersion]);
  /* oxlint-enable react/exhaustive-effect-dependencies */

  async function toggleOnline() {
    if (!vehicle) return;
    const action = vehicle.isOnline ? "offline" : "online";
    setPendingAction("vehicle");
    setError(null);
    try {
      await apiRequest<Vehicle>(
        `/driver/vehicle/${action}`,
        { method: "POST" },
        session.accessToken,
      );
      reloadData();
    } catch (caught) {
      handleError(caught);
    } finally {
      setPendingAction(null);
    }
  }

  async function acceptRequest(requestId: number) {
    setPendingAction(`accept-${requestId}`);
    setError(null);
    try {
      await apiRequest<Pool>(
        `/driver/requests/${requestId}/accept`,
        { method: "POST" },
        session.accessToken,
      );
      reloadData();
    } catch (caught) {
      handleError(caught);
    } finally {
      setPendingAction(null);
    }
  }

  async function advancePool(pool: Pool) {
    const action = nextAction[pool.status];
    if (!action) return;

    setPendingAction(`pool-${pool.id}`);
    setError(null);
    try {
      await apiRequest<Pool>(
        `/driver/pools/${pool.id}/${action.path}`,
        { method: "POST" },
        session.accessToken,
      );
      reloadData();
    } catch (caught) {
      handleError(caught);
    } finally {
      setPendingAction(null);
    }
  }

  const activePools = pools.filter(
    (pool) => pool.status !== "COMPLETED" && pool.status !== "CANCELED",
  );
  const history = pools.filter((pool) => pool.status === "COMPLETED" || pool.status === "CANCELED");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Driver dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Ready when you are, {session.user.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Go online, accept compatible passengers, and advance each pool in order.
          </p>
        </div>
        <Button variant="outline" onClick={reloadData} disabled={isLoading}>
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

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl lg:col-span-3" />
        </div>
      ) : (
        <div className="space-y-8">
          <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CarFront className="size-5 text-primary" /> Your Tesla
                </CardTitle>
                <CardDescription>
                  Passengers can only be accepted while you are online.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {vehicle ? (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-2xl font-semibold">{vehicle.name}</p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="size-4" /> Capacity {vehicle.capacity}
                        </p>
                      </div>
                      <Badge variant={vehicle.isOnline ? "default" : "secondary"}>
                        {vehicle.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>
                    <Button
                      className="w-full"
                      variant={vehicle.isOnline ? "outline" : "default"}
                      disabled={pendingAction === "vehicle"}
                      onClick={() => void toggleOnline()}
                    >
                      {pendingAction === "vehicle" ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <CirclePower />
                      )}
                      Go {vehicle.isOnline ? "offline" : "online"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No vehicle is assigned to this driver.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Available passengers</CardTitle>
                    <CardDescription>
                      Only compatible, unassigned requests are shown.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{requests.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed text-center">
                    <MapPin className="mb-2 size-6 text-muted-foreground" />
                    <p className="text-sm font-medium">No waiting requests</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Refresh after a passenger requests a ride.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {requests.map((request) => (
                      <div key={request.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{request.passengerName}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatZone(request.pickupZone)} →{" "}
                              {formatZone(request.destinationZone)}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {request.seatsRequested} seat{request.seatsRequested === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <p className="text-sm font-medium">
                            {request.currency} {request.estimatedFare}
                          </p>
                          <Button
                            size="sm"
                            disabled={
                              !vehicle?.isOnline || pendingAction === `accept-${request.id}`
                            }
                            onClick={() => void acceptRequest(request.id)}
                          >
                            {pendingAction === `accept-${request.id}` ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <UserRoundCheck />
                            )}
                            Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Active pools</h2>
                <p className="text-sm text-muted-foreground">
                  Capacity and members are visible before each action.
                </p>
              </div>
              <Badge variant="outline">{activePools.length}</Badge>
            </div>
            {activePools.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex min-h-52 flex-col items-center justify-center text-center">
                  <Route className="mb-3 size-8 text-muted-foreground" />
                  <p className="font-medium">No active pool</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Accept an available request to create or fill a compatible pool.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {activePools.map((pool) => {
                  const action = nextAction[pool.status];
                  return (
                    <Card key={pool.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle>Pool #{pool.id}</CardTitle>
                            <CardDescription>
                              {formatZone(pool.pickupZone)} ·{" "}
                              {pool.corridor.replaceAll("_", " ").toLowerCase()}
                            </CardDescription>
                          </div>
                          <StatusBadge status={pool.status} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                          <span className="flex items-center gap-2">
                            <Gauge className="size-4 text-primary" /> Occupancy
                          </span>
                          <strong>
                            {pool.occupiedSeats} / {pool.capacity} seats
                          </strong>
                        </div>
                        <div className="space-y-2">
                          {pool.members.map((member) => (
                            <div
                              key={member.requestId}
                              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                            >
                              <div>
                                <p className="font-medium">{member.passengerName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatZone(member.destinationZone)} · {member.seats} seat
                                  {member.seats === 1 ? "" : "s"}
                                </p>
                              </div>
                              <span className="font-medium">
                                {member.currency} {member.fare}
                              </span>
                            </div>
                          ))}
                        </div>
                        {action && (
                          <Button
                            className="mt-4 w-full"
                            disabled={pendingAction === `pool-${pool.id}`}
                            onClick={() => void advancePool(pool)}
                          >
                            {pendingAction === `pool-${pool.id}` && (
                              <LoaderCircle className="animate-spin" />
                            )}
                            {action.label}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {history.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-xl font-semibold">Recent history</h2>
                <Badge variant="secondary">{history.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {history.map((pool) => (
                  <Card key={pool.id}>
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div>
                        <p className="font-medium">Pool #{pool.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {pool.members.length} passenger group
                          {pool.members.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <StatusBadge status={pool.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
