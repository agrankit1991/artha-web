/**
 * Public offerings: what is open, what is coming, and what has listed.
 *
 * Four lists rather than one, because the four statuses are four different
 * questions. What is open is a decision with a deadline; what is upcoming
 * is a diary entry; what has listed is a record of how these things have
 * been going lately, which is the only honest guide to the next one.
 *
 * Every offering arrives in one reply, so the searching and the narrowing
 * happen here and are instant. A year brings a few hundred offerings; the
 * whole set is a page's worth of text.
 */

import { useCallback, useMemo, useState } from "react";

import type { IpoStatus, IssueType, Offering } from "@/api/client";
import { fetchIpos } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Tabs } from "@/components/Tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useResource } from "@/hooks/useResource";
import { ABSENT, formatDay, formatMultiple, formatPrice, toNumber } from "@/lib/format";

/** What each list is called, and what it is for. */
const LISTS: Record<IpoStatus, { label: string; hint: string }> = {
  OPEN: {
    label: "Open",
    hint: "Taking bids now. The last day to apply is the one that matters.",
  },
  UPCOMING: {
    label: "Upcoming",
    hint: "Announced and not yet open. A band still to be published is ordinary at this stage.",
  },
  CLOSED: {
    label: "Closed",
    hint: "Bidding is over and they have not listed. Allotment and listing dates are next.",
  },
  LISTED: {
    label: "Listed",
    hint: "How the recent ones have gone, which is the only honest guide to the next.",
  },
};

/** The order the lists are worth reading in. */
const ORDER: IpoStatus[] = ["OPEN", "UPCOMING", "CLOSED", "LISTED"];

/** Which board an offering is on, as a reader would say it. */
const BOARDS: Record<IssueType, string> = {
  REGULAR: "Mainboard",
  SME: "SME",
};

/** What each status is tinted. */
const TINTS: Record<IpoStatus, string> = {
  OPEN: "border-gain/40 bg-gain/10 text-gain",
  UPCOMING: "border-primary/40 bg-primary/10 text-primary",
  CLOSED: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-500",
  LISTED: "border-border bg-muted text-muted-foreground",
};

/** What the board filter offers, "any" first. */
const BOARD_OPTIONS = [
  { key: "all", label: "All boards" },
  { key: "REGULAR", label: "Mainboard" },
  { key: "SME", label: "SME" },
] as const;

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Ipos(): React.JSX.Element {
  const load = useCallback(() => fetchIpos(), []);
  const offerings = useResource(load);
  const [showing, setShowing] = useState<IpoStatus>("OPEN");
  const [typed, setTyped] = useState("");
  const [board, setBoard] = useState<"all" | IssueType>("all");

  const all = useMemo(() => offerings.data ?? [], [offerings.data]);

  const matching = useMemo(() => {
    const words = typed.trim().toLowerCase();
    return all.filter(
      (one) =>
        (board === "all" || one.issue_type === board) &&
        (words === "" ||
          one.name.toLowerCase().includes(words) ||
          (one.symbol ?? "").toLowerCase().includes(words) ||
          (one.industry ?? "").toLowerCase().includes(words)),
    );
  }, [all, typed, board]);

  // Counted after the search rather than before it: a tab reading "Open 8"
  // beside a filtered list of two is a count of something else.
  const tabs = useMemo(
    () =>
      ORDER.map((status) => ({
        key: status,
        label: `${LISTS[status].label} (${String(
          matching.filter((one) => one.status === status).length,
        )})`,
      })),
    [matching],
  );

  const shown = useMemo(
    () => matching.filter((one) => one.status === showing),
    [matching, showing],
  );
  const list = LISTS[showing];

  if (offerings.error !== null) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {offerings.error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Public offerings</h1>
          <p className="text-sm text-muted-foreground">
            Every offering this platform has recorded, as its provider publishes them.
          </p>
        </div>
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
        </div>
      </header>

      <Tabs tabs={tabs} active={showing} onChange={setShowing} label="Offerings">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{list.hint}</p>
          <Offerings offerings={shown} loading={offerings.loading} status={showing} />
        </div>
      </Tabs>
    </div>
  );
}

/**
 * One list of offerings.
 *
 * The columns differ by status, and deliberately. An open offering is read
 * for its band, its lot and how many times it has been subscribed; a
 * listed one for what it priced at and what it opened at, which are the
 * two figures that say whether applying would have been worth it.
 */
function Offerings({
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
              {row.original.industry != null && ` · ${row.original.industry}`}
            </div>
          </div>
        ),
      },
      {
        id: "issue_type",
        header: "Board",
        accessorFn: (row) => row.issue_type,
        cell: ({ row }) => (
          <Badge variant="outline" className={TINTS[row.original.status]}>
            {BOARDS[row.original.issue_type]}
          </Badge>
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
        cell: ({ row }) => (row.original.lot_size === null ? ABSENT : row.original.lot_size),
        meta: { align: "right" },
      },
      {
        id: "outlay",
        header: "Least outlay",
        accessorFn: (row) => outlay(row) ?? 0,
        cell: ({ row }) => {
          const least = outlay(row.original);
          // A band alone says nothing about the cheque: shares are bought
          // a lot at a time, and this is the two figures multiplied.
          return least === null ? ABSENT : formatPrice(String(least));
        },
        meta: { align: "right" },
      },
    ];

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

    const subscription: Column<Offering> = {
      id: "total_subscription",
      header: "Subscribed",
      accessorFn: (row) => toNumber(row.total_subscription) ?? 0,
      cell: ({ row }) =>
        row.original.total_subscription === null
          ? ABSENT
          : `${formatMultiple(row.original.total_subscription)}×`,
      meta: { align: "right" },
    };

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
    />
  );
}

/**
 * The price band, or the one price when the band has no width.
 *
 * @param offering - The offering.
 * @returns The band, or a dash.
 */
function priceBand(offering: Offering): string {
  const low = toNumber(offering.minimum_price);
  const high = toNumber(offering.maximum_price);
  if (low === null && high === null) {
    return ABSENT;
  }
  if (low === null || high === null || low === high) {
    return formatPrice(offering.maximum_price ?? offering.minimum_price);
  }
  return `${formatPrice(offering.minimum_price)} – ${formatPrice(offering.maximum_price)}`;
}

/**
 * The smallest cheque an applicant can write.
 *
 * The top of the band times a lot, because a bid below the top is not
 * allotted when an offering is oversubscribed, which the ones worth
 * applying for are.
 *
 * @param offering - The offering.
 * @returns The outlay, or null when the band or the lot is unpublished.
 */
function outlay(offering: Offering): number | null {
  const price = toNumber(offering.maximum_price);
  if (price === null || offering.lot_size === null) {
    return null;
  }
  return price * offering.lot_size;
}
