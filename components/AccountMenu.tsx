"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SessionUser {
  id: string;
  email: string | null;
}

export default function AccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user ?? null);
        setLoaded(true);
      });
  }, []);

  async function handleLogout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (!loaded) return null;

  if (!user) {
    return (
      <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
        <Link href="/login" className="text-sm text-gray-500 hover:text-foreground transition-colors">
          Log in
        </Link>
        <Link
          href="/signup"
          className="text-sm font-medium bg-brand text-white rounded-full px-4 py-1.5 hover:bg-brand-dark transition-colors"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-gray-600 hover:text-foreground transition-colors whitespace-nowrap"
      >
        <span className="w-5 h-5 rounded-full bg-brand text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
          {(user.email ?? "?").charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[10rem] truncate">{user.email}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white border border-black/8 rounded-xl shadow-md py-1 min-w-[9rem] z-40">
          <Link
            href="/profiles"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Profiles
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
