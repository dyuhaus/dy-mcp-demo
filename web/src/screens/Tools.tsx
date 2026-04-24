import { tokens as t } from "../lib/tokens";
import { getTools } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Loading, ErrorNote, Empty } from "../components/Loading";
import type { ToolInfo, ResourceInfo } from "../lib/types";

export function Tools(): JSX.Element {
  const { data, loading, error } = useAsync(getTools);
  if (loading) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Empty label="no tools exposed." />;

  return (
    <div style={{ padding: "36px 48px", maxWidth: 880 }}>
      <div
        style={{
          fontFamily: t.serif,
          fontSize: 40,
          letterSpacing: -0.8,
          marginBottom: 4,
        }}
      >
        Tools on offer
      </div>
      <div
        style={{
          fontFamily: t.serif,
          fontStyle: "italic",
          color: t.faint,
          fontSize: 16,
          marginBottom: 32,
          maxWidth: 620,
        }}
      >
        every command an MCP-aware agent can call against this server. also available over
        HTTP at <code style={{ fontFamily: t.mono, fontSize: 13 }}>POST /mcp</code> with
        an OAuth or admin bearer token.
      </div>

      <div
        style={{
          fontSize: 11,
          letterSpacing: 2,
          color: t.accent,
          marginBottom: 14,
          borderTop: `1px solid ${t.ruleStrong}`,
          paddingTop: 18,
        }}
      >
        TOOLS · {data.tools.length}
      </div>
      {data.tools.map((tool, i) => (
        <ToolCard key={tool.name} tool={tool} index={i + 1} />
      ))}

      <div
        style={{
          fontSize: 11,
          letterSpacing: 2,
          color: t.accent,
          margin: "40px 0 14px",
          borderTop: `1px solid ${t.ruleStrong}`,
          paddingTop: 18,
        }}
      >
        RESOURCES · {data.resources.length}
      </div>
      {data.resources.map((resource) => (
        <ResourceRow key={resource.uri} resource={resource} />
      ))}
    </div>
  );
}

interface ToolCardProps {
  tool: ToolInfo;
  index: number;
}

function ToolCard({ tool, index }: ToolCardProps): JSX.Element {
  return (
    <div
      style={{
        padding: "22px 0",
        borderTop: `1px solid ${t.rule}`,
        display: "grid",
        gridTemplateColumns: "40px 1fr",
        gap: 16,
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
        {String(index).padStart(2, "0")}
      </span>
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontFamily: t.serif,
              fontSize: 24,
              letterSpacing: -0.3,
            }}
          >
            {tool.title}
          </div>
          <code
            style={{
              fontFamily: t.mono,
              fontSize: 12,
              color: t.accent,
              background: t.accentSoft,
              padding: "2px 8px",
            }}
          >
            {tool.name}
          </code>
        </div>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: t.ink,
            marginTop: 8,
            maxWidth: 620,
          }}
        >
          {tool.description}
        </div>
        {tool.parameters.length === 0 ? (
          <div
            style={{
              fontFamily: t.serif,
              fontStyle: "italic",
              color: t.faint,
              fontSize: 13,
              marginTop: 10,
            }}
          >
            no parameters.
          </div>
        ) : (
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "auto auto 1fr",
              gap: "4px 14px",
              margin: "14px 0 0",
              alignItems: "baseline",
            }}
          >
            {tool.parameters.map((p) => (
              <ParamRow key={p.name} param={p} />
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

interface ParamRowProps {
  param: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
  };
}

function ParamRow({ param }: ParamRowProps): JSX.Element {
  return (
    <>
      <dt
        style={{
          fontFamily: t.mono,
          fontSize: 12,
          color: t.ink,
          whiteSpace: "nowrap",
        }}
      >
        {param.name}
        {param.required && <span style={{ color: t.accent, marginLeft: 2 }}>*</span>}
      </dt>
      <dd
        style={{
          margin: 0,
          fontFamily: t.mono,
          fontSize: 11,
          color: t.faint,
          whiteSpace: "nowrap",
        }}
      >
        {param.type}
      </dd>
      <dd
        style={{
          margin: 0,
          fontSize: 13,
          color: t.faint,
          fontFamily: t.sans,
        }}
      >
        {param.description ?? ""}
      </dd>
    </>
  );
}

function ResourceRow({ resource }: { resource: ResourceInfo }): JSX.Element {
  return (
    <div
      style={{
        padding: "12px 0",
        borderTop: `1px solid ${t.rule}`,
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gap: 18,
        alignItems: "baseline",
      }}
    >
      <code
        style={{
          fontFamily: t.mono,
          fontSize: 12,
          color: t.accent,
        }}
      >
        {resource.uri}
      </code>
      <div
        style={{
          fontSize: 13,
          color: t.ink,
          lineHeight: 1.5,
        }}
      >
        {resource.description}
      </div>
    </div>
  );
}
