import type { SectionStyle } from "../lib/knobs";

export interface CtaProps extends SectionStyle {
  title: string;
  subtitle: string;
  button: string;
  /** Empty hides it. Not shown with the form. */
  secondaryButton: string;
  /** Small print under the actions; empty hides it. */
  note: string;
  /** An email field next to the button (newsletter, waitlist). */
  showForm: boolean;
}
