/**
 * The reader's line styles: every kind of line a chart draws, how each is
 * drawn now, and the editor to change it (the owner, 2026-11-08: "I should be
 * able to choose colors and thickness of lines, including indicators").
 *
 * A change applies to every chart at once and is kept on the account, so it
 * follows the reader to every device; Reset all returns every line to the
 * chart's own. Opened from any price chart's controls.
 */

import { Failed } from "@/components/Failed";
import { LineStyleEditor } from "@/components/LineStyleEditor";
import { Dialog } from "@/components/Dialog";
import { Button } from "@/components/ui/button";
import { CHART_LINES, LINE_KEYS } from "@/lib/chartLines";
import { useLineStyles } from "@/lib/lineStyles";

interface LineStylesDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Render the dialog while it is open.
 *
 * @param props - Whether it is open, and how it closes.
 * @returns The dialog.
 */
export function LineStylesDialog({ open, onClose }: LineStylesDialogProps): React.JSX.Element {
  const styles = useLineStyles();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Line styles"
      description="Your colours and thicknesses, on every chart and every device you sign in on."
      className="max-w-2xl"
      actions={
        <>
          <Button variant="outline" onClick={styles.forgetAll}>
            Reset all
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      {styles.problem !== null && <Failed message={styles.problem} />}
      <ul className="max-h-[60vh] space-y-5 overflow-y-auto pr-1" aria-label="Lines">
        {LINE_KEYS.map((line) => {
          const look = styles.drawn(line);
          return (
            <li key={line} className="space-y-2">
              <div className="flex items-center gap-2">
                <svg aria-hidden="true" width="28" height="8" className="shrink-0">
                  <line
                    x1="0"
                    y1="4"
                    x2="28"
                    y2="4"
                    style={{ stroke: look.colour }}
                    strokeWidth={look.width}
                  />
                </svg>
                <span className="text-sm font-medium">{CHART_LINES[line].label}</span>
              </div>
              <LineStyleEditor
                label={CHART_LINES[line].label}
                own={styles.own(line)}
                fallbackColour={CHART_LINES[line].colour}
                onChange={(change) => {
                  styles.save(line, change);
                }}
              />
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
