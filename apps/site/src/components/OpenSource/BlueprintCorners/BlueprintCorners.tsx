/**
 * «+» marks on the corners of a frame, like a technical drawing (Save.design). Fine guides extend the
 * straight edges past the rounded corners, so each «+» sits on a crossing instead of floating. They
 * reach 12 px out, inside the 16 px page gutter on phones. Decorative.
 */
export function BlueprintCorners() {
  const mark = "absolute size-3 text-white/30";
  const guide = "absolute bg-white/[0.06]";
  const plus = (
    <svg viewBox="0 0 12 12" fill="none" className="size-3">
      <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span className={`${guide} -inset-x-3 top-0 h-px`} />
      <span className={`${guide} -inset-x-3 bottom-0 h-px`} />
      <span className={`${guide} -inset-y-3 left-0 w-px`} />
      <span className={`${guide} -inset-y-3 right-0 w-px`} />
      <span className={`${mark} -top-1.5 -left-1.5`}>{plus}</span>
      <span className={`${mark} -top-1.5 -right-1.5`}>{plus}</span>
      <span className={`${mark} -bottom-1.5 -left-1.5`}>{plus}</span>
      <span className={`${mark} -right-1.5 -bottom-1.5`}>{plus}</span>
    </span>
  );
}
