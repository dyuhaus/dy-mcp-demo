import { useEffect, useState } from "react";
import { tokens as t } from "../lib/tokens";
import { deleteContext, listContexts, updateContext } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Loading, ErrorNote, Empty } from "../components/Loading";
import type { Context, WritingStyleMeta } from "../lib/types";

export function Styles(): JSX.Element {
  const { data, loading, error, refresh } = useAsync(() =>
    listContexts({ type: "writing_style", limit: 200 }),
  );
  const [selId, setSelId] = useState<number | null>(null);

  useEffect(() => {
    if (data?.items.length && selId == null) setSelId(data.items[0].id);
  }, [data, selId]);

  if (loading) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Empty label="no styles yet." />;
  const list = data.items;

  const sel = list.find((x) => x.id === selId) ?? list[0] ?? null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        height: "100%",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          borderRight: `1px solid ${t.rule}`,
          padding: "32px 22px",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: t.serif,
              fontSize: 22,
              letterSpacing: -0.3,
            }}
          >
            Styles
          </div>
        </div>
        {list.length === 0 && (
          <Empty label="no writing styles yet. add one from New entry." />
        )}
        {list.map((x) => {
          const meta = x.metadata as WritingStyleMeta;
          const on = x.id === sel?.id;
          return (
            <div
              key={x.id}
              onClick={() => setSelId(x.id)}
              style={{
                padding: "10px 0",
                borderTop: `1px solid ${t.rule}`,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontFamily: t.serif,
                  fontSize: 18,
                  letterSpacing: -0.3,
                  color: on ? t.accent : t.ink,
                }}
              >
                {x.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: t.faint,
                  marginTop: 2,
                }}
              >
                {meta.used != null && <>used {meta.used}× &nbsp;·&nbsp; </>}
                {x.tags.join(", ") || "untagged"}
              </div>
            </div>
          );
        })}
      </div>
      {sel ? (
        <StyleDetail
          key={sel.id}
          ctx={sel}
          onSaved={refresh}
          onDeleted={() => {
            setSelId(null);
            refresh();
          }}
        />
      ) : (
        <Empty label="pick a style to view" />
      )}
    </div>
  );
}

interface StyleDetailProps {
  ctx: Context;
  onSaved: () => void;
  onDeleted: () => void;
}

function StyleDetail({ ctx, onSaved, onDeleted }: StyleDetailProps): JSX.Element {
  const meta = ctx.metadata as WritingStyleMeta;
  const [description, setDescription] = useState<string>(ctx.content);
  const [example, setExample] = useState<string>(meta.example ?? "");
  const [tags, setTags] = useState<string>(ctx.tags.join(", "));
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await updateContext(ctx.id, {
        content: description,
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        metadata: { ...meta, example },
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${ctx.title}"?`)) return;
    setBusy(true);
    try {
      await deleteContext(ctx.id);
      onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "40px 60px", overflow: "auto", maxWidth: 680 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 2,
          color: t.faint,
          marginBottom: 8,
        }}
      >
        STYLE · #{ctx.id}
      </div>
      <div
        style={{
          fontFamily: t.serif,
          fontSize: 48,
          letterSpacing: -1,
          marginBottom: 28,
        }}
      >
        {ctx.title}
      </div>

      <label
        style={{
          fontSize: 11,
          letterSpacing: 2,
          color: t.faint,
        }}
      >
        DESCRIPTION
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        style={{
          display: "block",
          width: "100%",
          fontFamily: t.serif,
          fontSize: 22,
          lineHeight: 1.45,
          marginTop: 8,
          marginBottom: 28,
          paddingBottom: 12,
          border: "none",
          borderBottom: `1px solid ${t.rule}`,
          outline: "none",
          background: "transparent",
          resize: "vertical",
          color: t.ink,
        }}
      />

      <label
        style={{
          fontSize: 11,
          letterSpacing: 2,
          color: t.faint,
        }}
      >
        SAMPLE
      </label>
      <div
        style={{
          background: t.paper,
          border: `1px solid ${t.rule}`,
          padding: "18px 22px",
          marginTop: 8,
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 4,
            left: 10,
            fontSize: 44,
            color: t.accentSoft,
            fontFamily: t.serif,
          }}
        >
          &ldquo;
        </span>
        <textarea
          value={example}
          onChange={(e) => setExample(e.target.value)}
          rows={2}
          placeholder="one sentence that sounds like this voice"
          style={{
            marginLeft: 22,
            display: "block",
            width: "calc(100% - 22px)",
            fontFamily: t.serif,
            fontStyle: "italic",
            fontSize: 19,
            lineHeight: 1.5,
            color: t.ink,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "vertical",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 28,
          fontSize: 12,
          color: t.faint,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <div style={{ letterSpacing: 2, marginBottom: 4 }}>TAGS</div>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="comma, separated"
            style={{
              width: "100%",
              fontFamily: t.serif,
              fontSize: 16,
              color: t.ink,
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${t.rule}`,
              outline: "none",
              padding: "4px 0",
            }}
          />
        </div>
        <div>
          <div style={{ letterSpacing: 2, marginBottom: 4 }}>USES</div>
          <div
            style={{
              color: t.ink,
              fontFamily: t.serif,
              fontSize: 16,
            }}
          >
            {meta.used ?? 0}
          </div>
        </div>
        <div>
          <div style={{ letterSpacing: 2, marginBottom: 4 }}>UPDATED</div>
          <div
            style={{
              color: t.ink,
              fontFamily: t.serif,
              fontSize: 16,
            }}
          >
            {new Date(ctx.updated_at).toLocaleString()}
          </div>
        </div>
      </div>

      {err && (
        <div
          style={{
            marginTop: 14,
            fontFamily: t.mono,
            fontSize: 12,
            color: t.accent,
          }}
        >
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
        <button
          onClick={save}
          disabled={busy}
          style={{
            background: t.ink,
            color: t.paper,
            border: "none",
            padding: "10px 18px",
            fontSize: 12,
            letterSpacing: 1,
            cursor: busy ? "wait" : "pointer",
            fontFamily: t.sans,
          }}
        >
          SAVE CHANGES
        </button>
        <button
          onClick={remove}
          disabled={busy}
          style={{
            background: "transparent",
            color: t.accent,
            border: `1px solid ${t.accent}`,
            padding: "10px 18px",
            fontSize: 12,
            letterSpacing: 1,
            cursor: busy ? "wait" : "pointer",
            fontFamily: t.sans,
          }}
        >
          DELETE
        </button>
      </div>
    </div>
  );
}
