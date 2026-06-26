export interface StructuredNoteInput {
  title: string;
  summary: string;
  tags: string[];
  content: string;
  relatedNotes: string[];
  createdAtIso: string;
  updatedAtIso: string;
}

export function ensureMarkdownExtension(path: string): string {
  return path.toLowerCase().endsWith(".md") ? path : `${path}.md`;
}

export function normalizeVaultPath(path: string): string {
  return path.replace(/^\/+/, "").replace(/\\/g, "/");
}

export function joinVaultPath(baseDir: string, entry: string): string {
  const base = normalizeVaultPath(baseDir).replace(/\/+$/, "");
  const child = normalizeVaultPath(entry);
  if (!base) return child;
  if (!child) return `${base}/`;
  return `${base}/${child}`;
}

export function basenameWithoutMarkdown(path: string): string {
  const normalized = normalizeVaultPath(path);
  const parts = normalized.split("/");
  const name = parts[parts.length - 1] ?? normalized;
  return name.replace(/\.md$/i, "");
}

export function toWikiLinkTarget(path: string): string {
  return normalizeVaultPath(path).replace(/\.md$/i, "");
}

export function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "untitled-note";
}

export function renderStructuredNote(input: StructuredNoteInput): string {
  const renderedTags = input.tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");

  const related = input.relatedNotes
    .map((note) => note.trim())
    .filter(Boolean)
    .map((note) => `- [[${toWikiLinkTarget(note)}]]`)
    .join("\n");

  const lines = [
    `# ${input.title}`,
    "",
    `**Summary**: ${input.summary}`,
    `**Tags**: ${renderedTags || ""}`,
    `**Created**: ${input.createdAtIso}`,
    `**Last Updated**: ${input.updatedAtIso}`,
    "",
    "---",
    "",
    "## Content",
    "",
    input.content || "",
    "",
    "## Related Notes",
    related || "",
    "",
  ];

  return lines.join("\n");
}
