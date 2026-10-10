"use client";

import { Badge } from "../../Badge";
import { Breadcrumb } from "../../Breadcrumb";
import { NavItem } from "../../NavItem";
import { Tabs } from "../../Tabs";
import { GalleryDemo } from "../GalleryDemo";
import { useGalleryCopy } from "../useGalleryCopy";
import "./NavigationDemo.css";

export function NavigationDemo() {
  const copy = useGalleryCopy();
  const t = copy.navigation;
  return (
    <>
      <GalleryDemo label={t.tabs}>
        <Tabs
          label={t.projectSections}
          items={[
            { value: "overview", label: t.overview, content: <p className="dl-gallery-tab-copy">{t.overviewContent}</p> },
            {
              value: "activity",
              label: t.activity,
              badge: <Badge size="sm">3</Badge>,
              content: <p className="dl-gallery-tab-copy">{t.activityContent}</p>,
            },
            { value: "settings", label: t.settings, content: <p className="dl-gallery-tab-copy">{t.settingsContent}</p> },
            { value: "archived", label: t.archived, disabled: true },
          ]}
        />
      </GalleryDemo>
      <GalleryDemo label={t.segmented}>
        <Tabs
          label={t.period}
          variant="segmented"
          defaultValue="week"
          items={[
            { value: "day", label: t.day },
            { value: "week", label: t.week },
            { value: "month", label: t.month },
          ]}
        />
        <Tabs
          label={t.period}
          variant="segmented"
          size="sm"
          fitted
          items={[
            { value: "day", label: t.day },
            { value: "week", label: t.week, previewState: "hover" },
            { value: "month", label: t.month },
          ]}
        />
      </GalleryDemo>
      <GalleryDemo label={t.breadcrumb}>
        <Breadcrumb
          items={[
            { label: t.home, href: "#", icon: "home" },
            { label: t.projects, href: "#" },
            { label: t.project, href: "#" },
            { label: t.settings },
          ]}
        />
        <Breadcrumb separator="slash" items={[{ label: t.projects, href: "#" }, { label: t.project }]} />
      </GalleryDemo>
      <GalleryDemo label={t.sidebar}>
        <nav aria-label={t.mainNav}>
          <ul className="dl-gallery-sidebar">
            <li>
              <NavItem label={t.home} icon="home" href="#" active />
            </li>
            <li>
              <NavItem label={t.inbox} icon="inbox" href="#" count={12} />
            </li>
            <li>
              <NavItem label={t.projects} icon="folder" href="#" previewState="hover" />
            </li>
            <li>
              <NavItem label={t.customers} icon="users" href="#" previewState="focus" />
            </li>
            <li>
              <NavItem label={t.reports} icon="bar-chart" disabled end={<Badge size="sm" variant="outline">{t.soon}</Badge>} />
            </li>
            <li>
              <NavItem label={t.settings} icon="sliders" href="#" />
            </li>
          </ul>
        </nav>
      </GalleryDemo>
      <GalleryDemo label={t.topNav}>
        <nav aria-label={t.topNav}>
          <ul className="dl-gallery-topnav">
            <li>
              <NavItem label={t.product} href="#" orientation="horizontal" active />
            </li>
            <li>
              <NavItem label={t.pricing} href="#" orientation="horizontal" />
            </li>
            <li>
              <NavItem label={t.docs} href="#" orientation="horizontal" previewState="hover" />
            </li>
            <li>
              <NavItem label={t.blog} href="#" orientation="horizontal" />
            </li>
          </ul>
        </nav>
      </GalleryDemo>
    </>
  );
}
