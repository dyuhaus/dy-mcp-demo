import { useMemo } from "react";
import { tokens as t } from "../lib/tokens";
import { getExport } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Loading, ErrorNote } from "../components/Loading";

export function JsonView(): JSX.Element {
  const { data, loading, error } = useAsync(getExport);

  const str = useMemo(() => (data ? JSON.stringify(data, null, 2) : ""), [data]);

  const meta = useMemo(() => {
    if (!data) return null;
    const byteSize = new Blob([str]).size;
    const keys = countKeys(data);
    return {
      size: byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} kb`,
      keys: String(keys),
      schema: "mcp / v1",
    };
  }, [data, str]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(str);
    } catch {
      /* ignore */
    }
  };

  const download = () => {
    const blob = new Blob([str], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "personal-context.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorNote message={error} />;

  return (
    <div
      style={{
        padding: "36px 48px",
        height: "100%",
        display: "grid",
        gridTemplateColumns: "1fr 240px",
        gap: 28,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: t.serif,
            fontSize: 36,
            letterSpacing: -0.6,
            marginBottom: 4,
          }}
        >
          The payload
        </div>
        <div
          style={{
            fontFamily: t.serif,
            fontStyle: "italic",
            color: t.faint,
            marginBottom: 18,
          }}
        >
          what any agent sees when it asks.
        </div>
        <pre
          style={{
            background: t.paper,
            border: `1px solid ${t.rule}`,
            padding: "20px 24px",
            fontFamily: t.mono,
            fontSize: 12,
            lineHeight: 1.65,
            color: t.ink,
            margin: 0,
            overflow: "auto",
            maxHeight: "70vh",
          }}
        >
          {str}
        </pre>
      </div>
      <div style={{ paddingTop: 64 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: t.faint,
            marginBottom: 10,
          }}
        >
          META
        </div>
        <div style={{ borderTop: `1px solid ${t.ruleStrong}` }}>
          {meta &&
            (
              [
                ["size", meta.size],
                ["keys", meta.keys],
                ["schema", meta.schema],
              ] as Array<[string, string]>
            ).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: `1px solid ${t.rule}`,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: t.faint,
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontFamily: t.serif,
                    fontSize: 15,
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
        </div>
        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            onClick={copy}
            style={{
              textAlign: "left",
              background: t.ink,
              color: t.paper,
              border: "none",
              padding: "10px 14px",
              fontSize: 12,
              letterSpacing: 1,
              cursor: "pointer",
              fontFamily: t.sans,
            }}
          >
            COPY PAYLOAD
          </button>
          <button
            onClick={download}
            style={{
              textAlign: "left",
              background: "transparent",
              color: t.ink,
              border: `1px solid ${t.ruleStrong}`,
              padding: "10px 14px",
              fontSize: 12,
              letterSpacing: 1,
              cursor: "pointer",
              fontFamily: t.sans,
            }}
          >
            DOWNLOAD .json
          </button>
        </div>
      </div>
    </div>
  );
}

function countKeys(v: unknown): number {
  if (v == null) return 0;
  if (Array.isArray(v)) {
    let n = 0;
    for (const x of v) n += countKeys(x);
    return n;
  }
  if (typeof v === "object") {
    let n = Object.keys(v as Record<string, unknown>).length;
    for (const k of Object.keys(v as Record<string, unknown>)) {
      n += countKeys((v as Record<string, unknown>)[k]);
    }
    return n;
  }
  return 0;
}
