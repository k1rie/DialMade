import { Icon, type IconProps } from "../icons";

/* Icons only the screens panel uses (same 16×16 grid and stroke as LayoutStep/icons.tsx). */

/** «Renombrar»: a pencil. */
export const PencilIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.75 2.75a1.77 1.77 0 0 1 2.5 2.5L5.5 13l-3 .5.5-3z" />
    <path d="m9.5 4 2.5 2.5" />
  </Icon>
);
