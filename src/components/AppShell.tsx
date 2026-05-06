import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Home, MessageCircle, User } from "lucide-react";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-sunrise">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-serif text-2xl tracking-tight text-navy">
            Genesis
          </Link>
          {user && (
            <nav className="hidden gap-1 sm:flex">
              <NavLink to="/dashboard" label="Matches" />
              <NavLink to="/messages" label="Messages" />
              <NavLink to="/profile" label="Profile" />
            </nav>
          )}
        </div>
      </header>

      <main className="pb-24 sm:pb-12">{children}</main>

      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/40 bg-background/95 backdrop-blur-md sm:hidden">
          <div className="grid grid-cols-3">
            <BottomLink to="/dashboard" icon={<Home className="size-5" />} label="Matches" current={location.pathname} />
            <BottomLink to="/messages" icon={<MessageCircle className="size-5" />} label="Messages" current={location.pathname} />
            <BottomLink to="/profile" icon={<User className="size-5" />} label="Profile" current={location.pathname} />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={cn(
        "rounded-md px-4 py-2 text-sm transition-colors",
        active ? "text-terracotta" : "text-navy/70 hover:text-navy",
      )}
    >
      {label}
    </Link>
  );
}

function BottomLink({ to, icon, label, current }: { to: string; icon: ReactNode; label: string; current: string }) {
  const active = current.startsWith(to);
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1 py-3 text-xs transition-colors",
        active ? "text-terracotta" : "text-navy/60",
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
