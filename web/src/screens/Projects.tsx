import type { ReactNode } from "react";
import { tokens as t } from "../lib/tokens";
import { listContexts } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Loading, ErrorNote, Empty } from "../components/Loading";
import type { Context, ProjectMeta } from "../lib/types";

interface ProjectsData {
  inProgress: Context[];
  done: Context[];
  ideas: Context[];
}

async function loadProjects(): Promise<ProjectsData> {
  const [projects, ideas] = await Promise.all([
    listContexts({ type: "project", limit: 200 }),
    listContexts({ type: "idea", limit: 200 }),
  ]);
  const inProgress: Context[] = [];
  const done: Context[] = [];
  for (const p of projects.items) {
    const meta = p.metadata as ProjectMeta;
    if (meta.status === "done") done.push(p);
    else inProgress.push(p);
  }
  return { inProgress, done, ideas: ideas.items };
}

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div style={{ marginBottom: 30 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: t.serif,
            fontSize: 28,
            letterSpacing: -0.5,
          }}
        >
          {title}
        </div>
        <div
          style={{
            flex: 1,
            height: 1,
            background: t.rule,
            transform: "translateY(-5px)",
          }}
        />
        <div
          style={{
            fontFamily: t.serif,
            fontStyle: "italic",
            fontSize: 16,
            color: t.faint,
          }}
        >
          {kicker}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffDays = Math.floor((now - d.getTime()) / 86400000);
  if (diffDays < 1) return "today";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function Projects(): JSX.Element {
  const { data, loading, error } = useAsync(loadProjects);
  if (loading) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return <ErrorNote message="No data" />;
  const { inProgress, done, ideas } = data;

  return (
    <div style={{ padding: "36px 48px", overflow: "auto", height: "100%" }}>
      <Section title="In progress" kicker={`${inProgress.length} on the desk`}>
        {inProgress.length === 0 && <Empty label="nothing active." />}
        {inProgress.map((it, i) => {
          const meta = it.metadata as ProjectMeta;
          const pct = meta.progress != null ? Math.round(meta.progress * 100) : null;
          return (
            <div
              key={it.id}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 140px 80px",
                padding: "14px 0",
                borderTop: `1px solid ${t.rule}`,
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontFamily: t.serif,
                  fontStyle: "italic",
                  color: t.faint,
                }}
              >
                {i + 1}.
              </span>
              <div>
                <div
                  style={{
                    fontFamily: t.serif,
                    fontSize: 22,
                    letterSpacing: -0.3,
                  }}
                >
                  {it.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: t.faint,
                    marginTop: 2,
                  }}
                >
                  {it.content.split("\n")[0]}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    background: t.accentSoft,
                    borderRadius: 2,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct ?? 0}%`,
                      background: t.accent,
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: t.serif,
                    fontSize: 15,
                    color: t.accent,
                  }}
                >
                  {pct != null ? `${pct}%` : "—"}
                </span>
              </div>
              <span
                style={{
                  fontFamily: t.serif,
                  fontStyle: "italic",
                  fontSize: 14,
                  color: t.faint,
                  textAlign: "right",
                }}
              >
                {relativeDate(it.updated_at)}
              </span>
            </div>
          );
        })}
      </Section>

      <Section title="Ideas" kicker={`${ideas.length} kept, unstarted`}>
        {ideas.length === 0 && <Empty label="no ideas yet." />}
        <div style={{ columnCount: 2, columnGap: "4%" }}>
          {ideas.map((it) => (
            <div
              key={it.id}
              style={{
                breakInside: "avoid",
                padding: "12px 0",
                borderTop: `1px solid ${t.rule}`,
              }}
            >
              <div
                style={{
                  fontFamily: t.serif,
                  fontSize: 18,
                  letterSpacing: -0.2,
                }}
              >
                {it.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: t.faint,
                  marginTop: 2,
                  lineHeight: 1.5,
                }}
              >
                {it.content.split("\n")[0]}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Done" kicker={`${done.length} closed`}>
        {done.length === 0 && <Empty label="nothing closed yet." />}
        {done.map((it) => (
          <div
            key={it.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px",
              padding: "10px 0",
              borderTop: `1px solid ${t.rule}`,
              alignItems: "baseline",
            }}
          >
            <div>
              <span
                style={{
                  fontFamily: t.serif,
                  fontSize: 18,
                  letterSpacing: -0.2,
                  textDecoration: "line-through",
                  textDecorationColor: t.ruleStrong,
                  textDecorationThickness: 1,
                }}
              >
                {it.title}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: t.faint,
                  marginLeft: 10,
                }}
              >
                {it.content.split("\n")[0]}
              </span>
            </div>
            <span
              style={{
                fontFamily: t.serif,
                fontStyle: "italic",
                fontSize: 14,
                color: t.faint,
                textAlign: "right",
              }}
            >
              {relativeDate(it.updated_at)}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}
