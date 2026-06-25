import Link from "next/link";
import ProfileSwitcher from "./ProfileSwitcher";

export default function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight shrink-0">
          <span className="inline-flex w-8 h-8 rounded-xl bg-brand text-white items-center justify-center text-base">
            🍽️
          </span>
          FoodSense AI
        </Link>
        <div className="flex items-center gap-5">
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
            <Link href="/assistant" className="hover:text-brand transition-colors">
              Assistant
            </Link>
            <Link href="/profiles" className="hover:text-brand transition-colors">
              Profiles
            </Link>
          </nav>
          <ProfileSwitcher />
        </div>
      </div>
    </header>
  );
}
