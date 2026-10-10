import type { SectionComponentProps } from "../../types";
import type { RegionProps } from "./schema";
import "./Region.css";

/**
 * A region of a layout page. It adds no box: its child elements must be direct children of its wrapper
 * (the `toCss` DOM contract), so inferred regions and groups return their children as they are. The scope
 * renders the `.dl-layout` element, the query container every layout rule hangs from.
 */
export function Region({ role, screenKind, children }: SectionComponentProps<RegionProps>) {
  if (role === "scope") {
    return (
      <div className="dl-layout" data-dl-kind={screenKind}>
        {children}
      </div>
    );
  }
  return <>{children}</>;
}
