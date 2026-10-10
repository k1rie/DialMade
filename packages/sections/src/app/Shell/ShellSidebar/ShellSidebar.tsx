"use client";

import { Avatar, Icon, IconButton, NavItem } from "@dialmade/ui";
import type { AppStrings } from "../../content";
import { FOOTER_NAV_IDS, type ShellNavItem, type ShellProps } from "../schema";
import { ShellBrand } from "../ShellBrand";

export interface ShellSidebarProps extends Pick<ShellProps, "brandName" | "workspace" | "nav" | "activeId" | "user"> {
  logoUrl?: string;
  strings: AppStrings;
}

function NavList({ items, activeId }: { items: readonly ShellNavItem[]; activeId: string }) {
  return (
    <ul className="dl-app-shell__nav-list" role="list">
      {items.map((item) => (
        <li key={item.id}>
          <NavItem
            label={item.label}
            icon={item.icon}
            href={`#${item.id}`}
            active={item.id === activeId}
            {...(item.count !== undefined && { count: item.count })}
          />
        </li>
      ))}
    </ul>
  );
}

export function ShellSidebar({ brandName, workspace, nav, activeId, user, logoUrl, strings }: ShellSidebarProps) {
  const main = nav.filter((item) => !FOOTER_NAV_IDS.has(item.id));
  const footer: ShellNavItem[] = [...nav.filter((item) => FOOTER_NAV_IDS.has(item.id)), { id: "help", label: strings.help, icon: "info" }];
  return (
    <div className="dl-app-shell__sidebar">
      <div className="dl-app-shell__sidebar-inner">
        <button type="button" className="dl-app-shell__switcher" aria-haspopup="menu" title={strings.switchWorkspace}>
          <ShellBrand name={brandName} meta={workspace} {...(logoUrl && { logoUrl })} />
          <Icon name="chevrons-up-down" className="dl-app-shell__switcher-icon" />
        </button>
        <nav className="dl-app-shell__nav" aria-label={strings.mainNav}>
          <NavList items={main} activeId={activeId} />
        </nav>
        <div className="dl-app-shell__sidebar-footer">
          <nav className="dl-app-shell__nav" aria-label={strings.secondaryNav}>
            <NavList items={footer} activeId={activeId} />
          </nav>
          <div className="dl-app-shell__user">
            <Avatar name={user.name} size="sm" status="online" />
            <span className="dl-app-shell__user-text">
              <span className="dl-app-shell__user-name">{user.name}</span>
              <span className="dl-app-shell__user-role">{user.role}</span>
            </span>
            <IconButton icon="more" label={strings.accountMenu} size="sm" className="dl-app-shell__user-menu" />
          </div>
        </div>
      </div>
    </div>
  );
}
