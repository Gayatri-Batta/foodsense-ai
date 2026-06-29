import Link from "next/link";
import ProfileSwitcher from "./ProfileSwitcher";
import AccountMenu from "./AccountMenu";

export default function NavBar() {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/5">
      {/* Utility row: secondary, profile-related items */}
      <div className="border-b border-black/5">
        <div className="max-w-5xl mx-auto px-6 py-1.5 flex items-center justify-end gap-4 text-xs text-gray-500">
          <Link href="/profiles" className="hover:text-brand transition-colors">
            Profiles
          </Link>
          <ProfileSwitcher />
          <span className="w-px h-3 bg-gray-200 shrink-0" />
          <AccountMenu />
        </div>
      </div>

      {/* Main row: brand + primary navigation */}
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight shrink-0">
          <span className="inline-flex w-8 h-8 rounded-xl bg-brand text-white items-center justify-center text-base">
            🍽️
          </span>
          FoodSense AI
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-brand transition-colors">
            Home
          </Link>
          <Link href="/history" className="hover:text-brand transition-colors">
            History
          </Link>
          <Link href="/dashboard" className="hover:text-brand transition-colors">
            Dashboard
          </Link>
          <Link href="/fridge" className="hover:text-brand transition-colors">
            Fridge
          </Link>
        </nav>
      </div>
    </header>
  );
}
