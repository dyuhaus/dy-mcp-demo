import { useState } from "react";
import { tokens as t } from "../lib/tokens";
import { createContext } from "../lib/api";
import type { ContextType } from "../lib/types";

type Kind = "style" | "project" | "idea" | "pref";

const TABS: Array<[Kind, string]> = [
  ["style", "Writing style"],
  ["project", "Project"],
  ["idea", "Idea"],
  ["pref", "Preference"],
];

interface AddProps {
  onDone: () => void;
}

export function Add({ onDone }: AddProps): JSX.Element {
  const [kind, setKind] = useState<Kind>("style");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [example, setExample] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [cat, setCat] = useState<string>("work");
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const contextType: ContextType = (() => {
    switch (kind) {
      case "style":
        return "writing_style";
      case "project":
        return "project";
      case "idea":
        return "idea";
      case "pref":
        return "preference";
    }
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErr("Name is required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const metadata: Record<string, unknown> = {};
      if (kind === "style") {
        if (example.trim()) metadata.example = example.trim();
        metadata.used = 0;
      } else if (kind === "project") {
        metadata.status = "in_progress";
        metadata.progress = 0;
      } else if (kind === "pref") {
        metadata.cat = cat;
        if (value.trim()) metadata.value = value.trim();
      }
      await createContext({
        type: contextType,
        title: title.trim(),
        content:
          kind === "pref" ? value.trim() || description.trim() : description.trim(),
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        metadata,
      });
      onDone();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ padding: "44px 60px", maxWidth: 720 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 2,
          color: t.faint,
          marginBottom: 6,
        }}
      >
        NEW ENTRY
      </div>
      <div
        style={{
          fontFamily: t.serif,
          fontSize: 44,
          letterSpacing: -0.8,
          marginBottom: 28,
        }}
      >
        Add to the <span style={{ fontStyle: "italic", color: t.accent }}>shelf</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 28,
          borderBottom: `1px solid ${t.rule}`,
        }}
      >
        {TABS.map(([k, label]) => {
          const on = kind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              style={{
                background: "transparent",
                border: "none",
                padding: "10px 14px",
                cursor: "pointer",
                fontFamily: t.serif,
                fontSize: 18,
                color: on ? t.accent : t.ink,
                borderBottom: on ? `2px solid ${t.accent}` : "2px solid transparent",
                marginBottom: -1,
                fontStyle: on ? "italic" : "normal",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Field label="NAME">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          style={{
            display: "block",
            width: "100%",
            border: "none",
            borderBottom: `1px solid ${t.ruleStrong}`,
            background: "transparent",
            padding: "6px 0",
            fontFamily: t.serif,
            fontSize: 24,
            outline: "none",
            color: t.ink,
          }}
        />
      </Field>

      {kind === "pref" ? (
        <>
          <Field label="VALUE">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                border: "none",
                borderBottom: `1px solid ${t.ruleStrong}`,
                background: "transparent",
                padding: "6px 0",
                fontFamily: t.serif,
                fontSize: 19,
                outline: "none",
                color: t.ink,
              }}
            />
          </Field>
          <Field label="CATEGORY">
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              style={{
                display: "block",
                border: "none",
                borderBottom: `1px solid ${t.ruleStrong}`,
                background: "transparent",
                padding: "6px 0",
                fontFamily: t.serif,
                fontSize: 19,
                outline: "none",
                color: t.ink,
              }}
            >
              <option value="env">environment</option>
              <option value="voice">voice</option>
              <option value="work">work</option>
              <option value="misc">misc</option>
            </select>
          </Field>
        </>
      ) : (
        <Field label="DESCRIPTION">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              display: "block",
              width: "100%",
              border: "none",
              borderBottom: `1px solid ${t.ruleStrong}`,
              background: "transparent",
              padding: "6px 0",
              fontFamily: t.serif,
              fontSize: 19,
              outline: "none",
              resize: "vertical",
              lineHeight: 1.4,
              color: t.ink,
            }}
          />
        </Field>
      )}

      {kind === "style" && (
        <Field label="EXAMPLE  ·  one sentence is enough">
          <textarea
            value={example}
            onChange={(e) => setExample(e.target.value)}
            rows={2}
            style={{
              display: "block",
              width: "100%",
              border: "none",
              borderBottom: `1px solid ${t.ruleStrong}`,
              background: "transparent",
              padding: "6px 0",
              fontFamily: t.serif,
              fontStyle: "italic",
              fontSize: 19,
              outline: "none",
              resize: "vertical",
              lineHeight: 1.4,
              color: t.ink,
            }}
          />
        </Field>
      )}

      <Field label="TAGS">
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="comma, separated"
          style={{
            display: "block",
            width: "100%",
            border: "none",
            borderBottom: `1px solid ${t.ruleStrong}`,
            background: "transparent",
            padding: "6px 0",
            fontFamily: t.serif,
            fontSize: 19,
            outline: "none",
            color: t.ink,
          }}
        />
      </Field>

      {err && (
        <div
          style={{
            marginBottom: 18,
            fontFamily: t.mono,
            fontSize: 12,
            color: t.accent,
          }}
        >
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="submit"
          disabled={busy}
          style={{
            background: t.ink,
            color: t.paper,
            border: "none",
            padding: "12px 20px",
            fontSize: 12,
            letterSpacing: 1,
            cursor: busy ? "wait" : "pointer",
            fontFamily: t.sans,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "ADDING…" : "ADD TO SHELF  ↵"}
        </button>
        <button
          type="button"
          onClick={onDone}
          style={{
            background: "transparent",
            color: t.faint,
            border: "none",
            padding: "12px 20px",
            fontSize: 12,
            letterSpacing: 1,
            cursor: "pointer",
            fontFamily: t.sans,
          }}
        >
          CANCEL · ESC
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div style={{ marginBottom: 24 }}>
      <label
        style={{
          fontSize: 11,
          letterSpacing: 2,
          color: t.faint,
        }}
      >
        {label}
      </label>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}
