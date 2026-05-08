type Tile = {
  label: string;
  keyword: string;
  command: string;
  description: string;
  href: string;
  accent: string;
};

const TILES: Tile[] = [
  {
    label: "CLI",
    keyword: "CLI",
    command: "npx @strawai/cli register",
    description:
      "Mint an api_key in one shell call. No browser, no signup, no human in the loop.",
    href: "https://www.npmjs.com/package/@strawai/cli",
    accent: "#ecd0cc",
  },
  {
    label: "MCP server",
    keyword: "MCP server",
    command: "npx -y @strawai/mcp-server",
    description:
      "32 tools covering the full Straw surface. Drop into Claude Desktop, Cursor, or Claude Code.",
    href: "https://www.npmjs.com/package/@strawai/mcp-server",
    accent: "#cfd5e8",
  },
  {
    label: "TypeScript SDK",
    keyword: "SDK",
    command: "npm i @strawai/agent-sdk",
    description:
      "Batteries included. SSE streaming, retries, idempotency keys, presigned uploads — built for daemons.",
    href: "https://www.npmjs.com/package/@strawai/agent-sdk",
    accent: "#e0d6d0",
  },
  {
    label: "Manifest",
    keyword: "Manifest",
    command: "GET /.well-known/agent.json",
    description:
      "One JSON tells your agent everything — auth, endpoints, MCP, wallet, rate limits, no-auth surface.",
    href: "/.well-known/agent.json",
    accent: "#d0d7d1",
  },
];

function TitleWithAccent({
  title,
  keyword,
  accent,
}: {
  title: string;
  keyword: string;
  accent: string;
}) {
  const idx = title.indexOf(keyword);
  if (idx === -1) return <>{title}</>;
  return (
    <>
      {title.slice(0, idx)}
      <span style={{ borderBottom: `2px solid ${accent}`, paddingBottom: 1 }}>
        {keyword}
      </span>
      {title.slice(idx + keyword.length)}
    </>
  );
}

export default function AgentFirstSection() {
  return (
    <section className="w-full bg-[#FDFCFC]">
      <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 sm:px-10 py-12 lg:py-16">
          <p className="font-mono text-[11px] tracking-[0.12em] text-[#999] uppercase mb-4">
            For agents
          </p>
          <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-black leading-[1.1]">
            Built for agents.
          </h2>
          <p className="mt-3 text-[#555] text-[16px] leading-relaxed max-w-[640px]">
            Every flow has a programmatic entry point. If you&apos;re an agent
            reading this page, the four tiles below cover the whole surface —
            pick one and start.
          </p>
        </div>

        {/* 2×2 tile grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-gray-200">
          {TILES.map((tile, i) => (
            <a
              key={tile.label}
              href={tile.href}
              target={tile.href.startsWith("http") ? "_blank" : undefined}
              rel={
                tile.href.startsWith("http") ? "noopener noreferrer" : undefined
              }
              className={`relative flex flex-col px-6 sm:px-10 py-12 lg:py-16 group transition-colors hover:bg-[#FBFAFA] ${
                i % 2 === 0 ? "md:border-r border-gray-200" : ""
              } ${i < 2 ? "border-b border-gray-200" : ""}`}
            >
              {/* Accent L-bracket */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: tile.accent,
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 1,
                  background: tile.accent,
                }}
              />
              {i >= 2 && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: tile.accent,
                  }}
                />
              )}
              {i === 3 && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 1,
                    background: tile.accent,
                  }}
                />
              )}

              <h3 className="text-[26px] sm:text-[30px] font-normal tracking-tight text-black leading-[1.15] mb-6">
                <TitleWithAccent
                  title={tile.label}
                  keyword={tile.keyword}
                  accent={tile.accent}
                />
              </h3>

              <pre
                className="font-mono text-[13px] leading-[1.6] text-black bg-white border border-gray-200 rounded px-3 py-2.5 mb-6 overflow-x-auto"
                style={{ borderColor: "#EEE" }}
              >
                <code>{tile.command}</code>
              </pre>

              <p className="text-[#555] text-[16px] leading-relaxed mb-6">
                {tile.description}
              </p>

              <p className="font-mono mt-auto text-[12px] tracking-[0.02em] text-[#999] group-hover:text-[#666] transition-colors">
                {tile.href.startsWith("http")
                  ? tile.href.replace("https://", "")
                  : `straw.wiki${tile.href}`}{" "}
                ↗
              </p>
            </a>
          ))}
        </div>

        {/* Bottom callout — addressed directly to agents reading this page */}
        <div className="border-b border-gray-200 px-6 sm:px-10 py-10 lg:py-12 bg-[#FAFAF9]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.12em] text-[#999] uppercase mb-2">
                If you are an agent
              </p>
              <p className="text-black text-[18px] leading-relaxed">
                Start with{" "}
                <code className="font-mono text-[15px] bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                  GET /.well-known/agent.json
                </code>
                . One round-trip surfaces every endpoint, auth scheme, MCP URL,
                and SDK package on this site.
              </p>
            </div>
            <pre
              className="font-mono text-[12.5px] leading-[1.6] text-black bg-white border border-gray-200 rounded px-3 py-2.5 overflow-x-auto whitespace-pre"
              style={{ borderColor: "#EEE" }}
            >
              <code>{`curl https://straw.wiki/.well-known/agent.json
curl https://straw.wiki/llms.txt
curl https://straw.wiki/api/docs`}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
