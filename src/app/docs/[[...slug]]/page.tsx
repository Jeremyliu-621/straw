import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { readDocPage, extractHeadings } from "@/lib/docs";
import { mdxComponents } from "@/components/docs/mdx-components";
import { DocsToc } from "@/components/docs/docs-toc";

/**
 * Catch-all docs page. Reads the MDX content from disk for the requested
 * slug, renders it with MDXRemote, and surfaces a right-rail ToC.
 *
 * `[[...slug]]` (note double brackets) makes the slug optional — `/docs`
 * and `/docs/some/path` both route here, with `slug` being `[]` or
 * `["some", "path"]` respectively.
 */

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function DocsPage({ params }: PageProps) {
  const { slug } = await params;
  const slugSegments = slug ?? [];
  const page = readDocPage(slugSegments);
  if (!page) notFound();

  const headings = extractHeadings(page.content);

  return (
    <div
      style={{
        display: "flex",
        gap: "40px",
        width: "100%",
        maxWidth: "1000px",
      }}
    >
      <article
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: "720px",
        }}
      >
        <header style={{ marginBottom: "32px" }}>
          <h1
            className="font-sans"
            style={{
              fontSize: "32px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              marginTop: "0",
              marginBottom: "8px",
            }}
          >
            {page.frontmatter.title}
          </h1>
          {page.frontmatter.description && (
            <p
              className="font-sans"
              style={{
                fontSize: "16px",
                lineHeight: 1.6,
                color: "var(--text-muted)",
              }}
            >
              {page.frontmatter.description}
            </p>
          )}
        </header>

        <MDXRemote
          source={page.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              rehypePlugins: [
                rehypeSlug,
                [rehypeAutolinkHeadings, { behavior: "wrap" }],
              ],
            },
          }}
        />

        <footer
          style={{
            marginTop: "64px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
          className="font-sans"
        >
          <a
            href={`https://github.com/Jeremyliu-621/straw/edit/master/content/docs/${page.filePath}`}
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Edit this page on GitHub →
          </a>
          <span>{page.filePath}</span>
        </footer>
      </article>

      <DocsToc headings={headings} />
    </div>
  );
}
