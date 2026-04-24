import { tokens as t } from "../lib/tokens";
import { getActivity } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Loading, ErrorNote, Empty } from "../components/Loading";

export function Activity(): JSX.Element {
  const { data, loading, error } = useAsync(() => getActivity(200));
  if (loading) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Empty label="no activity yet." />;

  return (
    <div style={{ padding: "36px 48px" }}>
      <div
        style={{
          fontFamily: t.serif,
          fontSize: 40,
          letterSpacing: -0.8,
          marginBottom: 4,
        }}
      >
        Activity
      </div>
      <div
        style={{
          fontFamily: t.serif,
          fontStyle: "italic",
          color: t.faint,
          marginBottom: 24,
        }}
      >
        who has been reading from the shelf.
      </div>
      {data.items.length === 0 && (
        <Empty label="no reads yet. agents will show up here." />
      )}
      <div style={{ borderTop: `1px solid ${t.ruleStrong}` }}>
        {data.items.map((r, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "70px 180px 100px 1fr",
              padding: "12px 0",
              borderBottom: `1px solid ${t.rule}`,
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontFamily: t.serif,
                fontStyle: "italic",
                color: t.faint,
                fontSize: 15,
              }}
            >
              {r.t}
            </span>
            <span
              style={{
                fontFamily: t.serif,
                fontSize: 17,
                color: t.accent,
              }}
            >
              {r.agent}
            </span>
            <span
              style={{
                fontSize: 12,
                color: t.faint,
                letterSpacing: 1,
              }}
            >
              {r.action === "write" ? "WROTE TO" : "READ"}
            </span>
            <span
              style={{
                fontFamily: t.mono,
                fontSize: 12,
                color: t.ink,
              }}
            >
              {r.key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
