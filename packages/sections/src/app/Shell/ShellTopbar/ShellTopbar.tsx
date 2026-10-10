"use client";

import { Avatar, IconButton, Input, NavItem } from "@dialmade/ui";
import type { AppStrings } from "../../content";
import type { ShellProps, ShellVariant } from "../schema";
import { ShellBrand } from "../ShellBrand";

export interface ShellTopbarProps
  extends Pick<ShellProps, "brandName" | "nav" | "activeId" | "user" | "searchPlaceholder" | "showSearch"> {
  variant: ShellVariant;
  logoUrl?: string;
  strings: AppStrings;
}

const MENU_GLYPH = (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

/**
 * Top bar. Narrow containers swap the sidebar for a menu button, the brand and the avatar (CSS
 * container queries); the `topnav` variant also carries the main navigation.
 */
export function ShellTopbar({
  variant,
  brandName,
  nav,
  activeId,
  user,
  searchPlaceholder,
  showSearch,
  logoUrl,
  strings,
}: ShellTopbarProps) {
  const topnav = variant === "topnav";
  const search = showSearch ? (
    <Input
      type="search"
      size="sm"
      hideLabel
      label={strings.search}
      placeholder={searchPlaceholder}
      iconStart="search"
      iconEnd={<kbd className="dl-app-shell__kbd">{strings.searchShortcut}</kbd>}
      fieldClassName="dl-app-shell__search"
    />
  ) : null;

  return (
    <div className="dl-app-shell__topbar">
      <div className="dl-app-shell__topbar-start">
        <IconButton icon={MENU_GLYPH} label={strings.openMenu} size="sm" className="dl-app-shell__menu-button" />
        <span className="dl-app-shell__topbar-brand">
          <ShellBrand name={brandName} {...(logoUrl && { logoUrl })} />
        </span>
        {topnav ? (
          <nav className="dl-app-shell__nav dl-app-shell__topnav" aria-label={strings.mainNav}>
            <ul className="dl-app-shell__topnav-list" role="list">
              {nav.map((item) => (
                <li key={item.id}>
                  <NavItem
                    orientation="horizontal"
                    label={item.label}
                    href={`#${item.id}`}
                    active={item.id === activeId}
                    {...(item.count !== undefined && { count: item.count })}
                  />
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          search
        )}
      </div>
      <div className="dl-app-shell__topbar-end">
        {topnav ? search : null}
        {showSearch ? <IconButton icon="search" label={strings.search} size="sm" className="dl-app-shell__search-button" /> : null}
        <span className="dl-app-shell__bell">
          <IconButton icon="bell" label={strings.notifications} size="sm" />
          <span className="dl-app-shell__bell-dot" aria-hidden="true" />
        </span>
        <Avatar name={user.name} size="sm" className="dl-app-shell__topbar-avatar" />
      </div>
    </div>
  );
}
