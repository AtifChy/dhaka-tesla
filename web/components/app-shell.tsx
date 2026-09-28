"use client";

import { useEffect, useState } from "react";

import { AuthScreen } from "@/components/auth-screen";
import { DashboardHeader } from "@/components/dashboard-header";
import { DriverDashboard } from "@/components/driver-dashboard";
import { PassengerDashboard } from "@/components/passenger-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";

export function AppShell() {
  const [isMounted, setIsMounted] = useState(false);
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => setIsMounted(true), []);

  if (!isMounted) {
    return (
      <main className="mx-auto flex min-h-svh max-w-6xl items-center px-4">
        <div className="grid w-full gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
          </div>
          <Skeleton className="h-120 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!session) {
    return <AuthScreen onAuthenticated={setSession} />;
  }

  return (
    <div className="min-h-svh bg-muted/35">
      <DashboardHeader user={session.user} onLogout={clearSession} />
      {session.user.role === "DRIVER" ? (
        <DriverDashboard session={session} onUnauthorized={clearSession} />
      ) : (
        <PassengerDashboard session={session} onUnauthorized={clearSession} />
      )}
    </div>
  );
}
