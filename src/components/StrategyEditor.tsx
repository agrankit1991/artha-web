/**
 * A strategy's text, checked as it is typed.
 *
 * The platform reads the text exactly as the backtester will -- the
 * strategies a combination plays found among the saved ones, every series
 * and function known -- so a text this calls valid is a backtest that
 * runs. It checks once typing stops (`useDebounced`): a check per
 * keystroke would race its own answers.
 */

import { CircleCheck, CircleX } from "lucide-react";
import { useCallback } from "react";

import { type StrategyCheck, checkStrategy } from "@/api/client";
import { useDebounced } from "@/hooks/useDebounced";
import { useResource } from "@/hooks/useResource";

/** How long typing must stop before the text is checked, in milliseconds. */
const SETTLE = 500;

interface StrategyEditorProps {
  text: string;
  onChange: (text: string) => void;
}

/**
 * Draw the text and what the platform makes of it.
 *
 * @param props - The text, and what to call when it is edited.
 * @returns The editor.
 */
export function StrategyEditor({ text, onChange }: StrategyEditorProps): React.JSX.Element {
  const settled = useDebounced(text, SETTLE);
  const load = useCallback(
    () => (settled.trim() === "" ? Promise.resolve(null) : checkStrategy(settled)),
    [settled],
  );
  const check = useResource(load);

  return (
    <div className="space-y-2">
      <textarea
        aria-label="Strategy text"
        value={text}
        spellCheck={false}
        rows={26}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
      />
      {check.error !== null ? (
        <p role="status" className="text-sm text-loss">
          Could not check it: {check.error}
        </p>
      ) : (
        check.data !== null && <Verdict check={check.data} />
      )}
    </div>
  );
}

/** Whether the text reads, and what it plays. */
function Verdict({ check }: { check: StrategyCheck }): React.JSX.Element {
  if (!check.valid) {
    return (
      <p role="status" className="flex items-start gap-2 text-sm text-loss">
        <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="font-mono text-xs leading-5">{check.message}</span>
      </p>
    );
  }
  return (
    <div role="status" className="flex items-start gap-2 text-sm text-gain">
      <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        Reads as <span className="font-medium">{check.name}</span>
        {check.combines && (
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {check.plays.map((play) => (
              <li key={play.name}>
                plays <span className="font-medium text-foreground">{play.name}</span>{" "}
                {play.when === "1" ? "otherwise" : <code>when {play.when}</code>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
