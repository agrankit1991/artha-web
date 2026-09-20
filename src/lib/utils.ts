import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, letting later Tailwind utilities win over earlier ones.
 *
 * shadcn's convention, and the reason a component can accept a `className`
 * that overrides part of its own styling without fighting specificity.
 *
 * @param inputs - Class values, conditionals included.
 * @returns The merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
