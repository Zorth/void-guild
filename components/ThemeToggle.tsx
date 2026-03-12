"use client";

import { useEffect, useState } from "react";
import { Moon, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "parchment">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "dark" | "parchment" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.remove("dark", "parchment");
      document.documentElement.classList.add(savedTheme);
    } else {
        // Default to dark if no theme saved, but ensure class is added
        document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "parchment" : "dark";
    
    // Enable transitions briefly
    document.documentElement.classList.add("theme-transition");
    
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.remove("dark", "parchment");
    document.documentElement.classList.add(newTheme);
    
    // Remove transitions class after it completes
    setTimeout(() => {
        document.documentElement.classList.remove("theme-transition");
    }, 500);
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="rounded-md w-9 h-9 hover:bg-accent flex items-center justify-center transition-all active:scale-95"
        title={theme === "dark" ? "Switch to Medieval Parchment" : "Switch to Dark Mode"}
      >
        {theme === "dark" ? (
          <ScrollText className="h-5 w-5 text-amber-600" />
        ) : (
          <Moon className="h-5 w-5 text-indigo-400" />
        )}
      </Button>
    </div>
  );
}
