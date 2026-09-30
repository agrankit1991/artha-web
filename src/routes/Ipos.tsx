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
 * whole set is a page's worth of text. The list, the search, the board,
 * the industry and the order are kept in the address, so Back from an
 * offering returns to the list it was chosen from.
 */

import { useCallback, useMemo, useState } from "react";

import type { IpoStatus, IssueType, Offering } from "@/api/client";
import { fetchIpos } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { CardsLoading } from "@/components/CardsLoading";
import { Delta } from "@/components/Delta";
import { IpoCard } from "@/components/IpoCard";
import { LoadMore } from "@/components/LoadMore";
import { STATUSES } from "@/components/OfferingStatus";
import { PageHeader } from "@/components/PageHeader";
import { type Tab, Tabs } from "@/components/Tabs";
import { ViewModeToggle, useViewMode } from "@/components/ViewModeToggle";
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
import { useSearchParam } from "@/hooks/useSearchParam";
import {
  ABSENT,
  formatCrore,
  formatDay,
  formatMultiple,
  formatRupees,
  toNumber,
} from "@/lib/format";
import { BOARDS, listingGain, minimumInvestment, priceBand } from "@/lib/offerings";
import { ipoPath } from "@/lib/paths";

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
const BOARD_OPTIONS: readonly { key: "all" | IssueType; label: string }[] = [
  { key: "all", label: "All boards" },
  { key: "REGULAR", label: "Mainboard" },
  { key: "SME", label: "SME" },
];

/** What the lists can be ordered by. */
const ORDERS = ["date", "size", "subscription", "name"] as const;
type Order = (typeof ORDERS)[number];

/**
 * What the date order is called, and so what it means, on each list -- the
 * previous project's per-tab orders. An open offering is read by when it
 * closes and an upcoming one by when it opens, soonest first; a listed or
 * closed one by how recently it did so.
 */
const DATE_ORDERS: Record<IpoStatus, string> = {
  OPEN: "Closing soon",
  UPCOMING: "Opening soon",
  LISTED: "Recently listed",
  CLOSED: "Recently closed",
};

/** The orders a list offers, the date one named for that list. */
function ordersFor(status: IpoStatus): { key: Order; label: string }[] {
  return [
    { key: "date", label: DATE_ORDERS[status] },
    { key: "size", label: "By size" },
    { key: "subscription", label: "By subscription" },
    { key: "name", label: "By name" },
  ];
}

/** Offerings read as cards or as one table; there is no category to group by. */
const LAYOUTS = ["cards", "list"] as const;

const ANY = "all";

/**
 * How many cards are drawn before "Load more": six rows of two. A card is
 * tall, and the listed offerings alone were a hundred and thirty-six of
 * them on one page; the table stays whole, for scanning.
 */
const BATCH = 12;

/**
 * Render the page.
 *
 * @param props - The day the page is read on, for how long bidding has left.
 * @returns The page.
 */
export function Ipos({ today = new Date() }: { today?: Date }): React.JSX.Element {
  const load = useCallback(() => fetchIpos(), []);
  const offerings = useResource(load);
  // Each read from the address, and anything it does not know read as the default.
  const [list, setList] = useSearchParam("list", "open");
  const [typed, setTyped] = useSearchParam("q");
  const [boardKey, setBoardKey] = useSearchParam("board", ANY);
  const [industry, setIndustry] = useSearchParam("industry", ANY);
  const [orderKey, setOrderKey] = useSearchParam("order", "date");
  const showing = ORDER.find((one) => one.toLowerCase() === list) ?? "OPEN";
  const board = BOARD_OPTIONS.find((one) => one.key.toLowerCase() === boardKey)?.key ?? "all";
  const order = ORDERS.find((one) => one === orderKey) ?? "date";
  const [layout, setLayout] = useViewMode("ipos", "cards");

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
  // beside a filtered list of two is a count of something else. No count
  // until the offerings arrive: "(0)" while loading says there are none.
  const counted = offerings.data !== null;
  const tabs = useMemo<Tab<IpoStatus>[]>(
    () =>
      ORDER.map((status) => ({
        key: status,
        label: counted
          ? `${STATUSES[status].label} (${String(
              matching.filter((one) => one.status === status).length,
            )})`
          : STATUSES[status].label,
      })),
    [matching, counted],
  );

  const shown = useMemo(
    () =>
      sorted(
        matching.filter((one) => one.status === showing),
        order,
        showing,
      ),
    [matching, showing, order],
  );

  // The cards drawn so far, for the list and filters they were grown under:
  // any change there, Back included, starts again at one batch.
  const asked = [showing, typed, board, industry, order].join("|");
  const [grown, setGrown] = useState({ asked, count: BATCH });
  const drawn = grown.asked === asked ? grown.count : BATCH;

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
          <Chooser
            options={BOARD_OPTIONS}
            chosen={board}
            onChange={(key) => {
              setBoardKey(key.toLowerCase());
            }}
            label="Board"
          />
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
        onChange={(status) => {
          setList(status.toLowerCase());
        }}
        label="Offerings"
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <Chooser
              options={ordersFor(showing)}
              chosen={order}
              onChange={setOrderKey}
              label="Order"
            />
            <ViewModeToggle mode={layout} onChange={setLayout} modes={LAYOUTS} />
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{HINTS[showing]}</p>
          {layout === "list" ? (
            <OfferingsTable offerings={shown} loading={offerings.loading} status={showing} />
          ) : offerings.loading && shown.length === 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <CardsLoading count={2} />
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
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                {shown.slice(0, drawn).map((one) => (
                  <IpoCard key={one.ipo_id} offering={one} today={today} />
                ))}
              </div>
              <LoadMore
                shown={Math.min(drawn, shown.length)}
                total={shown.length}
                noun="offerings"
                onMore={() => {
                  setGrown({ asked, count: drawn + BATCH });
                }}
              />
            </>
          )}
        </div>
      </Tabs>
    </div>
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
function sorted(offerings: Offering[], order: Order, status: IpoStatus): Offering[] {
  // Soonest first where the date is still to come; latest first where it has passed.
  const ahead = status === "OPEN" || status === "UPCOMING";
  const figure = (one: Offering): number | string | null => {
    switch (order) {
      case "date":
        return datedBy(one, status);
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
      // Names A to Z; dates ahead soonest first, dates past latest first.
      return order === "name" || ahead ? left.localeCompare(right) : right.localeCompare(left);
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
        header: "Issue size",
        accessorFn: (row) => toNumber(row.issue_size) ?? 0,
        cell: ({ row }) => formatCrore(row.original.issue_size),
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
          return least === null ? ABSENT : formatRupees(String(least));
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
        cell: ({ row }) => formatRupees(row.original.cut_off_price),
        meta: { align: "right" },
      },
      {
        id: "listing_price",
        header: "Opened at",
        accessorFn: (row) => toNumber(row.listing_price) ?? 0,
        cell: ({ row }) => formatRupees(row.original.listing_price),
        meta: { align: "right" },
      },
      {
        id: "listing_gain",
        header: "Listing gain",
        accessorFn: (row) => toNumber(listingGain(row)) ?? Number.NEGATIVE_INFINITY,
        cell: ({ row }) => <Delta value={listingGain(row.original)} />,
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

/** The date an offering is ordered by on a list: the one that list is about. */
function datedBy(offering: Offering, status: IpoStatus): string | null {
  switch (status) {
    case "OPEN":
      return offering.bidding_end;
    case "UPCOMING":
      return offering.bidding_start;
    case "LISTED":
      return offering.listing_date;
    case "CLOSED":
      return offering.bidding_end;
  }
}
