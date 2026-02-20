"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/signin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{session.user.credits ?? 0} credits</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">
          {session.user.reputation ?? 0} rep
        </span>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
          aria-label="User menu"
        >
          {session.user.name?.[0]?.toUpperCase() ||
            session.user.email?.[0]?.toUpperCase() ||
            "U"}
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border bg-background shadow-lg">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">
                {session.user.name || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {session.user.email}
              </p>
            </div>
            <div className="py-1">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-accent"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-accent"
              >
                Settings
              </Link>
            </div>
            <div className="border-t py-1">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block w-full px-4 py-2 text-left text-sm text-destructive hover:bg-accent"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
