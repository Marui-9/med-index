import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { CoinBalance } from "@/components/coin-balance";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-primary">
          HealthProof
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/claims"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Browse Claims
          </Link>
          <CoinBalance />
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
