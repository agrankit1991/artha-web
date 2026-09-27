/**
 * A strategy in plain words, for a reader who does not write rules.
 *
 * The platform writes the words from the same parsed rules a backtest
 * plays, so they cannot say what the rules do not; this only lays them
 * out: how a combination chooses, then each strategy topic by topic, then
 * the terms a reader may not know.
 */

import type { StrategyExplanation } from "@/api/client";

interface StrategyExplanationPanelProps {
  explanation: StrategyExplanation;
}

/**
 * Draw an explanation.
 *
 * @param props - The explanation.
 * @returns The words, topic by topic.
 */
export function StrategyExplanationPanel({
  explanation,
}: StrategyExplanationPanelProps): React.JSX.Element {
  // A single strategy is named by the page around it; a combination names each one it plays.
  const combined = explanation.choosing.length > 0;
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {combined && (
        <div className="space-y-1">
          {explanation.choosing.map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
        </div>
      )}
      {explanation.plays.map((play) => (
        <section key={play.name} aria-label={`${play.name} in plain words`} className="space-y-3">
          {combined && (
            <h4 className="font-semibold">
              {play.name} <span className="font-normal text-muted-foreground">{play.when}</span>
            </h4>
          )}
          <dl className="space-y-3">
            {play.points.map((point) => (
              <div key={point.topic}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {point.topic}
                </dt>
                <dd>
                  {point.text}
                  {point.items.length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {point.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {explanation.terms.length > 0 && (
        <section aria-label="Terms" className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Terms
          </h4>
          <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[9rem_1fr]">
            {explanation.terms.map((term) => (
              <div key={term.word} className="contents">
                <dt className="font-medium">{term.word}</dt>
                <dd className="text-muted-foreground">{term.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
