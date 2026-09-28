/**
 * One member of a set the reader builds, with the way to take it out.
 *
 * The things compared on the compare page and the populations laid side by
 * side in the participation heatmap are both chosen by the reader one at a
 * time, and removing one should look and work the same in either place.
 */

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ChipProps {
  /** What the chip names, and anything drawn before the controls. */
  children: React.ReactNode;
  /** What to call the remove button for a reader who cannot see the cross. */
  removeLabel: string;
  onRemove: () => void;
  /** Controls drawn before the cross, such as moving the chip along. */
  controls?: React.ReactNode;
}

/**
 * Draw the chip.
 *
 * @param props - What it names, its extra controls, and how to remove it.
 * @returns The chip.
 */
export function Chip({ children, removeLabel, onRemove, controls }: ChipProps): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2.5 text-sm">
      {children}
      {controls}
      <ChipButton label={removeLabel} onClick={onRemove}>
        <X aria-hidden="true" className="h-3 w-3" />
      </ChipButton>
    </span>
  );
}

interface ChipButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * A round icon button sized to sit inside a chip.
 *
 * @param props - What it is called, what it does, and its icon.
 * @returns The button.
 */
export function ChipButton({
  label,
  onClick,
  disabled = false,
  children,
}: ChipButtonProps): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      disabled={disabled}
      className="h-6 w-6 rounded-full p-0"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
