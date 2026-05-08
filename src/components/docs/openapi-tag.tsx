/**
 * Render every operation under a given OpenAPI tag, in source order.
 */

import { loadOpenApiSpec } from "@/lib/openapi";
import { OpenApiEndpoint } from "./openapi-endpoint";

export function OpenApiTag({ tag }: { tag: string }) {
  const spec = loadOpenApiSpec();
  const ops = spec.operationsByTag[tag] ?? [];
  if (ops.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: "16px 0" }}>
        No operations tagged &quot;{tag}&quot; in the spec.
      </p>
    );
  }
  return (
    <>
      {ops.map((op) => (
        <OpenApiEndpoint
          key={`${op.method}-${op.pathPattern}`}
          path={op.pathPattern}
          method={op.method}
        />
      ))}
    </>
  );
}
