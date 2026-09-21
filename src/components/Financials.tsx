/**
 * What a company has reported, and the three choices that decide which.
 *
 * A company reports the same quarter twice -- once for the parent alone
 * and once for the group -- and reports it yearly as well. Those are
 * different statements about different things, so they are chosen between
 * rather than merged: a consolidated revenue laid beside a standalone one
 * is a comparison nobody asked for and a reader cannot see they are
 * making.
 *
 * Only what the company actually filed is offered. A basis it does not
 * report on is absent from the chooser rather than present and empty,
 * because an empty table looks like a fault and a missing button is a
 * fact about the company.
 */

import { useMemo, useState } from "react";

import type { ReportingBasis, ReportingFrequency, Statement, StatementKind } from "@/api/client";
import { Chooser, type Option } from "@/components/Chooser";
import { StatementTable } from "@/components/StatementTable";

interface FinancialsProps {
  statements: Statement[] | null;
  loading?: boolean;
}

/** What each statement is called, and the order they are read in. */
const STATEMENTS: { key: StatementKind; label: string }[] = [
  { key: "INCOME_STATEMENT", label: "Income statement" },
  { key: "BALANCE_SHEET", label: "Balance sheet" },
  { key: "CASH_FLOW", label: "Cash flow" },
];

/** What each basis is called. */
const BASES: Record<ReportingBasis, string> = {
  CONSOLIDATED: "Consolidated",
  STANDALONE: "Standalone",
  NOT_APPLICABLE: "As filed",
};

/** What each frequency is called. */
const FREQUENCIES: Record<ReportingFrequency, string> = {
  YEARLY: "Yearly",
  QUARTERLY: "Quarterly",
};

/**
 * Draw the statements, and the choices between them.
 *
 * @param props - Every statement the company has filed.
 * @returns The section.
 */
export function Financials({ statements, loading = false }: FinancialsProps): React.JSX.Element {
  const filed = useMemo(
    () => (statements ?? []).filter((one) => one.statement !== "SHAREHOLDING"),
    [statements],
  );
  const [kind, setKind] = useState<StatementKind>("INCOME_STATEMENT");
  const [basis, setBasis] = useState<ReportingBasis>("CONSOLIDATED");
  const [frequency, setFrequency] = useState<ReportingFrequency>("YEARLY");

  const kinds = useMemo(
    () => STATEMENTS.filter((one) => filed.some((each) => each.statement === one.key)),
    [filed],
  );
  const forKind = useMemo(() => filed.filter((one) => one.statement === kind), [filed, kind]);
  const bases = useMemo(
    () =>
      offered(
        forKind.map((one) => one.basis),
        BASES,
      ),
    [forKind],
  );
  const frequencies = useMemo(
    () =>
      offered(
        forKind.filter((one) => one.basis === basis).map((one) => one.frequency),
        FREQUENCIES,
      ),
    [forKind, basis],
  );

  // What is showing has to survive a change to any of the three: a company
  // reporting a balance sheet yearly only would otherwise go blank the
  // moment somebody looking at quarterly income switched statement.
  const showing =
    forKind.find((one) => one.basis === basis && one.frequency === frequency) ??
    forKind.find((one) => one.basis === basis) ??
    forKind[0] ??
    null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Chooser options={kinds} chosen={kind} onChange={setKind} label="Statement" />
        {showing !== null && bases.length > 1 && (
          <Chooser
            options={bases}
            chosen={showing.basis}
            onChange={setBasis}
            label="Reporting basis"
          />
        )}
        {showing !== null && frequencies.length > 1 && (
          <Chooser
            options={frequencies}
            chosen={showing.frequency}
            onChange={setFrequency}
            label="Reporting period"
          />
        )}
      </div>
      <StatementTable
        statement={showing}
        loading={loading}
        empty="No statements filed for this company"
      />
      <p className="text-xs text-muted-foreground">
        Figures in crore, except earnings per share, which is in rupees. As reported, and as they
        were known today — a later restatement is recorded beside the original rather than replacing
        it.
      </p>
    </div>
  );
}

/**
 * The distinct values actually filed, in a fixed order, named.
 *
 * @param found - Every value present across the filed statements.
 * @param names - What each value is called.
 * @returns The options, in the order the names are declared.
 */
function offered<Key extends string>(found: Key[], names: Record<Key, string>): Option<Key>[] {
  const present = new Set(found);
  return (Object.keys(names) as Key[])
    .filter((key) => present.has(key))
    .map((key) => ({ key, label: names[key] }));
}
