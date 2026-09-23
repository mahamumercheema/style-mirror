import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, ShieldCheck, UserPlus, User, Shirt, Sparkles } from "lucide-react";

export function HeaderAuthButtons() {
  const { user, isAuthenticated, openLogin, openSignUp, logout } = useAuth();

  if (isAuthenticated && user) {
    const initials = user.email.substring(0, 2).toUpperCase();

    return (
      <div className="flex items-center gap-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id="header-user-menu-btn"
              variant="outline"
              size="sm"
              className="gap-2 h-9 px-3 rounded-full border-border bg-card hover:bg-muted font-normal text-xs"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {initials}
              </span>
              <span className="max-w-[130px] truncate text-foreground font-medium sm:inline">
                {user.email}
              </span>
              <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-[var(--shadow-lift)]">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold leading-none text-foreground">{user.name}</p>
                <p className="text-[11px] leading-none text-muted-foreground truncate">
                  {user.email}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <ShieldCheck className="size-3" />
                  <span>2-Step Verified Account</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs">
              <Link to="/closet">
                <Shirt className="size-3.5 text-primary" />
                <span>My Closet</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs">
              <Link to="/studio">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Fitting Studio</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs">
              <Link to="/profile">
                <User className="size-3.5 text-muted-foreground" />
                <span>Profile & Fit Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id="header-logout-btn"
              onClick={logout}
              className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive text-xs"
            >
              <LogOut className="size-3.5" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        id="header-login-btn"
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openLogin();
        }}
        className="gap-1.5 text-xs font-medium h-8 px-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors active:scale-95"
        aria-label="Log in to your account"
      >
        <LogIn className="size-3.5" />
        <span>Log In</span>
      </Button>

      <Button
        id="header-signup-btn"
        type="button"
        variant="default"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openSignUp();
        }}
        className="gap-1.5 text-xs font-medium h-8 px-3.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer transition-all active:scale-95"
        aria-label="Sign up with 2-step verification"
      >
        <UserPlus className="size-3.5" />
        <span>Sign Up</span>
      </Button>
    </div>
  );
}
