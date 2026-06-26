import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { appendToNote, deleteNote, getNote, patchNote, upsertNote } from "../client.js";
import {
    ensureMarkdownExtension,
    joinVaultPath,
    normalizeVaultPath,
    renderStructuredNote,
    slugifyTitle,
} from "../utils/notes.js";

const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function registerWriteTools(server: McpServer): void {
  server.registerTool(
    "create_structured_note",
    {
      description:
        "⚠️ WRITE OPERATION: Create a Karpathy-style structured markdown note with summary, tags, content, and related notes.",
      inputSchema: {
        title: z.string().min(1).describe("Note title"),
        summary: z.string().min(1).describe("One-line summary for retrieval quality"),
        directory: z.string().default("inbox").optional().describe("Target folder (default inbox)"),
        fileName: z
          .string()
          .optional()
          .describe("Optional file name (without extension). Defaults to title slug"),
        tags: z.array(z.string()).default([]).optional().describe("Tags (with or without leading #)"),
        content: z.string().default("").optional().describe("Main note content"),
        relatedNotes: z
          .array(z.string())
          .default([])
          .optional()
          .describe("Related note paths or wiki-link targets"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ title, summary, directory = "inbox", fileName, tags = [], content = "", relatedNotes = [] }) => {
      try {
        const ts = new Date().toISOString();
        const baseName = (fileName ?? slugifyTitle(title)).trim();
        const noteName = ensureMarkdownExtension(baseName);
        const notePath = joinVaultPath(normalizeVaultPath(directory), noteName);

        const markdown = renderStructuredNote({
          title,
          summary,
          tags,
          content,
          relatedNotes,
          createdAtIso: ts,
          updatedAtIso: ts,
        });

        await upsertNote(notePath, markdown);

        return {
          content: [{ type: "text", text: `Created note: ${notePath}` }],
        };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.registerTool(
    "upsert_note",
    {
      description:
        "⚠️ WRITE OPERATION: Create or replace a note with markdown content.",
      inputSchema: {
        notePath: z.string().describe("Vault-relative path"),
        content: z.string().describe("Full markdown content"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ notePath, content }) => {
      try {
        const finalPath = ensureMarkdownExtension(normalizeVaultPath(notePath));
        await upsertNote(finalPath, content);
        return { content: [{ type: "text", text: `Upserted note: ${finalPath}` }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.registerTool(
    "append_note",
    {
      description:
        "⚠️ WRITE OPERATION: Append markdown to an existing note.",
      inputSchema: {
        notePath: z.string().describe("Vault-relative note path"),
        content: z.string().min(1).describe("Markdown to append"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ notePath, content }) => {
      try {
        const finalPath = ensureMarkdownExtension(normalizeVaultPath(notePath));
        await appendToNote(finalPath, content);
        return { content: [{ type: "text", text: `Appended content to: ${finalPath}` }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.registerTool(
    "patch_note",
    {
      description:
        "⚠️ WRITE OPERATION: Patch a note relative to heading, block, or frontmatter target.",
      inputSchema: {
        notePath: z.string().describe("Vault-relative note path"),
        operation: z.enum(["append", "prepend", "replace"]).describe("Patch operation"),
        targetType: z.enum(["heading", "block", "frontmatter"]).describe("Patch target type"),
        target: z
          .string()
          .min(1)
          .describe("Target identifier. For headings, use full heading path like 'H1::H2'."),
        content: z.string().describe("Payload content"),
        contentType: z
          .enum(["text/markdown", "application/json"])
          .default("text/markdown")
          .optional()
          .describe("Payload content type"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ notePath, operation, targetType, target, content, contentType = "text/markdown" }) => {
      try {
        const finalPath = ensureMarkdownExtension(normalizeVaultPath(notePath));
        await patchNote({
          notePath: finalPath,
          operation,
          targetType,
          target,
          content,
          contentType,
        });
        return { content: [{ type: "text", text: `Patched note: ${finalPath}` }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.registerTool(
    "move_note",
    {
      description:
        "⚠️ WRITE OPERATION: Move a note by copying to destination and deleting source.",
      inputSchema: {
        sourcePath: z.string().describe("Current note path"),
        destinationPath: z.string().describe("Target note path"),
        overwrite: z.boolean().default(false).optional().describe("Overwrite destination if it exists"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ sourcePath, destinationPath, overwrite = false }) => {
      try {
        const source = ensureMarkdownExtension(normalizeVaultPath(sourcePath));
        const destination = ensureMarkdownExtension(normalizeVaultPath(destinationPath));

        const sourceContent = (await getNote(source, "markdown")) as string;

        if (!overwrite) {
          try {
            await getNote(destination, "markdown");
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Destination already exists: ${destination}. Set overwrite=true to replace it.`,
                },
              ],
            };
          } catch {
            // Destination doesn't exist and that's expected when overwrite is false.
          }
        }

        await upsertNote(destination, sourceContent);
        await deleteNote(source);

        return {
          content: [{ type: "text", text: `Moved note from ${source} to ${destination}` }],
        };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.registerTool(
    "delete_note",
    {
      description:
        "⚠️ WRITE OPERATION: Delete a note from the vault by path.",
      inputSchema: {
        notePath: z.string().describe("Vault-relative note path"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ notePath }) => {
      try {
        const finalPath = normalizeVaultPath(notePath);
        await deleteNote(finalPath);
        return { content: [{ type: "text", text: `Deleted note: ${finalPath}` }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
