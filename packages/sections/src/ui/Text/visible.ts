/** The copy the text block shows: the body and the action go when their layout flags hide them (like `Text`). */
export function visibleText(stored: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out = { ...stored };
  if (out.showBody === false) delete out.body;
  if (out.showAction === false) delete out.action;
  return out;
}
