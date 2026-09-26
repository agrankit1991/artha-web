/**
 * What each kind of thing is called and drawn as.
 *
 * Stated once so an index is the same icon in the navigation, in a mover
 * list, in a search result and on its own page. A reader learns the
 * vocabulary in one place or not at all; an icon that means "index" here
 * and "chart" there means nothing anywhere.
 */

import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  CalendarClock,
  ExternalLink,
  FileText,
  FlaskConical,
  GitCompareArrows,
  Globe,
  Handshake,
  Landmark,
  Layers,
  LineChart,
  Newspaper,
  PiggyBank,
  Rocket,
  ScanSearch,
  SlidersHorizontal,
  Star,
  Users,
} from "lucide-react";

/** The kinds of thing this platform has pages about. */
export type EntityKind = "company" | "index" | "sector" | "fund" | "ipo" | "future";

/** An icon, as every icon in this application is shaped. */
export type Icon = React.ComponentType<{ className?: string }>;

/** What each kind of thing is drawn as, and what it is called. */
export const ENTITIES: Record<EntityKind, { icon: Icon; label: string }> = {
  company: { icon: Building2, label: "Company" },
  index: { icon: LineChart, label: "Index" },
  sector: { icon: Layers, label: "Sector" },
  fund: { icon: PiggyBank, label: "Fund" },
  ipo: { icon: Rocket, label: "IPO" },
  future: { icon: CalendarClock, label: "Future" },
};

/**
 * The icons that mark a kind of information rather than a kind of thing.
 *
 * A section about dates carries the same icon on the offering page and the
 * corporate actions card, for the same reason the entities do.
 */
export const MARKS = {
  backtests: FlaskConical,
  breadth: Activity,
  compare: GitCompareArrows,
  dates: Calendar,
  deals: Handshake,
  documents: FileText,
  earnings: BarChart3,
  exchange: Globe,
  flows: Landmark,
  external: ExternalLink,
  news: Newspaper,
  peers: Users,
  scans: ScanSearch,
  screen: SlidersHorizontal,
  watchlist: Star,
} as const satisfies Record<string, Icon>;
