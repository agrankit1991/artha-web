/**
 * What a strategy's rules may read and call, from the platform itself.
 *
 * Asked of the platform rather than written here, so the list is the one
 * the check enforces: a series added there appears here with no change to
 * this page.
 */

import { fetchStrategyLanguage } from "@/api/client";
import { useResource } from "@/hooks/useResource";

/**
 * Draw the series and functions, folded away until asked for.
 *
 * @returns The help.
 */
export function StrategyLanguage(): React.JSX.Element {
  const language = useResource(fetchStrategyLanguage);

  return (
    <details className="rounded-md border px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium">What a rule may use</summary>
      {language.error !== null ? (
        <p className="mt-2 text-loss">{language.error}</p>
      ) : (
        language.data !== null && (
          <div className="mt-3 space-y-3">
            <Words title="Series" words={language.data.series} />
            <Words title="Functions" words={language.data.functions} />
            <p className="text-xs text-muted-foreground">
              Operators: + - * / &lt; &lt;= &gt; &gt;= == != and or not, parentheses and numbers
              such as 1e8. month, quarter and year are the session&apos;s own, for rules by the
              calendar. Windows count each company&apos;s own sessions, and a comparison with an
              unknown value is false either way.
            </p>
          </div>
        )
      )}
    </details>
  );
}

/** One list of names. */
function Words({ title, words }: { title: string; words: string[] }): React.JSX.Element {
  return (
    <div>
      <h3 className="mb-1 text-xs font-medium text-muted-foreground">{title}</h3>
      <ul aria-label={title} className="flex flex-wrap gap-1">
        {words.map((word) => (
          <li key={word}>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{word}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
