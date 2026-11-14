// Every story reads the design tokens and the Options panel's own stylesheet, on the page's ground.
import "../../../ui/tokens/out/tokens.css";
import "../options.css";
import "./catalogue.css";

export const Provider = ({ children }) => (
  <div style={{ background: "var(--mb-ground)", color: "var(--mb-fog)", font: '500 16px/1 "Inter", system-ui, sans-serif', minHeight: "100vh", padding: "var(--mb-space-16)", boxSizing: "border-box" }}>
    {children}
  </div>
);
