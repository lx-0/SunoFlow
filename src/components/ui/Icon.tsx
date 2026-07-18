import type { LucideIcon, LucideProps } from "lucide-react";
import { ICON_SIZE, ICON_STROKE_WIDTH } from "@/lib/icon-map";

type IconProps = LucideProps & {
  /** Lucide icon component, e.g. `import { X } from "lucide-react"`. */
  icon: LucideIcon;
};

/**
 * Canonical icon wrapper (Wave A1): renders a Lucide icon with the DESIGN.md
 * defaults of size 22 / stroke 1.5. Prefer this over rendering Lucide icons
 * directly so the convention is enforced in one place.
 *
 * Tailwind `w-*`/`h-*` classes passed via `className` override the rendered
 * size (CSS wins over the SVG size attribute), so inline contexts can keep
 * their existing sizing classes during migration.
 *
 * For filled/active states (Heroicons `/24/solid` call sites), pass
 * `fill="currentColor"` — Lucide has no separate solid set.
 */
export function Icon({ icon: IconComponent, size = ICON_SIZE, strokeWidth = ICON_STROKE_WIDTH, ...rest }: IconProps) {
  return <IconComponent size={size} strokeWidth={strokeWidth} {...rest} />;
}
