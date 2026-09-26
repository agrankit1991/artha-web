/**
 * A yes-or-no question before something is deleted.
 *
 * The action is awaited inside the dialog, so a refusal from the platform
 * is shown where it was asked rather than lost after the dialog closes.
 */

import { useState } from "react";

import { Dialog } from "@/components/Dialog";
import { Button } from "@/components/ui/button";

/**
 * Ask before something is deleted.
 *
 * @param props - What is asked, the action's name, and what it does.
 * @returns The dialog; it stays open showing why when the action fails.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  action,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  action: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}): React.JSX.Element {
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setProblem(null);
              onConfirm()
                .catch((error: unknown) => {
                  setProblem(error instanceof Error ? error.message : "Could not do that");
                })
                .finally(() => {
                  setBusy(false);
                });
            }}
          >
            {action}
          </Button>
        </>
      }
    >
      {problem !== null && <p className="text-sm text-loss">{problem}</p>}
    </Dialog>
  );
}
