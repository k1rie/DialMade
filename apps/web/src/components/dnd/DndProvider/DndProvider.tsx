"use client";

import { Accessibility, Feedback, KeyboardSensor, type KeyboardSensorOptions } from "@dnd-kit/dom";
import { DragDropProvider, type DragDropEventHandlers } from "@dnd-kit/react";
import type { ComponentProps, ReactNode } from "react";
import { DndAnnouncer } from "@/components/dnd/DndAnnouncer";
import { easeCss } from "@/lib/motion";
import { motionDropAnimation } from "./motionDropAnimation";
import { useKeyboardTargets } from "./useKeyboardTargets";

type ProviderProps = ComponentProps<typeof DragDropProvider>;
type PluginsInput = Extract<NonNullable<ProviderProps["plugins"]>, (...args: never[]) => unknown>;
type SensorsInput = Extract<NonNullable<ProviderProps["sensors"]>, (...args: never[]) => unknown>;

// Arrow keys are handled by useKeyboardTargets (jump between slots), not by the sensor.
const keyboardCodes: KeyboardSensorOptions["keyboardCodes"] = {
  start: ["Space", "Enter"],
  cancel: ["Escape"],
  end: ["Space", "Enter", "Tab"],
  up: [],
  down: [],
  left: [],
  right: [],
};

// dnd-kit's Accessibility plugin is English-only; DndAnnouncer + DraggableItem own a11y (es/en).
const plugins: PluginsInput = (defaults) => [
  ...defaults.filter((plugin) => plugin !== Accessibility && plugin !== Feedback),
  Feedback.configure({
    dropAnimation: motionDropAnimation,
    keyboardTransition: { duration: 280, easing: easeCss },
  }),
];

const sensors: SensorsInput = (defaults) =>
  defaults.map((sensor) => (sensor === KeyboardSensor ? KeyboardSensor.configure({ keyboardCodes }) : sensor));

function KeyboardTargets() {
  useKeyboardTargets();
  return null;
}

export type DndProviderProps = {
  children: ReactNode;
} & Partial<Pick<DragDropEventHandlers, "onDragStart" | "onDragOver" | "onDragMove" | "onDragEnd">>;

/** DragDropProvider with the app's sensors, Motion drop animation, keyboard slot navigation and es/en announcer. */
export function DndProvider({ children, ...handlers }: DndProviderProps) {
  return (
    <DragDropProvider plugins={plugins} sensors={sensors} {...handlers}>
      <KeyboardTargets />
      <DndAnnouncer>{children}</DndAnnouncer>
    </DragDropProvider>
  );
}
