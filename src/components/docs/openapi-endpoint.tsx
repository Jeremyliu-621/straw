/**
 * Renders one OpenAPI operation as a card. Method badge + path + summary
 * up top; auth, parameters, request body, and responses each in their own
 * subsection.
 *
 * Server component — pulls the resolved spec from `loadOpenApiSpec()`
 * directly. No props needed beyond the path + method.
 */

import { loadOpenApiSpec, resolveRef, type OpenApiOperation } from "@/lib/openapi";

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  get: { bg: "#dceadd", text: "#2d6135" },
  post: { bg: "#d3dcf2", text: "#2c4287" },
  put: { bg: "#f2dccc", text: "#7a3a16" },
  delete: { bg: "#f5d0d0", text: "#8a2222" },
  patch: { bg: "#efe2bb", text: "#6a4a14" },
};

export function OpenApiEndpoint({
  path,
  method,
}: {
  path: string;
  method: OpenApiOperation["method"];
}) {
  const spec = loadOpenApiSpec();
  const ops = Object.values(spec.operationsByTag).flat();
  const op = ops.find((o) => o.pathPattern === path && o.method === method);
  if (!op) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "13px", margin: "20px 0" }}>
        Endpoint not found in spec: <code>{method.toUpperCase()} {path}</code>
      </div>
    );
  }
  return <EndpointCard op={op} spec={spec} />;
}

function EndpointCard({
  op,
  spec,
}: {
  op: OpenApiOperation;
  spec: ReturnType<typeof loadOpenApiSpec>;
}) {
  const color = METHOD_COLORS[op.method] ?? { bg: "var(--bg-subtle)", text: "var(--text)" };

  return (
    <section
      id={`${op.method}-${slugify(op.pathPattern)}`}
      style={{
        margin: "32px 0",
        padding: "20px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg)",
      }}
    >
      <header
        className="font-mono"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px",
          fontSize: "14px",
        }}
      >
        <span
          style={{
            background: color.bg,
            color: color.text,
            padding: "2px 8px",
            borderRadius: "4px",
            fontWeight: 600,
            fontSize: "11px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {op.method}
        </span>
        <code style={{ color: "var(--text)", wordBreak: "break-all" }}>{op.pathPattern}</code>
      </header>

      {op.summary && (
        <p
          className="font-sans"
          style={{ fontSize: "16px", fontWeight: 500, color: "var(--text)", margin: "0 0 8px 0" }}
        >
          {op.summary}
        </p>
      )}

      {op.description && (
        <p
          className="font-sans"
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "var(--text-muted)",
            margin: "0 0 16px 0",
            whiteSpace: "pre-wrap",
          }}
        >
          {op.description}
        </p>
      )}

      <AuthSection op={op} />

      {op.parameters && op.parameters.length > 0 && (
        <ParametersTable parameters={op.parameters} />
      )}

      {op.requestBody && (
        <RequestBodySection requestBody={op.requestBody} spec={spec} />
      )}

      <ResponsesSection responses={op.responses} spec={spec} />
    </section>
  );
}

function AuthSection({ op }: { op: OpenApiOperation }) {
  if (op.security !== undefined && op.security.length === 0) {
    return (
      <SubsectionLabel>Auth: <em style={{ color: "var(--text-muted)", fontWeight: 400 }}>none required (public)</em></SubsectionLabel>
    );
  }
  if (!op.security || op.security.length === 0) return null;
  const schemes = op.security.flatMap((req) => Object.keys(req));
  return (
    <SubsectionLabel>
      Auth: <code style={{ fontWeight: 400 }}>{schemes.join(" or ")}</code>
    </SubsectionLabel>
  );
}

