import { tokens as t } from "../lib/tokens";
import { listContexts } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Loading, ErrorNote, Empty } from "../components/Loading";
import type { Context, PreferenceMeta } from "../lib/types";

type CatKey = "env" | "voice" | "work" | "misc";

const CATS: Array<[CatKey, string]> = [
  ["env", "Environment"],
  ["voice", "Voice"],
  ["work", "Work"],
  ["misc", "Miscellany"],
];

function categoryOf(ctx: Context): CatKey {
  const meta = ctx.metadata as PreferenceMeta;
  if (meta.cat && (CATS as Array<[string, string]>).some(([k]) => k === meta.cat)) {
    return meta.cat;
  }
  const tagCat = ctx.tags.find((x) =>
    (["env", "voice", "work", "misc"] as CatKey[]).includes(x as CatKey),
  );
  if (tagCat) return tagCat as CatKey;
  return "misc";
}

function valueOf(ctx: Context): string {
  const meta = ctx.metadata as PreferenceMeta;
  if (meta.value != null) return String(meta.value);
  return ctx.content;
}

export function Prefs(): JSX.Element {
  const { data, loading, error } = useAsync(() =>
    listContexts({ type: "preference", limit: 500 }),
  );
  if (loading) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Empty label="no preferences yet." />;

  const byCat: Record<CatKey, Context[]> = {
    env: [],
    voice: [],
    work: [],
    misc: [],
  };
  for (const p of data.items) byCat[categoryOf(p)].push(p);

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
        Preferences
      </div>
      <div
        style={{
          fontFamily: t.serif,
          fontStyle: "italic",
          color: t.faint,
          fontSize: 16,
          marginBottom: 26,
        }}
      >
        the small constants that make a reply feel like you.
      </div>
      {data.items.length === 0 && (
        <Empty label="no preferences yet. add one from New entry." />
      )}
      <div style={{ columnCount: 2, columnGap: 40 }}>
        {CATS.map(([c, label]) => {
          const items = byCat[c];
          if (items.length === 0) return null;
          return (
            <div key={c} style={{ breakInside: "avoid", marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  color: t.accent,
                  marginBottom: 10,
                }}
              >
                {label.toUpperCase()}
              </div>
              {items.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderTop:
                      i === 0 ? `1px solid ${t.ruleStrong}` : `1px solid ${t.rule}`,
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: t.faint,
                    }}
                  >
                    {p.title}
                  </span>
                  <span
                    style={{
                      fontFamily: t.serif,
                      fontSize: 15,
                      color: t.ink,
                      textAlign: "right",
                      minWidth: 0,
                    }}
                  >
                    {valueOf(p)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
