"use client";

import { CarFront, LogOut } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";

interface DashboardHeaderProps {
  user: User;
  onLogout: () => void;
}

export function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  return (
    <header className="border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CarFront className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">Dhaka Tesla Pool</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {user.role === "DRIVER" ? "Driver" : "Passenger"}
          </Badge>
          <div className="flex items-center gap-1 rounded-lg border bg-background/60 p-1">
            <ThemeToggle compact />
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Log out"
              onClick={onLogout}
            >
              <LogOut aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
