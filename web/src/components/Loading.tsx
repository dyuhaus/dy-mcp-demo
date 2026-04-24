import { tokens as t } from "../lib/tokens";

interface LoadingProps {
  label?: string;
}

export function Loading({ label = "Loading…" }: LoadingProps): JSX.Element {
  return (
    <div
      style={{
        padding: "80px 48px",
        fontFamily: t.serif,
        fontStyle: "italic",
        color: t.faint,
        fontSize: 18,
      }}
    >
      {label}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }): JSX.Element {
  return (
    <div
      style={{
        padding: "24px 48px",
        fontFamily: t.sans,
        fontSize: 13,
        color: t.accent,
        borderTop: `1px solid ${t.rule}`,
        borderBottom: `1px solid ${t.rule}`,
        background: t.paper,
        margin: "24px 48px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 2,
          color: t.faint,
          marginBottom: 4,
        }}
      >
        SOMETHING WENT WRONG
      </div>
      <div style={{ fontFamily: t.mono, fontSize: 12, color: t.ink }}>{message}</div>
    </div>
  );
}

export function Empty({ label }: { label: string }): JSX.Element {
  return (
    <div
      style={{
        padding: "24px 0",
        fontFamily: t.serif,
        fontStyle: "italic",
        color: t.faint,
        fontSize: 16,
      }}
    >
      {label}
    </div>
  );
}
