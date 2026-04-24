import { tokens as t } from "../lib/tokens";
import { getActivity, getHealth, listContexts } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Loading, ErrorNote, Empty } from "../components/Loading";
import type { ActivityEntry, Context, ProjectMeta } from "../lib/types";

interface DashboardData {
  counts: Record<string, number>;
  inProgress: Context[];
  activity: ActivityEntry[];
}

async function loadDashboard(): Promise<DashboardData> {
  const [health, projects, activity] = await Promise.all([
    getHealth(),
    listContexts({ type: "project", limit: 50 }),
    getActivity(6),
  ]);
  const inProgress = projects.items
    .filter((p) => {
      const meta = p.metadata as ProjectMeta;
      return meta.status !== "done";
    })
    .slice(0, 5);
  return {
    counts: health.counts,
    inProgress,
    activity: activity.items,
  };
}

function Stat({
  n,
  label,
  note,
}: {
  n: string | number;
  label: string;
  note?: string;
}): JSX.Element {
  return (
    <div style={{ padding: "4px 0" }}>
      <div
        style={{
          fontFamily: t.serif,
          fontSize: 52,
          lineHeight: 1,
          letterSpacing: -1.4,
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontSize: 12,
          letterSpacing: 1.5,
          color: t.faint,
          marginTop: 6,
        }}
      >
        {label.toUpperCase()}
      </div>
      {note && (
        <div
          style={{
            fontFamily: t.serif,
            fontStyle: "italic",
            fontSize: 14,
            color: t.faint,
            marginTop: 4,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

function formatToday(): string {
  const d = new Date();
  return d
    .toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

export function Dashboard(): JSX.Element {
  const { data, loading, error } = useAsync(loadDashboard);
  if (loading) return <Loading label="Opening the book…" />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return <ErrorNote message="No data" />;

  const reads = data.activity.filter((a) => a.action === "read").length;
  const writes = data.activity.filter((a) => a.action === "write").length;
  const agents = new Set(data.activity.map((a) => a.agent)).size;

  return (
    <div style={{ padding: "40px 48px 32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: t.faint,
              marginBottom: 6,
            }}
          >
            THE SHELF &nbsp;·&nbsp; {formatToday()}
          </div>
          <div
            style={{
              fontFamily: t.serif,
              fontSize: 42,
              letterSpacing: -0.8,
            }}
          >
            Good morning.
          </div>
        </div>
        <div
          style={{
            fontSize: 12,
            color: t.faint,
            textAlign: "right",
            lineHeight: 1.7,
          }}
        >
          {agents} agents read from you today
          <br />
          <span style={{ color: t.ink }}>
            {reads} reads · {writes} writes
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 24,
          borderTop: `1px solid ${t.ruleStrong}`,
          borderBottom: `1px solid ${t.rule}`,
          padding: "24px 0",
          marginBottom: 28,
        }}
      >
        <Stat
          n={data.counts.writing_style ?? 0}
          label="Styles"
          note={`${data.counts.writing_style ?? 0} on the shelf`}
        />
        <Stat
          n={data.counts.project ?? 0}
          label="Projects"
          note={`${data.inProgress.length} in flight`}
        />
        <Stat
          n={data.counts.preference ?? 0}
          label="Preferences"
          note="across every agent"
        />
        <Stat n={data.counts.idea ?? 0} label="Ideas" note="kept, unstarted" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 36,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: t.serif,
              fontSize: 22,
              marginBottom: 14,
              letterSpacing: -0.3,
            }}
          >
            On the desk
          </div>
          {data.inProgress.length === 0 && (
            <Empty label="nothing in flight — add a project to see it here." />
          )}
          {data.inProgress.map((p, i) => {
            const meta = p.metadata as ProjectMeta;
            const pct = meta.progress != null ? Math.round(meta.progress * 100) : null;
            return (
              <div
                key={p.id}
                style={{
                  padding: "14px 0",
                  borderTop: `1px solid ${t.rule}`,
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 80px 60px",
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    fontFamily: t.serif,
                    fontStyle: "italic",
                    color: t.faint,
                    fontSize: 14,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: t.serif,
                      fontSize: 20,
                      letterSpacing: -0.3,
                    }}
                  >
                    {p.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: t.faint,
                      marginTop: 2,
                    }}
                  >
                    {p.content.split("\n")[0]}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: t.serif,
                    fontStyle: "italic",
                    fontSize: 14,
                    color: t.faint,
                  }}
                >
                  {meta.updated ?? formatRelative(p.updated_at)}
                </span>
                <span
                  style={{
                    fontFamily: t.serif,
                    fontSize: 18,
                    color: t.accent,
                    textAlign: "right",
                  }}
                >
                  {pct != null ? `${pct}%` : "—"}
                </span>
              </div>
            );
          })}
        </div>
        <div>
          <div
            style={{
              fontFamily: t.serif,
              fontSize: 22,
              marginBottom: 14,
              letterSpacing: -0.3,
            }}
          >
            Lately, from the agents
          </div>
          {data.activity.length === 0 && (
            <Empty label="no reads yet. agents will show up here." />
          )}
          {data.activity.map((a, i) => (
            <div
              key={i}
              style={{
                padding: "10px 0",
                borderTop: `1px solid ${t.rule}`,
                display: "flex",
                gap: 10,
                fontSize: 13,
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontFamily: t.serif,
                  fontStyle: "italic",
                  color: t.faint,
                  width: 46,
                }}
              >
                {a.t}
              </span>
              <span style={{ color: t.accent }}>{a.agent}</span>
              <span style={{ color: t.faint }}>
                {a.action === "write" ? "wrote to" : "read"}
              </span>
              <span style={{ flex: 1, fontFamily: t.mono, fontSize: 12 }}>{a.key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
