"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "outline"}
      size={compact ? "icon-sm" : "icon"}
      className={compact ? "text-muted-foreground hover:text-foreground" : undefined}
      aria-label="Toggle light and dark theme"
      aria-keyshortcuts="D"
      title="Toggle theme (D)"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon className="dark:hidden" aria-hidden="true" />
      <Sun className="hidden dark:block" aria-hidden="true" />
    </Button>
  );
}
