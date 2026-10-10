"use client";

import type { ScreenId } from "@dialmade/layout";
import { useId, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { useLayoutActions, useLayoutStoreApi } from "../../useLayoutStore";
import { checkRoute, type RouteProblem } from "../route";
import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL } from "../styles";
import { useFieldDraft } from "../useFieldDraft";

export type RouteFieldProps = {
  screenId: ScreenId;
  route: string;
};

/** Longest route the field takes (slugs are ≤48 per segment; a few segments fit). */
const ROUTE_MAX = 120;

/**
 * «Ruta»: applied on blur or Enter, normalized («precios» → «/precios»). A malformed or taken route is
 * refused with the reason under the field and the text stays to be fixed; Esc restores the saved route.
 * While the error shows, typing a valid route clears it (a new error only appears on the next commit).
 */
export function RouteField({ screenId, route }: RouteFieldProps) {
  const t = useDictionary(layout);
  const id = useId();
  const actions = useLayoutActions();
  const store = useLayoutStoreApi();
  const [error, setError] = useState<{ screenId: ScreenId; reason: RouteProblem } | null>(null);
  const shown = error && error.screenId === screenId ? error.reason : null;

  const routes = () => Object.values(store.getState().screens).map((screen) => ({ id: screen.id, route: screen.route }));

  const field = useFieldDraft(`${screenId}:route`, route, (text) => {
    const check = checkRoute(text, screenId, routes());
    if (!check.ok) {
      setError({ screenId, reason: check.reason });
      return false;
    }
    const result = actions.setRoute(screenId, check.route);
    if (!result.ok && result.reason !== "missing") {
      setError({ screenId, reason: result.reason });
      return false;
    }
    setError(null);
    return true;
  });

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    field.onChange(event);
    if (shown && checkRoute(event.target.value, screenId, routes()).ok) setError(null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") setError(null);
    field.onKeyDown(event);
  };

  const describedBy = shown ? `${id}-error ${id}-hint` : `${id}-hint`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL}>
        {t.screenPanel.route}
      </label>
      <input
        id={id}
        type="text"
        value={field.value}
        maxLength={ROUTE_MAX}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={shown ? true : undefined}
        aria-describedby={describedBy}
        onChange={onChange}
        onBlur={field.onBlur}
        onKeyDown={onKeyDown}
        className={cn(FIELD_CONTROL, "h-8 font-mono aria-[invalid=true]:border-danger")}
      />
      {shown && (
        <p id={`${id}-error`} role="alert" className="text-caption text-danger">
          {shown === "taken" ? t.screenPanel.routeTaken : t.screenPanel.routeInvalid}
        </p>
      )}
      <p id={`${id}-hint`} className={FIELD_HINT}>
        {t.screenPanel.routeHint}
      </p>
    </div>
  );
}