function ParametersTable({ parameters }: { parameters: NonNullable<OpenApiOperation["parameters"]> }) {
  return (
    <div style={{ marginTop: "16px" }}>
      <SubsectionLabel>Parameters</SubsectionLabel>
      <table
        className="font-sans"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
          margin: "8px 0",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <Th>Name</Th>
            <Th>In</Th>
            <Th>Type</Th>
            <Th>Required</Th>
            <Th>Description</Th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((p) => (
            <tr key={`${p.in}-${p.name}`} style={{ borderBottom: "1px solid var(--border)" }}>
              <Td>
                <code>{p.name}</code>
              </Td>
              <Td><code>{p.in}</code></Td>
              <Td>
                <code>{schemaTypeLabel(p.schema)}</code>
              </Td>
              <Td>{p.required ? "yes" : "no"}</Td>
              <Td style={{ color: "var(--text-muted)" }}>{p.description ?? ""}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestBodySection({
  requestBody,
  spec,
}: {
  requestBody: NonNullable<OpenApiOperation["requestBody"]>;
  spec: ReturnType<typeof loadOpenApiSpec>;
}) {
  const json = requestBody.content?.["application/json"];
  if (!json) return null;
  return (
    <div style={{ marginTop: "16px" }}>
      <SubsectionLabel>
        Request body{requestBody.required ? "" : " (optional)"}
      </SubsectionLabel>
      <SchemaPreview schema={json.schema} spec={spec} />
    </div>
  );
}

function ResponsesSection({
  responses,
  spec,
}: {
  responses: OpenApiOperation["responses"];
  spec: ReturnType<typeof loadOpenApiSpec>;
}) {
  const entries = Object.entries(responses);
  if (entries.length === 0) return null;
  return (
    <div style={{ marginTop: "16px" }}>
      <SubsectionLabel>Responses</SubsectionLabel>
      <ul
        className="font-sans"
        style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "13px" }}
      >
        {entries.map(([status, resp]) => {
          const json = resp.content?.["application/json"];
          const eventStream = resp.content?.["text/event-stream"];
          return (
            <li
              key={status}
              style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                <code
                  style={{
                    background: "var(--bg-subtle)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontWeight: 500,
                  }}
                >
                  {status}
                </code>
                <span style={{ color: "var(--text)" }}>{resp.description ?? ""}</span>
              </div>
              {json?.schema !== undefined && <SchemaPreview schema={json.schema} spec={spec} />}
              {eventStream?.schema !== undefined && (
                <pre
                  style={{
                    background: "var(--bg-subtle)",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    margin: "8px 0 0 0",
                  }}
                >
                  text/event-stream — see endpoint description for the wire format.
                </pre>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SchemaPreview({
  schema,
  spec,
}: {
  schema: unknown;
  spec: ReturnType<typeof loadOpenApiSpec>;
}) {
  const resolved = resolveSchema(schema, spec);
  if (!resolved) return null;
  return (
    <pre
      className="font-mono"
      style={{
        background: "var(--bg-subtle)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "12px",
        fontSize: "12px",
        lineHeight: 1.5,
        color: "var(--text)",
        overflowX: "auto",
        margin: "8px 0",
      }}
    >
      {JSON.stringify(resolved, null, 2)}
    </pre>
  );
}

function resolveSchema(schema: unknown, spec: ReturnType<typeof loadOpenApiSpec>): unknown {
  if (typeof schema !== "object" || schema === null) return schema;
  const obj = schema as Record<string, unknown>;
  if (typeof obj.$ref === "string") {
    return resolveRef(spec, obj.$ref);
  }
  return schema;
}

function schemaTypeLabel(schema: unknown): string {
  if (typeof schema !== "object" || schema === null) return "—";
  const obj = schema as Record<string, unknown>;
  if (typeof obj.type === "string") {
    if (obj.type === "array" && obj.items) {
      const items = obj.items as Record<string, unknown>;
      const innerType = items.type as string | undefined;
      return innerType ? `${innerType}[]` : "array";
    }
    return obj.type;
  }
  if (typeof obj.$ref === "string") {
    return obj.$ref.replace("#/components/schemas/", "");
  }
  if (Array.isArray(obj.enum)) return "enum";
  return "object";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function SubsectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-sans"
      style={{
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        margin: "16px 0 4px 0",
      }}
    >
      {children}
    </p>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "8px 8px 8px 0",
        fontWeight: 500,
        color: "var(--text-muted)",
        fontSize: "11px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: "8px 8px 8px 0", verticalAlign: "top", ...style }}>{children}</td>
  );
}
