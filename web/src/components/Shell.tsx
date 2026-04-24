import type { ReactNode } from "react";
import { tokens as t } from "../lib/tokens";
import { getServerUrl } from "../lib/api";

export type ScreenKey =
  | "dashboard"
  | "styles"
  | "projects"
  | "prefs"
  | "add"
  | "json"
  | "activity"
  | "tools";

interface ShellProps {
  screen: ScreenKey;
  setScreen: (s: ScreenKey) => void;
  children: ReactNode;
}

const NAV: Array<[ScreenKey, string, string]> = [
  ["dashboard", "Overview", "01"],
  ["styles", "Writing styles", "02"],
  ["projects", "Projects", "03"],
  ["prefs", "Preferences", "04"],
  ["add", "New entry", "05"],
  ["json", "Raw payload", "06"],
  ["activity", "Activity", "07"],
  ["tools", "Tools", "08"],
];

export function Shell({ screen, setScreen, children }: ShellProps): JSX.Element {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.ink,
        fontFamily: t.sans,
        display: "flex",
      }}
    >
      <aside
        style={{
          width: 220,
          padding: "34px 24px",
          borderRight: `1px solid ${t.rule}`,
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div
          style={{
            fontFamily: t.serif,
            fontSize: 26,
            lineHeight: 1,
            letterSpacing: -0.5,
            marginBottom: 4,
          }}
        >
          Context
        </div>
        <div
          style={{
            fontFamily: t.serif,
            fontSize: 26,
            lineHeight: 1,
            letterSpacing: -0.5,
            fontStyle: "italic",
            color: t.accent,
            marginBottom: 6,
          }}
        >
          commonplace
        </div>
        <div
          style={{
            fontFamily: t.mono,
            fontSize: 10,
            letterSpacing: 2,
            color: t.accent,
            marginBottom: 28,
          }}
        >
          PUBLIC DEMO
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(([k, label, n]) => {
            const on = k === screen;
            return (
              <button
                key={k}
                onClick={() => setScreen(k)}
                style={{
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: "7px 0",
                  fontFamily: "inherit",
                  fontSize: 14,
                  cursor: "pointer",
                  color: on ? t.accent : t.ink,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  fontWeight: on ? 500 : 400,
                }}
              >
                <span
                  style={{
                    fontFamily: t.serif,
                    fontSize: 13,
                    fontStyle: "italic",
                    color: t.faint,
                    width: 18,
                  }}
                >
                  {n}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <div style={{ flex: 1 }} />
        <div
          style={{
            fontSize: 11,
            color: t.faint,
            lineHeight: 1.6,
            borderTop: `1px solid ${t.rule}`,
            paddingTop: 14,
          }}
        >
          <div style={{ color: t.ink, marginBottom: 2 }}>Demo server</div>
          <div
            style={{
              fontFamily: t.mono,
              fontSize: 10,
              wordBreak: "break-all",
            }}
          >
            {getServerUrl()}
          </div>
          <div style={{ marginTop: 6, fontStyle: "italic", fontFamily: t.serif }}>
            resets hourly. edit freely.
          </div>
          <div style={{ marginTop: 10 }}>
            <a
              href="https://github.com/dyuhaus/dy-mcp-demo"
              target="_blank"
              rel="noreferrer"
              style={{
                color: t.faint,
                fontSize: 11,
                textDecoration: "underline",
              }}
            >
              source on github →
            </a>
          </div>
        </div>
      </aside>
      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
