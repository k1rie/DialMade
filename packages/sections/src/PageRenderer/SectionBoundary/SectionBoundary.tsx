"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

export interface SectionBoundaryProps {
  /** When it changes after a failure (new props), the section is tried again. */
  resetKey: unknown;
  fallback: ReactNode;
  onError?: (error: unknown) => void;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Isolates a section: if it throws, only that section shows the fallback. Client only (React has no SSR boundaries). */
export class SectionBoundary extends Component<SectionBoundaryProps, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, _info: ErrorInfo) {
    this.props.onError?.(error);
  }

  override componentDidUpdate(previous: SectionBoundaryProps) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
