import Link from "next/link";
import ProfileSwitcher from "./ProfileSwitcher";
import AccountMenu from "./AccountMenu";

export default function NavBar() {
  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-black/5">
      <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
        {/* Brand */}
        <Link href="/" className="font-semibold text-base tracking-tight text-foreground shrink-0">
          FoodSenseAI
        </Link>

        {/* Right cluster: nav (signed-in only) + profile picker + account actions */}
        <div className="flex items-center gap-4 shrink-0">
          <ProfileSwitcher />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
