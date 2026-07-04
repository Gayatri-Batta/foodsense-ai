import Link from "next/link";
import ProfileSwitcher from "./ProfileSwitcher";
import AccountMenu from "./AccountMenu";

export default function NavBar() {
  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-black/5">
      <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
        {/* Brand */}
        <Link href="/" className="font-semibold text-base tracking-tight text-foreground shrink-0">
          FoodSense AI
        </Link>

        {/* Primary nav: focused links only, no redundant Home */}
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-500">
          <Link href="/history" className="hover:text-foreground transition-colors">
            History
          </Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link href="/fridge" className="hover:text-foreground transition-colors">
            Fridge
          </Link>
        </nav>

        {/* Right cluster: active profile picker + account actions */}
        <div className="flex items-center gap-4 shrink-0">
          <ProfileSwitcher />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
