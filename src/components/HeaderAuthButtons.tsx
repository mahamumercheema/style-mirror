import { useState, useEffect } from "react";
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
import { LogIn, LogOut, UserPlus, User, Shirt, Camera } from "lucide-react";

function getUserInitials(user: { name?: string; email?: string }): string {
  if (user.name?.trim()) {
    const parts = user.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return `${parts[0][0]}${parts[parts.length - 1]![0]}`.toUpperCase();
    }
    return user.name.trim().slice(0, 2).toUpperCase();
  }
  if (user.email?.trim()) {
    return user.email.trim().slice(0, 2).toUpperCase();
  }
  return "U";
}

export function HeaderAuthButtons({
  onDark: _onDark = false,
  showAccountMenu = true,
}: {
  onDark?: boolean;
  /** false: always show Log In / Sign Up, never the signed-in account pill */
  showAccountMenu?: boolean;
}) {
  const { user, isAuthenticated, openLogin, openSignUp, logout } = useAuth();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.avatarUrl]);

  // Check if the user object exists in the current authentication state
  if (showAccountMenu && isAuthenticated && user) {
    const initials = getUserInitials(user);

    return (
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              id="header-user-avatar-btn"
              type="button"
              className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-cobalt-border bg-card shadow-sm transition-all hover:scale-105 hover:ring-2 hover:ring-cobalt/40 focus:outline-none focus:ring-2 focus:ring-cobalt/60"
              aria-label={`User menu for ${user.email}`}
            >
              {user.avatarUrl && !imageError ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.email || "Profile avatar"}
                  onError={() => setImageError(true)}
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center rounded-full bg-secondary/80 text-xs font-semibold uppercase tracking-wider text-cobalt-text">
                  {initials}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 p-1.5 shadow-lg border-border bg-popover text-popover-foreground"
          >
            <DropdownMenuLabel className="font-normal px-2.5 py-2">
              <div className="flex flex-col space-y-1">
                {user.name && (
                  <p className="text-xs font-semibold leading-none text-foreground truncate">
                    {user.name}
                  </p>
                )}
                <p
                  className="text-[11px] leading-none text-muted-foreground truncate"
                  title={user.email}
                >
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs">
              <Link to="/closet">
                <Shirt className="size-3.5 text-cobalt-text" />
                <span>My Closet</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs">
              <Link to="/studio">
                <Camera className="size-3.5 text-cobalt-text" />
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
