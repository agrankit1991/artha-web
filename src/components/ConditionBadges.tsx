/**
 * A scan's conditions, as the screener would read them back.
 *
 * Each condition is a badge -- it describes the scan rather than being a
 * figure anyone compares -- written with the figure's label from the
 * platform's registry and the comparison as the screener writes it.
 */

import type { ScreenCondition, ScreenField, ScreenOperator } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { OPERATORS } from "@/lib/operators";

interface ConditionBadgesProps {
  conditions: ScreenCondition[];
  /** The registry, for labels; empty while it loads, when the names stand in. */
  fields: ScreenField[];
}

/**
 * Render the conditions.
 *
 * @param props - The conditions and the registry that names their figures.
 * @returns A wrapping row of badges.
 */
export function ConditionBadges({ conditions, fields }: ConditionBadgesProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1">
      {conditions.map((one) => (
        <Badge key={`${one.field}:${one.operator}`} variant="outline" className="font-mono text-xs">
          {describe(one.field, fields)} {operatorLabel(one.operator)} {one.value}
        </Badge>
      ))}
    </div>
  );
}

/** A field's label, or its name before the labels have arrived. */
function describe(field: string, fields: ScreenField[]): string {
  return fields.find((one) => one.name === field)?.label ?? field;
}

/** How an operator is written. */
function operatorLabel(operator: ScreenOperator): string {
  // Unreachable fallback: every operator the type allows is in OPERATORS,
  // but `find` cannot say so.
  return OPERATORS.find((one) => one.key === operator)?.label ?? operator;
}
