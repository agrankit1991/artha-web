/**
 * Screening: which companies meet a set of conditions on their figures.
 *
 * The question asked before a company is in mind. The conditions are
 * built from the platform's own registry of screenable figures, so the
 * menu here and the query there cannot disagree about what "RSI" is;
 * the presets are the questions asked most often, one click each. The
 * whole screen lives in the address bar, so a screen is a link -- back
 * returns to the last one, and a bookmark keeps one.
 *
 * Results show the figures the screen was about: a column for every
 * figure in a condition or the sort, beside the company, its sector,
 * price and move.
 */

import { Plus, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type {
  ScopeKind,
  ScreenCondition,
  ScreenField,
  ScreenHit,
  ScreenOperator,
} from "@/api/client";
import { fetchScopes, fetchScreen, fetchScreenFields } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { Hint } from "@/components/Hint";
import { LoadMore } from "@/components/LoadMore";
import { PageHeader } from "@/components/PageHeader";
import { ScopePicker } from "@/components/ScopePicker";
import type { Scope } from "@/components/ScopeSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounced } from "@/hooks/useDebounced";
import { useResource } from "@/hooks/useResource";
import { SCANS, type Scan } from "@/lib/scans";
import { ABSENT, formatDay, formatPrice, formatWhole, toNumber } from "@/lib/format";
import { valueOf, writtenFigure } from "@/lib/figures";
import { companyPath } from "@/lib/paths";

/** How many hits a page carries, and grows by. */
const PAGE = 50;

/** How each comparison is written on the page. */
export const OPERATORS: { key: ScreenOperator; label: string }[] = [
  { key: "gt", label: ">" },
  { key: "gte", label: "≥" },
  { key: "lt", label: "<" },
  { key: "lte", label: "≤" },
  { key: "eq", label: "=" },
];

/** The scans offered as one-click chips; the rest are on the scans page. */
export const PRESETS = SCANS.filter((scan) => scan.featured === true);

/** The columns shown when no condition names a figure. */
const DEFAULT_COLUMNS = ["one_month", "one_year", "from_high_percent", "rsi", "relative_volume"];

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Screener(): React.JSX.Element {
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(PAGE);

  // The whole screen is read from the address bar, so it is a link.
  const scope = useMemo<Scope>(() => scopeOf(params), [params]);
  const conditions = useMemo(() => params.getAll("where").map(parse), [params]);
  const sort = params.get("sort");
  const order: "asc" | "desc" = params.get("order") === "asc" ? "asc" : "desc";

  const loadFields = useCallback(() => fetchScreenFields(), []);
  const loadScopes = useCallback(() => fetchScopes(), []);
  const fields = useResource(loadFields);
  const scopes = useResource(loadScopes);

  // A condition still being typed is not sent; the address is settled
  // before the platform is asked, so a keystroke is not a request.
  const asked = useDebounced(
    JSON.stringify({
      scope,
      conditions: conditions.filter(complete),
      sort,
      order,
      limit,
    }),
  );
  const loadHits = useCallback(() => {
    const query = JSON.parse(asked) as {
      scope: Scope;
      conditions: ScreenCondition[];
      sort: string | null;
      order: "asc" | "desc";
      limit: number;
    };
    return fetchScreen({
      conditions: query.conditions,
      scope_kind: query.scope.kind,
      scope_key: query.scope.key ?? "all",
      sort: query.sort,
      order: query.order,
      limit: query.limit,
      offset: 0,
    });
  }, [asked]);
  const hits = useResource(loadHits);

  const update = (change: (next: URLSearchParams) => void): void => {
    const next = new URLSearchParams(params);
    change(next);
    setParams(next, { replace: true });
    setLimit(PAGE);
  };
  const setConditions = (next: ScreenCondition[]): void => {
    update((query) => {
      query.delete("where");
      for (const one of next) {
        query.append("where", `${one.field}:${one.operator}:${one.value}`);
      }
    });
  };

  // A scan brings its order with it: "profitable and growing" reads most
  // traded first. A scan without one keeps whatever order the page had.
  const applyScan = (scan: Scan): void => {
    update((query) => {
      query.delete("where");
      for (const one of scan.conditions) {
        query.append("where", `${one.field}:${one.operator}:${one.value}`);
      }
      if (scan.sort !== undefined) {
        query.set("sort", scan.sort);
        query.set("order", "desc");
      }
    });
  };

  const byName = useMemo(
    () => new Map((fields.data ?? []).map((field) => [field.name, field])),
    [fields.data],
  );
  const shownFields = useMemo(() => {
    const named = [...conditions.map((one) => one.field), ...(sort === null ? [] : [sort])];
    const chosen = named.length === 0 ? DEFAULT_COLUMNS : named;
    return [...new Set(chosen)].flatMap((name) => {
      const field = byName.get(name);
      return field === undefined || name === "close" || name === "change_percent" ? [] : [field];
    });
  }, [conditions, sort, byName]);
  const columns = useMemo(() => columnsFor(shownFields), [shownFields]);

  if (fields.error !== null) {
    return <Failed message={fields.error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screener"
        description="Which companies meet a set of conditions on their figures, over the whole market or one index or sector. The screen lives in the address, so it can be bookmarked and shared."
      />

      <section className="space-y-3" aria-label="Conditions">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Presets
          </span>
          {PRESETS.map((preset) => (
            <Button
              key={preset.key}
              variant="outline"
              size="sm"
              onClick={() => {
                applyScan(preset);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          {conditions.map((condition, at) => (
            <ConditionRow
              key={`${String(at)}:${condition.field}`}
              condition={condition}
              fields={fields.data ?? []}
              onChange={(changed) => {
                setConditions(conditions.map((one, where) => (where === at ? changed : one)));
              }}
              onRemove={() => {
                setConditions(conditions.filter((_, where) => where !== at));
              }}
            />
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={fields.data === null}
              onClick={() => {
                setConditions([...conditions, { field: "rsi", operator: "lt", value: "" }]);
              }}
            >
              <Plus aria-hidden="true" className="mr-1 h-4 w-4" />
              Add condition
            </Button>
            {conditions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConditions([]);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ScopePicker
            scope={scope}
            options={scopes.data}
            onChange={(next) => {
              update((query) => {
                query.set("scope_kind", next.kind);
                if (next.key === null) {
                  query.delete("scope_key");
                } else {
                  query.set("scope_key", next.key);
                }
              });
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort by</span>
            <select
              aria-label="Sort by"
              value={sort ?? ""}
              onChange={(event) => {
                update((query) => {
                  if (event.target.value === "") {
                    query.delete("sort");
                  } else {
                    query.set("sort", event.target.value);
                  }
                });
              }}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Symbol</option>
              {grouped(fields.data ?? []).map(([group, members]) => (
                <optgroup key={group} label={group}>
                  {members.map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            size="sm"
            aria-label={order === "desc" ? "Largest first" : "Smallest first"}
            onClick={() => {
              update((query) => {
                query.set("order", order === "desc" ? "asc" : "desc");
              });
            }}
          >
            {order === "desc" ? "Largest first" : "Smallest first"}
          </Button>
        </div>
      </section>

      <section className="space-y-3" aria-label="Results">
        {hits.error !== null ? (
          <Failed message={hits.error} />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {hits.data === null
                  ? "Screening…"
                  : `${formatWhole(hits.data.total)} ${hits.data.total === 1 ? "company meets" : "companies meet"} every condition`}
              </span>
              {hits.data?.as_of != null && <span>Figures as of {formatDay(hits.data.as_of)}</span>}
            </div>
            <DataTable
              columns={columns}
              rows={hits.data?.items ?? []}
              loading={hits.loading && hits.data === null}
              empty="No company meets every condition"
              placeholderRows={10}
              label="Screen results"
              full
              linkTo={(row) => companyPath(row.instrument_key, row.symbol)}
            />
            {hits.data !== null && (
              <LoadMore
                shown={hits.data.items.length}
                total={hits.data.total}
                loading={hits.loading}
                noun="companies"
                onMore={() => {
                  setLimit((at) => at + PAGE);
                }}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** One condition: a figure, a comparison, a value. */
function ConditionRow({
  condition,
  fields,
  onChange,
  onRemove,
}: {
  condition: ScreenCondition;
  fields: ScreenField[];
  onChange: (condition: ScreenCondition) => void;
  onRemove: () => void;
}): React.JSX.Element {
  const field = fields.find((one) => one.name === condition.field);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Condition">
      <select
        aria-label="Figure"
        value={condition.field}
        onChange={(event) => {
          onChange({ ...condition, field: event.target.value });
        }}
        className="h-9 rounded-md border bg-background px-2 text-sm"
      >
        {grouped(fields).map(([group, members]) => (
          <optgroup key={group} label={group}>
            {members.map((one) => (
              <option key={one.name} value={one.name}>
                {one.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select
        aria-label="Comparison"
        value={condition.operator}
        onChange={(event) => {
          onChange({ ...condition, operator: event.target.value as ScreenOperator });
        }}
        className="h-9 rounded-md border bg-background px-2 text-sm"
      >
        {OPERATORS.map((one) => (
          <option key={one.key} value={one.key}>
            {one.label}
          </option>
        ))}
      </select>
      <span className="flex items-center gap-1">
        <Input
          type="number"
          step="any"
          aria-label="Value"
          value={condition.value}
          onChange={(event) => {
            onChange({ ...condition, value: event.target.value });
          }}
          className="w-28"
        />
        {field !== undefined && (
          <span className="text-xs text-muted-foreground">{suffix(field)}</span>
        )}
      </span>
      <Button variant="ghost" size="sm" aria-label="Remove condition" onClick={onRemove}>
        <X aria-hidden="true" className="h-4 w-4" />
      </Button>
      {!complete(condition) && (
        <Hint text="A condition with no value is not sent; type a number to apply it." />
      )}
    </div>
  );
}

/** The population the address names; the whole market by default. */
function scopeOf(params: URLSearchParams): Scope {
  const kind = params.get("scope_kind");
  const key = params.get("scope_key");
  if ((kind === "index" || kind === "sector") && key !== null) {
    return { kind, key };
  }
  return { kind: "companies" satisfies ScopeKind, key: null };
}

/**
 * Read a condition from its address form; a malformed one becomes an
 * empty condition on RSI rather than a broken page.
 */
function parse(text: string): ScreenCondition {
  const [field = "rsi", operator = "lt", value = ""] = text.split(":");
  const known = OPERATORS.some((one) => one.key === operator);
  return { field, operator: known ? (operator as ScreenOperator) : "lt", value };
}

/** Whether a condition has a number to compare with. */
function complete(condition: ScreenCondition): boolean {
  return condition.value.trim() !== "" && Number.isFinite(Number(condition.value));
}

/** Fields by their group, in registry order. */
function grouped(fields: ScreenField[]): [string, ScreenField[]][] {
  const groups = new Map<string, ScreenField[]>();
  for (const field of fields) {
    const members = groups.get(field.group) ?? [];
    members.push(field);
    groups.set(field.group, members);
  }
  return [...groups.entries()];
}

/** What a value is measured in, for the input's edge. */
function suffix(field: ScreenField): string {
  switch (field.unit) {
    case "percent":
      return "%";
    case "price":
      return "₹";
    case "multiple":
      return "× average";
    case "crore":
      return "₹ Cr";
    case "count":
    case "points":
    case "ratio":
    case "score":
    case "rank":
      return "";
  }
}

/** The fixed columns, then one per figure the screen is about. */
function columnsFor(fields: ScreenField[]): Column<ScreenHit>[] {
  return [
    symbolColumn((row) => row),
    nameColumn((row) => row),
    {
      id: "sector",
      header: "Sector",
      accessorFn: (row) => row.sector ?? "",
      cell: ({ row }) => row.original.sector ?? ABSENT,
    },
    {
      id: "close",
      header: "Price",
      accessorFn: (row) => toNumber(row.figures.day.close) ?? 0,
      cell: ({ row }) => formatPrice(row.original.figures.day.close),
      meta: { align: "right" },
    },
    {
      id: "change",
      header: "Change",
      accessorFn: (row) => toNumber(row.figures.day.change_percent) ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => <Delta value={row.original.figures.day.change_percent} />,
      meta: { align: "right" },
    },
    ...fields.map<Column<ScreenHit>>((field) => ({
      id: field.name,
      header: field.label,
      accessorFn: (row) => toNumber(String(valueOf(field, row) ?? "")) ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => writtenFigure(field, valueOf(field, row.original)),
      meta: { align: "right" },
    })),
  ];
}
