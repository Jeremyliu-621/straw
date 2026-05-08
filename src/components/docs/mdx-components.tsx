/**
 * MDX renderer overrides — components used when MDX is rendered. Maps
 * markdown elements to brand-styled React components. Used by the
 * server-side MDX render in /docs/[[...slug]]/page.tsx.
 *
 * Stays light-weight: typographic defaults via inline style. The
 * `code` block uses shiki's pre-rendered HTML which we splice in via
 * dangerouslySetInnerHTML in the page component, NOT here. Here we just
 * add the surrounding chrome (copy button, callouts, etc.).
 */

import { CodeBlock } from "./code-block";
import { OpenApiEndpoint } from "./openapi-endpoint";
import { OpenApiTag } from "./openapi-tag";

type MdxComponents = Record<string, (props: Record<string, unknown>) => React.ReactNode>;

export const mdxComponents: MdxComponents = {
  // Custom components usable inside MDX.
  OpenApiEndpoint: OpenApiEndpoint as unknown as (props: Record<string, unknown>) => React.ReactNode,
  OpenApiTag: OpenApiTag as unknown as (props: Record<string, unknown>) => React.ReactNode,

  h1: (props) => (
    <h1
      className="font-sans"
      style={{
        fontSize: "32px",
        fontWeight: 500,
        letterSpacing: "-0.02em",
        color: "var(--text)",
        marginTop: "0",
        marginBottom: "12px",
        scrollMarginTop: "80px",
      }}
      {...(props as Record<string, unknown>)}
    />
  ),
  h2: (props) => (
    <h2
      className="font-sans"
      style={{
        fontSize: "22px",
        fontWeight: 500,
        letterSpacing: "-0.01em",
        color: "var(--text)",
        marginTop: "40px",
        marginBottom: "12px",
        scrollMarginTop: "80px",
      }}
      {...(props as Record<string, unknown>)}
    />
  ),
  h3: (props) => (
    <h3
      className="font-sans"
      style={{
        fontSize: "17px",
        fontWeight: 500,
        color: "var(--text)",
        marginTop: "28px",
        marginBottom: "10px",
        scrollMarginTop: "80px",
      }}
      {...(props as Record<string, unknown>)}
    />
  ),
  p: (props) => (
    <p
      className="font-sans"
      style={{
        fontSize: "15px",
        lineHeight: 1.7,
        color: "var(--text)",
        margin: "0 0 16px 0",
      }}
      {...(props as Record<string, unknown>)}
    />
  ),
  a: (props) => (
    <a
      className="font-sans"
      style={{
        color: "var(--text)",
        textDecoration: "underline",
        textDecorationColor: "var(--border)",
        textUnderlineOffset: "3px",
      }}
      {...(props as Record<string, unknown>)}
    />
  ),
  ul: (props) => (
    <ul
      className="font-sans"
      style={{
        fontSize: "15px",
        lineHeight: 1.7,
        color: "var(--text)",
        paddingLeft: "20px",
        margin: "0 0 16px 0",
      }}
      {...(props as Record<string, unknown>)}
    />
  ),
  ol: (props) => (
    <ol
      className="font-sans"
      style={{
        fontSize: "15px",
        lineHeight: 1.7,
        color: "var(--text)",
        paddingLeft: "20px",
        margin: "0 0 16px 0",
      }}
      {...(props as Record<string, unknown>)}
    />
  ),
  li: (props) => <li style={{ marginBottom: "4px" }} {...(props as Record<string, unknown>)} />,
  code: (props) => {
    // Inline code only — block code is wrapped in <pre> via the `pre`
    // override below.
    const { children } = props as { children?: React.ReactNode };
    return (
      <code
        style={{
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "1px 6px",
          fontSize: "13px",
          fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
        }}
      >
        {children}
      </code>
    );
  },
  pre: (props) => {
    // Block code: extract the raw text from the children for the copy
    // button. The MDX child of `pre` is a `code` element; its `children`
    // is the raw text.
    const { children } = props as {
      children?: { props?: { children?: string } };
    };
    const raw =
      typeof children?.props?.children === "string"
        ? children.props.children
        : "";
    return <CodeBlock raw={raw}>{children as React.ReactNode}</CodeBlock>;
  },
  blockquote: (props) => (
    <blockquote
      className="font-sans"
      style={{
        borderLeft: "3px solid var(--border)",
        paddingLeft: "16px",
        margin: "20px 0",
        color: "var(--text-muted)",
        fontSize: "15px",
        lineHeight: 1.7,
      }}
      {...(props as Record<string, unknown>)}
    />
  ),
  hr: () => (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--border)",
        margin: "32px 0",
      }}
    />
  ),
  table: (props) => (
    <div style={{ overflowX: "auto", margin: "20px 0" }}>
      <table
        className="font-sans"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
          color: "var(--text)",
        }}
        {...(props as Record<string, unknown>)}
      />
    </div>
  ),
  th: (props) => (
    <th
      style={{
        padding: "8px 12px",
        textAlign: "left",
        fontWeight: 500,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-subtle)",
      }}
      {...(props as Record<string, unknown>)}
    />
  ),
  td: (props) => (
    <td
      style={{
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
      }}
      {...(props as Record<string, unknown>)}
    />
  ),
};
