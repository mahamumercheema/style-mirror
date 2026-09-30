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

export function HeaderAuthButtons({
  onDark: _onDark = false,
  showAccountMenu = true,
}: {
  onDark?: boolean;
  /** false: always show Log In / Sign Up, never the signed-in account pill */
  showAccountMenu?: boolean;
}) {
  const { user, isAuthenticated, openLogin, openSignUp, logout } = useAuth();

  if (showAccountMenu && isAuthenticated && user) {
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
              <span className="flex size-5 items-center justify-center rounded-full border border-gold/60 text-[10px] font-semibold text-gold-ink">
                {initials}
              </span>
              <span className="max-w-[130px] truncate text-foreground font-medium sm:inline">
                {user.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold leading-none text-foreground">{user.name}</p>
                <p className="text-[11px] leading-none text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs">
              <Link to="/closet">
                <Shirt className="size-3.5 text-gold-ink" />
                <span>My Closet</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs">
              <Link to="/studio">
                <Sparkles className="size-3.5 text-gold-ink" />
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
        className="h-8 gap-1.5 px-3"
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
        className="h-8 gap-1.5 px-3.5"
        aria-label="Sign up with 2-step verification"
      >
        <UserPlus className="size-3.5" />
        <span>Sign Up</span>
      </Button>
    </div>
  );
}
