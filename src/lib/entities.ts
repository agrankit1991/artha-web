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
  Building2,
  Calendar,
  CalendarClock,
  ChartCandlestick,
  ChartColumn,
  ChartLine,
  ChartPie,
  ExternalLink,
  Eye,
  FileText,
  FlaskConical,
  GitCompareArrows,
  Globe,
  Handshake,
  Landmark,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  Newspaper,
  Percent,
  PiggyBank,
  ReceiptIndianRupee,
  Rocket,
  ScanSearch,
  SlidersHorizontal,
  Star,
  Table2,
  TrendingUp,
  User,
  Users,
  Workflow,
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
  strategies: Workflow,
  breadth: Activity,
  compare: GitCompareArrows,
  dates: Calendar,
  deals: Handshake,
  documents: FileText,
  // A receipt in rupees: quarterly results, not just any bar chart.
  earnings: ReceiptIndianRupee,
  exchange: Globe,
  external: ExternalLink,
  // Reported figures by period: revenue, profit.
  financials: ChartColumn,
  // A table of figures side by side.
  figures: Table2,
  flows: Landmark,
  // A population's companies as tiles by size and move.
  heatmap: LayoutGrid,
  // Who owns it: shareholding.
  holders: ChartPie,
  // Its own icon: it used to share breadth's, and two neighbours in the
  // sidebar looked alike.
  movers: TrendingUp,
  news: Newspaper,
  overview: LayoutDashboard,
  peers: Users,
  // A line over time that is not a price: relative performance, a NAV.
  performance: ChartLine,
  // A price over time.
  price: ChartCandlestick,
  profile: User,
  returns: Percent,
  scans: ScanSearch,
  screen: SlidersHorizontal,
  visitors: Eye,
  watchlist: Star,
} as const satisfies Record<string, Icon>;
