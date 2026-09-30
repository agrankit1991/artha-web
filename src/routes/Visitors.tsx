/**
 * Who uses Artha Science, for the owner alone.
 *
 * Every account by name and email, how often each came and how much they
 * opened; the pages opened most, everyone's or one person's; and the days,
 * so a quiet week shows as one. Counted from the pages the application
 * reports as opened, which began with this page -- except last seen, which
 * sessions have kept from the start.
 */

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { DayUse, PageUse, PersonUse } from "@/api/client";
import { fetchVisitors } from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { StatGrid, StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { coloured } from "@/lib/chartPalette";
import { ABSENT, formatCount, formatDayInIndia, formatSince } from "@/lib/format";

/** The spans on offer, as the number of days the platform is asked for. */
const SPANS = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "0", label: "All time" },
] as const;

type Span = (typeof SPANS)[number]["key"];

/**
 * Render the visitors page.
 *
 * @returns The page.
 */
export function Visitors(): React.JSX.Element {
  const [span, setSpan] = useState<Span>("30");
  const [person, setPerson] = useState<PersonUse | null>(null);
  const load = useCallback(
    () => fetchVisitors(Number(span), person?.account_id ?? null),
    [span, person],
  );
  const visitors = useResource(load);
  const people = visitors.data?.people ?? [];
  const anonymous = visitors.data?.anonymous;
  const active = people.filter((one) => one.page_views > 0).length;
  const opened =
    people.reduce((total, one) => total + one.page_views, 0) + (anonymous?.page_views ?? 0);
  // Placeholders only before the first answer: a choice asks again, and the
  // rows on screen stay until the new ones arrive rather than blinking out.
  const waiting = visitors.loading && visitors.data === null;
  const spanWords = SPANS.find((one) => one.key === span)?.label.toLowerCase() ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitors"
        description="Who uses Artha Science, how often, and which pages. Only you can see this page."
        actions={
          <Chooser
            options={SPANS}
            chosen={span}
            onChange={(key) => {
              setSpan(key);
            }}
            label="Span"
          />
        }
      />

      {visitors.error !== null ? (
        <Failed message={visitors.error} />
      ) : (
        <>
          <section className="space-y-3" aria-label="Totals">
            <SectionHeader
              title={person === null ? "Everyone" : person.name}
              description={
                person === null
                  ? `Over ${spanWords}.`
                  : `Only ${person.name}, over ${spanWords}. Choose them again for everyone.`
              }
            />
            {person === null ? (
              <StatGrid className="lg:grid-cols-3">
                <StatTile
                  label="People active"
                  value={`${String(active)} of ${String(people.length)}`}
                  loading={waiting}
                  hint="Accounts that opened a page in the span."
                />
                <StatTile
                  label="Page views"
                  value={formatCount(opened)}
                  loading={waiting}
                  hint="Pages opened, by anyone."
                />
                <StatTile
                  label="Not signed in"
                  value={anonymous === undefined ? ABSENT : formatCount(anonymous.visitors)}
                  loading={waiting}
                  {...(anonymous === undefined
                    ? {}
                    : {
                        hint: `Browsers at the sign-in page, ${formatCount(anonymous.page_views)} views.`,
                      })}
                />
              </StatGrid>
            ) : (
              <StatGrid className="lg:grid-cols-3">
                <StatTile label="Days active" value={formatCount(person.active_days)} />
                <StatTile label="Visits" value={formatCount(person.visits)} />
                <StatTile label="Page views" value={formatCount(person.page_views)} />
              </StatGrid>
            )}
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">People</CardTitle>
              <CardDescription>
                Every account. A visit is a sitting: a pause of over half an hour starts a new one.
                Choose a person to see their pages below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PeopleTable
                people={people}
                loading={waiting}
                chosen={person?.account_id ?? null}
                onSelect={(chosen) => {
                  setPerson(chosen.account_id === person?.account_id ? null : chosen);
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {person === null ? "Most viewed pages" : `${person.name}'s pages`}
                  </CardTitle>
                  <CardDescription>
                    {person === null
                      ? "Everyone's, the sign-in page's visitors included."
                      : `Only what ${person.email} opened.`}
                  </CardDescription>
                </div>
                {person !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPerson(null);
                    }}
                  >
                    Everyone&apos;s pages
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <PagesTable pages={visitors.data?.pages ?? []} loading={waiting} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Day by day</CardTitle>
              <CardDescription>
                Pages opened each day, and below, the people and the browsers not signed in that
                opened them. Days with nothing opened are left out.
              </CardDescription>
            </CardHeader>
            <CardContent role="region" aria-label="Day by day">
              <DayChart days={visitors.data?.days ?? []} loading={waiting} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/** Every account, with what it did in the span. */
function PeopleTable({
  people,
  loading,
  chosen,
  onSelect,
}: {
  people: PersonUse[];
  loading: boolean;
  /** The account whose pages are shown, marked in the table; null for everyone's. */
  chosen: number | null;
  onSelect: (person: PersonUse) => void;
}): React.JSX.Element {
  const columns = useMemo<Column<PersonUse>[]>(
    () => [
      { id: "name", header: "Name", accessorFn: (row) => row.name },
      { id: "email", header: "Email", accessorFn: (row) => row.email },
      {
        id: "joined_at",
        header: "Joined",
        accessorFn: (row) => row.joined_at,
        cell: ({ row }) => formatDayInIndia(row.original.joined_at),
      },
      {
        id: "last_seen_at",
        header: "Last seen",
        accessorFn: (row) => row.last_seen_at ?? "",
        cell: ({ row }) => formatSince(row.original.last_seen_at),
      },
      count("active_days", "Days active", (row) => row.active_days),
      count("visits", "Visits", (row) => row.visits),
      count("page_views", "Page views", (row) => row.page_views),
    ],
    [],
  );
  return (
    <DataTable
      columns={columns}
      rows={people}
      loading={loading}
      onSelect={onSelect}
      selected={(row) => row.account_id === chosen}
      empty="No accounts yet"
      label="People"
    />
  );
}

/** The pages opened most, each leading to itself. */
function PagesTable({ pages, loading }: { pages: PageUse[]; loading: boolean }): React.JSX.Element {
  const columns = useMemo<Column<PageUse>[]>(
    () => [
      {
        id: "path",
        header: "Page",
        accessorFn: (row) => row.path,
        cell: ({ row }) => (
          <Link
            to={row.original.path}
            className="font-mono text-xs hover:text-primary hover:underline"
          >
            {row.original.path}
          </Link>
        ),
      },
      count("page_views", "Views", (row) => row.page_views),
      count("people", "People", (row) => row.people),
    ],
    [],
  );
  return (
    <DataTable
      columns={columns}
      rows={pages}
      loading={loading}
      empty="No pages opened in this span"
      label="Pages"
    />
  );
}

/** The lines the day chart draws: pages above, people and anonymous browsers in a band below. */
const DAY_LINES: { label: string; of: (day: DayUse) => number; pane: number }[] = [
  { label: "Page views", of: (day) => day.page_views, pane: 0 },
  { label: "People", of: (day) => day.people, pane: 1 },
  { label: "Not signed in", of: (day) => day.anonymous_visitors, pane: 1 },
];

/** Pages opened each day, over the people and anonymous browsers that opened them. */
function DayChart({ days, loading }: { days: DayUse[]; loading: boolean }): React.JSX.Element {
  const series = useMemo<Series[]>(
    () =>
      coloured(DAY_LINES).map((line) => ({
        kind: "line",
        label: line.label,
        colour: line.colour,
        pane: line.pane,
        scale: "count",
        points: days.map((day) => ({ time: day.day, value: line.of(day) })),
      })),
    [days],
  );
  return (
    <Chart series={series} scale="count" loading={loading} empty="No pages opened in this span" />
  );
}

/** A column of whole numbers, right-aligned for comparing down it. */
function count<Row>(id: string, header: string, of: (row: Row) => number): Column<Row> {
  return {
    id,
    header,
    accessorFn: of,
    cell: ({ row }) => formatCount(of(row.original)),
    meta: { align: "right" },
  };
}
