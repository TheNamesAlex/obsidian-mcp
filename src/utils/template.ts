function normalizeTag(tag: string): string {
  const raw = tag.trim();
  if (!raw) return "";
  return raw.startsWith("#") ? raw : `#${raw}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function ensureMarkdownPath(notePath: string): string {
  const trimmed = notePath.trim().replace(/^\/+/, "");
  if (!trimmed.endsWith(".md")) return `${trimmed}.md`;
  return trimmed;
}

export function buildStructuredNote(params: {
  title: string;
  summary?: string;
  tags?: string[];
  content?: string;
  relatedNotes?: string[];
  aliases?: string[];
}): string {
  const created = nowIso();
  const updated = created;
  const cleanTags = (params.tags ?? []).map(normalizeTag).filter(Boolean);
  const aliases = (params.aliases ?? []).map((a) => a.trim()).filter(Boolean);
  const related = (params.relatedNotes ?? []).map((n) => n.trim()).filter(Boolean);

  const yaml: string[] = ["---"];
  yaml.push(`title: \"${params.title.replace(/\"/g, "\\\"")}\"`);
  if (aliases.length > 0) {
    yaml.push("aliases:");
    for (const alias of aliases) yaml.push(`  - \"${alias.replace(/\"/g, "\\\"")}\"`);
  }
  if (cleanTags.length > 0) {
    yaml.push("tags:");
    for (const tag of cleanTags) yaml.push(`  - ${tag.replace(/^#/, "")}`);
  }
  yaml.push(`created: ${created}`);
  yaml.push(`last_updated: ${updated}`);
  yaml.push("---");

  const lines: string[] = [];
  lines.push(`# ${params.title}`);
  if (params.summary && params.summary.trim()) {
    lines.push("");
    lines.push(`**Summary**: ${params.summary.trim()}`);
  }
  if (cleanTags.length > 0) {
    lines.push(`**Tags**: ${cleanTags.join(" ")}`);
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Content");
  lines.push("");
  lines.push(params.content?.trim() ? params.content.trim() : "Write the main content here.");
  lines.push("");
  lines.push("## Related Notes");
  lines.push("");

  if (related.length === 0) {
    lines.push("- [[Note Title]]");
  } else {
    for (const rel of related) {
      const clean = rel.replace(/\.md$/i, "");
      lines.push(`- [[${clean}]]`);
    }
  }

  return `${yaml.join("\n")}\n\n${lines.join("\n")}\n`;
}

export function noteLinkFromPath(notePath: string): string {
  const clean = notePath.trim().replace(/^\/+/, "").replace(/\.md$/i, "");
  return `[[${clean}]]`;
}
