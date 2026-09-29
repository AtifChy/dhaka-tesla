"use client";

import { CarFront, CircleCheck, LoaderCircle, MapPin, Users } from "lucide-react";
import { useState, type SubmitEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, errorMessage } from "@/lib/api";
import type { AuthSession, Role } from "@/lib/types";

interface AuthScreenProps {
  onAuthenticated: (session: AuthSession) => void;
}

const demoAccounts = [
  { label: "Nusrat · passenger", email: "nusrat@example.com" },
  { label: "Rafiq · passenger", email: "rafiq@example.com" },
  { label: "Jashim · driver", email: "jashim@example.com" },
] as const;

const features = [
  { icon: MapPin, label: "Fixed Dhaka routes" },
  { icon: Users, label: "Capacity-safe pools" },
  { icon: CircleCheck, label: "Clear ride status" },
] as const;

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [registrationRole, setRegistrationRole] = useState<Role>("PASSENGER");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState("3");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const path =
        mode === "login"
          ? "/auth/login"
          : registrationRole === "DRIVER"
            ? "/auth/register/driver"
            : "/auth/register";
      const registrationBody =
        registrationRole === "DRIVER"
          ? {
              name,
              email,
              password,
              vehicleName,
              vehicleCapacity: Number(vehicleCapacity),
            }
          : { name, email, password };
      const session = await apiRequest<AuthSession>(path, {
        method: "POST",
        body: JSON.stringify(mode === "login" ? { email, password } : registrationBody),
      });
      onAuthenticated(session);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  function chooseDemo(emailAddress: string) {
    setMode("login");
    setEmail(emailAddress);
    setPassword("superstrongpassword");
    setError(null);
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-[radial-gradient(circle_at_top_left,var(--color-primary)_0,transparent_34%),linear-gradient(to_bottom_right,var(--color-background),var(--color-muted))]">
      <div className="absolute inset-0 bg-background/75" />
      <div className="relative mx-auto grid min-h-svh max-w-6xl items-center gap-12 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-6">
        <section className="max-w-xl">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border bg-background/80 px-4 py-2 text-sm shadow-sm backdrop-blur">
            <CarFront className="size-4 text-primary" />
            Dhaka Tesla Pool
          </div>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-6xl">
            Share the road. Keep Dhaka moving.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
            Request a transparent fare, share an available Tesla, and follow every stage of your
            trip from matching to arrival.
          </p>
          <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <Card className="border-border/70 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur">
          <CardHeader>
            <div className="mb-2 grid grid-cols-2 rounded-lg bg-muted p-1">
              <Button
                type="button"
                variant={mode === "login" ? "outline" : "ghost"}
                onClick={() => setMode("login")}
              >
                Log in
              </Button>
              <Button
                type="button"
                variant={mode === "register" ? "outline" : "ghost"}
                onClick={() => setMode("register")}
              >
                Create account
              </Button>
            </div>
            <CardTitle>{mode === "login" ? "Welcome back" : "Create your account"}</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Use a demo account or enter your credentials."
                : "Choose how you will use the pool."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void submit(event)}>
              {mode === "register" && (
                <>
                  <div className="space-y-2">
                    <Label>I want to join as</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={registrationRole === "PASSENGER" ? "outline" : "secondary"}
                        onClick={() => setRegistrationRole("PASSENGER")}
                      >
                        Passenger
                      </Button>
                      <Button
                        type="button"
                        variant={registrationRole === "DRIVER" ? "outline" : "secondary"}
                        onClick={() => setRegistrationRole("DRIVER")}
                      >
                        Driver
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      minLength={2}
                      maxLength={80}
                      required
                    />
                  </div>
                  {registrationRole === "DRIVER" && (
                    <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
                      <div className="space-y-2">
                        <Label htmlFor="vehicleName">Vehicle name</Label>
                        <Input
                          id="vehicleName"
                          value={vehicleName}
                          onChange={(event) => setVehicleName(event.target.value)}
                          placeholder="e.g. Model Y"
                          minLength={2}
                          maxLength={80}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleCapacity">Seats</Label>
                        <Input
                          id="vehicleCapacity"
                          type="number"
                          inputMode="numeric"
                          value={vehicleCapacity}
                          onChange={(event) => setVehicleCapacity(event.target.value)}
                          min={1}
                          max={6}
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === "login" ? "Your password" : "At least 10 characters"}
                  minLength={mode === "register" ? 10 : 1}
                  maxLength={128}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Could not continue</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="animate-spin" />}
                {mode === "login" ? "Log in" : "Create account"}
              </Button>
            </form>

            {mode === "login" && (
              <div className="mt-6 border-t pt-5">
                <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Demo accounts
                </p>
                <div className="grid gap-2">
                  {demoAccounts.map((account) => (
                    <Button
                      key={account.email}
                      type="button"
                      variant="outline"
                      className="justify-start"
                      onClick={() => chooseDemo(account.email)}
                    >
                      {account.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
