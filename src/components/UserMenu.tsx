/**
 * Who is signed in, and the two things they can do about it.
 *
 * The name is on the trigger where there is room for it and behind the
 * initials where there is not, so the menu is recognisable on a phone
 * without becoming the widest thing in the header.
 */

import { LogOut, User } from "lucide-react";

import type { Account } from "@/api/client";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/Menu";

interface UserMenuProps {
  account: Account;
  onOpenProfile: () => void;
  onSignOut: () => void;
}

/**
 * Take a person's initials from their name.
 *
 * @param name - The display name.
 * @returns One or two letters, or a single dash when the name is empty --
 *   an empty circle reads as an interface that has lost the account.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "—";
  }
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Render the account menu.
 *
 * @param props - Who is signed in, and what the two choices do.
 * @returns The menu.
 */
export function UserMenu({ account, onOpenProfile, onSignOut }: UserMenuProps): React.JSX.Element {
  return (
    <Menu
      label="Account"
      triggerClassName="h-9 gap-2 rounded-md border pl-1 pr-2 hover:bg-accent"
      trigger={
        <>
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {initialsOf(account.display_name)}
          </span>
          <span className="hidden max-w-32 truncate sm:inline">{account.display_name}</span>
        </>
      }
    >
      {(close) => (
        <>
          <MenuLabel>Signed in as</MenuLabel>
          <div className="px-2 pb-1.5">
            <div className="truncate text-sm font-medium">{account.display_name}</div>
            <div className="truncate text-xs text-muted-foreground">{account.email}</div>
          </div>
          <MenuSeparator />
          <MenuItem
            onSelect={() => {
              onOpenProfile();
              close();
            }}
          >
            <User className="h-4 w-4" />
            Profile
          </MenuItem>
          <MenuItem
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onSelect={() => {
              close();
              onSignOut();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </MenuItem>
        </>
      )}
    </Menu>
  );
}
