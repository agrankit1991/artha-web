/**
 * Public offerings: what is open, what is coming, and what has listed.
 *
 * Four lists rather than one, because the four statuses are four different
 * questions. What is open is a decision with a deadline; what is upcoming
 * is a diary entry; what has listed is a record of how these things have
 * been going lately, which is the only honest guide to the next one.
 *
 * Cards by default, because an offering is decided on -- band, lot, dates,
 * subscription, prospectus -- and a row cannot carry that. A table is one
 * click away for scanning forty listed ones by what they opened at.
 *
 * Every offering arrives in one reply, so the searching and the narrowing
 * happen here and are instant. A year brings a few hundred offerings; the
 * whole set is a page's worth of text.
 */

import { LayoutGrid, List } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import type { IpoStatus, IssueType, Offering } from "@/api/client";
import { fetchIpos } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { BOARDS, IpoCard, STATUSES, minimumInvestment, priceBand } from "@/components/IpoCard";
import { PageHeader } from "@/components/PageHeader";
import { type Tab, Tabs } from "@/components/Tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResource } from "@/hooks/useResource";
import { ABSENT, formatDay, formatMultiple, formatPrice, toNumber } from "@/lib/format";
import { ipoPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

/** What each list is for. */
const HINTS: Record<IpoStatus, string> = {
  OPEN: "Taking bids now. The last day to apply is the one that matters.",
  UPCOMING: "Announced and not yet open. A band still to be published is ordinary at this stage.",
  CLOSED: "Bidding is over and they have not listed. Allotment and listing dates are next.",
  LISTED: "How the recent ones have gone, which is the only honest guide to the next.",
};

/** The order the lists are worth reading in. */
const ORDER: IpoStatus[] = ["OPEN", "UPCOMING", "CLOSED", "LISTED"];

/** What the board filter offers, "any" first. */
const BOARD_OPTIONS = [
  { key: "all", label: "All boards" },
  { key: "REGULAR", label: "Mainboard" },
  { key: "SME", label: "SME" },
] as const;

/** What the lists can be ordered by. */
type Order = "date" | "size" | "subscription" | "name";

const ORDERS: { key: Order; label: string }[] = [
  { key: "date", label: "By date" },
  { key: "size", label: "By size" },
  { key: "subscription", label: "By subscription" },
  { key: "name", label: "By name" },
];

/** How the offerings are laid out. */
type Layout = "cards" | "table";

const ANY = "all";

/**
 * Render the page.
 *
 * @param props - The day the page is read on, for how long bidding has left.
 * @returns The page.
 */
export function Ipos({ today = new Date() }: { today?: Date }): React.JSX.Element {
  const load = useCallback(() => fetchIpos(), []);
  const offerings = useResource(load);
  const [showing, setShowing] = useState<IpoStatus>("OPEN");
  const [typed, setTyped] = useState("");
  const [board, setBoard] = useState<"all" | IssueType>("all");
  const [industry, setIndustry] = useState(ANY);
  const [order, setOrder] = useState<Order>("date");
  const [layout, setLayout] = useState<Layout>("cards");

  const all = useMemo(() => offerings.data ?? [], [offerings.data]);

  const industries = useMemo(
    () =>
      [
        ...new Set(all.map((one) => one.industry).filter((one): one is string => one !== null)),
      ].sort(),
    [all],
  );

  const matching = useMemo(() => {
    const words = typed.trim().toLowerCase();
    return all.filter(
      (one) =>
        (board === "all" || one.issue_type === board) &&
        (industry === ANY || one.industry === industry) &&
        (words === "" ||
          one.name.toLowerCase().includes(words) ||
          (one.symbol ?? "").toLowerCase().includes(words) ||
          (one.industry ?? "").toLowerCase().includes(words)),
    );
  }, [all, typed, board, industry]);

  // Counted after the search rather than before it: a tab reading "Open 8"
  // beside a filtered list of two is a count of something else.
  const tabs = useMemo<Tab<IpoStatus>[]>(
    () =>
      ORDER.map((status) => ({
        key: status,
        label: `${STATUSES[status].label} (${String(
          matching.filter((one) => one.status === status).length,
        )})`,
      })),
    [matching],
  );

  const shown = useMemo(
    () =>
      sorted(
        matching.filter((one) => one.status === showing),
        order,
      ),
    [matching, showing, order],
  );

  if (offerings.error !== null) {
    return <Failed message={offerings.error} />;
  }

  const narrowed = typed !== "" || board !== "all" || industry !== ANY;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <PageHeader
          kind="ipo"
          title="Initial Public Offerings"
          description="Every offering this platform has recorded, as its provider publishes them."
        />
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
            }}
            placeholder="Search by name, symbol or industry"
            aria-label="Search offerings"
            className="max-w-sm"
          />
          <Chooser options={BOARD_OPTIONS} chosen={board} onChange={setBoard} label="Board" />
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-[14rem]" aria-label="Industry">
              <SelectValue placeholder="All industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All industries</SelectItem>
              {industries.map((one) => (
                <SelectItem key={one} value={one}>
                  {one}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <Tabs
        tabs={tabs}
        active={showing}
        onChange={setShowing}
        label="Offerings"
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <Chooser options={ORDERS} chosen={order} onChange={setOrder} label="Order" />
            <div className="flex gap-1" role="group" aria-label="Layout">
              <LayoutButton
                active={layout === "cards"}
                onClick={() => {
                  setLayout("cards");
                }}
                label="Cards"
                icon={LayoutGrid}
              />
              <LayoutButton
                active={layout === "table"}
                onClick={() => {
                  setLayout("table");
                }}
                label="Table"
                icon={List}
              />
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{HINTS[showing]}</p>
          {layout === "table" ? (
            <OfferingsTable offerings={shown} loading={offerings.loading} status={showing} />
          ) : offerings.loading && shown.length === 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {[0, 1].map((one) => (
                <div key={one} className="h-80 animate-pulse rounded-lg border bg-muted/40" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <Empty
              title="No offerings in this list"
              reason={
                narrowed
                  ? "Nothing matches the search and filters above."
                  : `Nothing is ${STATUSES[showing].label.toLowerCase()} right now.`
              }
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {shown.map((one) => (
                <IpoCard key={one.ipo_id} offering={one} today={today} />
              ))}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}

/** One of the two layout buttons. */
function LayoutButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 transition-colors",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * Order a list of offerings.
 *
 * @param offerings - The list.
 * @param order - What to order it by.
 * @returns The list, ordered. An offering without the figure ordered by
 *   sorts last rather than first, where an absent value would otherwise
 *   put it.
 */
function sorted(offerings: Offering[], order: Order): Offering[] {
  const figure = (one: Offering): number | string | null => {
    switch (order) {
      case "date":
        return one.bidding_start;
      case "size":
        return toNumber(one.issue_size);
      case "subscription":
        return toNumber(one.total_subscription);
      case "name":
        return one.name;
    }
  };
  return [...offerings].sort((a, b) => {
    const left = figure(a);
    const right = figure(b);
    if (left === null && right === null) {
      return 0;
    }
    if (left === null) {
      return 1;
    }
    if (right === null) {
      return -1;
    }
    if (typeof left === "string" && typeof right === "string") {
      // Dates read newest first, names A to Z.
      return order === "name" ? left.localeCompare(right) : right.localeCompare(left);
    }
    return Number(right) - Number(left);
  });
}

/**
 * The offerings as a table, for scanning.
 *
 * The columns differ by status: an open offering is scanned for its band,
 * lot and subscription; a listed one for what it priced at and what it
 * opened at.
 */
function OfferingsTable({
  offerings,
  loading,
  status,
}: {
  offerings: Offering[];
  loading: boolean;
  status: IpoStatus;
}): React.JSX.Element {
  const columns = useMemo<Column<Offering>[]>(() => {
    const identity: Column<Offering>[] = [
      {
        id: "name",
        header: "Offering",
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.symbol ?? "Symbol not yet assigned"}
              {row.original.industry !== null && ` · ${row.original.industry}`}
            </div>
          </div>
        ),
      },
      {
        id: "issue_type",
        header: "Board",
        accessorFn: (row) => row.issue_type,
        cell: ({ row }) => (
          <Badge variant="secondary">{BOARDS[row.original.issue_type].label}</Badge>
        ),
      },
      {
        id: "issue_size",
        header: "Size (₹ cr)",
        accessorFn: (row) => toNumber(row.issue_size) ?? 0,
        cell: ({ row }) => formatPrice(row.original.issue_size),
        meta: { align: "right" },
      },
    ];
    const band: Column<Offering>[] = [
      {
        id: "band",
        header: "Price band",
        accessorFn: (row) => toNumber(row.maximum_price) ?? 0,
        cell: ({ row }) => priceBand(row.original),
        meta: { align: "right" },
      },
      {
        id: "lot_size",
        header: "Lot",
        accessorFn: (row) => row.lot_size ?? 0,
        cell: ({ row }) => row.original.lot_size ?? ABSENT,
        meta: { align: "right" },
      },
      {
        id: "outlay",
        header: "Min. investment",
        accessorFn: (row) => minimumInvestment(row) ?? 0,
        cell: ({ row }) => {
          const least = minimumInvestment(row.original);
          return least === null ? ABSENT : formatPrice(String(least));
        },
        meta: { align: "right" },
      },
    ];
    const subscription: Column<Offering> = {
      id: "total_subscription",
      header: "Subscribed",
      accessorFn: (row) => toNumber(row.total_subscription) ?? 0,
      cell: ({ row }) => formatMultiple(row.original.total_subscription),
      meta: { align: "right" },
    };
    const dates: Column<Offering>[] = [
      {
        id: "bidding_start",
        header: "Bids open",
        accessorFn: (row) => row.bidding_start ?? "",
        cell: ({ row }) => formatDay(row.original.bidding_start),
      },
      {
        id: "bidding_end",
        header: "Bids close",
        accessorFn: (row) => row.bidding_end ?? "",
        cell: ({ row }) => formatDay(row.original.bidding_end),
      },
      {
        id: "listing_date",
        header: "Lists",
        accessorFn: (row) => row.listing_date ?? "",
        cell: ({ row }) => formatDay(row.original.listing_date),
      },
    ];
    const listing: Column<Offering>[] = [
      {
        id: "cut_off_price",
        header: "Priced at",
        accessorFn: (row) => toNumber(row.cut_off_price) ?? 0,
        cell: ({ row }) => formatPrice(row.original.cut_off_price),
        meta: { align: "right" },
      },
      {
        id: "listing_price",
        header: "Opened at",
        accessorFn: (row) => toNumber(row.listing_price) ?? 0,
        cell: ({ row }) => formatPrice(row.original.listing_price),
        meta: { align: "right" },
      },
    ];
    return status === "LISTED"
      ? [...identity, ...listing, subscription, ...dates]
      : [...identity, ...band, subscription, ...dates];
  }, [status]);

  return (
    <DataTable
      columns={columns}
      rows={offerings}
      loading={loading}
      empty="No offerings in this list"
      placeholderRows={5}
      label="Offerings"
      full
      linkTo={(row) => ipoPath(row.ipo_id)}
    />
  );
}
