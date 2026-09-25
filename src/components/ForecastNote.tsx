/**
 * What the forecast band on a chart claims, and how that claim fared in testing.
 *
 * A band drawn without its record reads as a prediction. This states the
 * range in rupees, the model that drew it, how often in years it never saw
 * the price really ended inside it, and whether its middle line has shown
 * any skill -- so a reader can weigh it rather than follow it.
 */

import type { PriceBands } from "@/api/client";
import { formatDay, formatPrice } from "@/lib/format";
import { longestRecord, methodName, middleHasSkill } from "@/lib/forecastBands";

interface ForecastNoteProps {
  bands: PriceBands;
}

/**
 * Explain the forecast band.
 *
 * @param props - The bands drawn.
 * @returns The explanation.
 */
export function ForecastNote({ bands }: ForecastNoteProps): React.JSX.Element {
  const last = bands.points.at(-1);
  const record = longestRecord(bands);
  return (
    <div className="space-y-1 text-xs text-muted-foreground" data-testid="forecast-note">
      {last && (
        <p>
          <span className="font-medium text-foreground">Forecast</span> (violet, dashed): in{" "}
          {last.horizon} sessions
          {last.session === null ? "" : `, by ${formatDay(last.session)}`}, the price is likely
          between {formatPrice(last.low)} and {formatPrice(last.high)} — an 80% range, drawn from
          the close of {formatDay(bands.as_of)}. About one time in five it lands outside.
        </p>
      )}
      {record && (
        <p>
          Drawn from {methodName(record.method)}. Tested on years it never saw, from{" "}
          {record.tested_from.slice(0, 4)}, the price ended inside the band{" "}
          {Math.round(record.inside_band * 100)}% of the time.{" "}
          {middleHasSkill(record)
            ? `Its middle line missed by ${record.median_error.toFixed(1)}% on average, against ${record.zero_error.toFixed(1)}% for assuming no change.`
            : "Its middle line did no better than assuming no change, so it is drawn flat at the last close."}
        </p>
      )}
    </div>
  );
}
