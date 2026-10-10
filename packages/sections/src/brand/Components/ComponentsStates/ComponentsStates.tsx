import type { ReactNode } from "react";
import { Button, Checkbox, Input, Switch, type ButtonVariant, type PreviewState } from "@dialmade/ui";
import type { RenderContext } from "../../../types";
import { COMPONENTS_COPY } from "../copy";
import "./ComponentsStates.css";

export interface ComponentsStatesProps {
  ctx: RenderContext;
  elementId: string;
}

const STATES = ["default", "hover", "focus", "active", "disabled"] as const;
type State = (typeof STATES)[number];
const BUTTONS = ["primary", "secondary", "outline", "ghost", "cta"] as const satisfies readonly ButtonVariant[];

const previewOf = (state: State): PreviewState | undefined =>
  state === "hover" || state === "focus" || state === "active" ? state : undefined;

interface Row {
  id: string;
  label: string;
  render: (state: State, name: string) => ReactNode;
}

/** A matrix of components × states (default, hover, focus, pressed, disabled), forced with `previewState`. */
export function ComponentsStates({ ctx, elementId }: ComponentsStatesProps) {
  const copy = COMPONENTS_COPY[ctx.locale];
  const captionId = `${elementId}-states`;
  const common = (state: State) => ({
    previewState: previewOf(state),
    disabled: state === "disabled",
    tabIndex: -1,
  });

  const rows: Row[] = [
    ...BUTTONS.map(
      (variant): Row => ({
        id: variant,
        label: copy.variants[variant],
        render: (state) => (
          <Button variant={variant} size="sm" {...common(state)}>
            {copy.buttonLabel}
          </Button>
        ),
      }),
    ),
    {
      id: "input",
      label: copy.field,
      render: (state, name) => (
        <Input label={name} hideLabel size="sm" placeholder={copy.emailPlaceholder} autoComplete="off" {...common(state)} />
      ),
    },
    {
      id: "checkbox",
      label: copy.checkbox,
      render: (state, name) => <Checkbox aria-label={name} defaultChecked {...common(state)} />,
    },
    {
      id: "switch",
      label: copy.switch,
      render: (state, name) => <Switch aria-label={name} defaultChecked {...common(state)} />,
    },
  ];

  return (
    <div className="dl-brand-states" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="dl-brand-states__table">
        <caption id={captionId} className="dl-brand-states__caption">
          {copy.states}
        </caption>
        <thead>
          <tr>
            <th scope="col">{copy.component}</th>
            {STATES.map((state) => (
              <th key={state} scope="col">
                {copy.stateNames[state]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.label}</th>
              {STATES.map((state) => (
                <td key={state}>{row.render(state, `${row.label} · ${copy.stateNames[state]}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
