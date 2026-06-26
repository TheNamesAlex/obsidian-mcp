import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getNote, getStatus, simpleSearch } from "../client.js";

const READ_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerReadTools(server: McpServer): void {
  server.registerTool(
    "get_obsidian_status",
    {
      description: "Check Obsidian Local REST API status and authentication.",
      annotations: READ_ANNOTATIONS,
    },
    async () => {
      try {
        const status = await getStatus();
        const text = [
          `Service: ${status.service}`,
          `Authenticated: ${status.authenticated}`,
          status.versions?.self ? `Plugin version: ${status.versions.self}` : "",
          status.versions?.obsidian ? `Obsidian API version: ${status.versions.obsidian}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.registerTool(
    "get_note",
    {
      description: "Get a note from the vault as markdown or structured JSON.",
      inputSchema: {
        notePath: z.string().describe("Vault-relative note path (e.g. research/rag.md)"),
        format: z.enum(["markdown", "json"]).default("markdown").optional().describe("Response format"),
      },
      annotations: READ_ANNOTATIONS,
    },
    async ({ notePath, format = "markdown" }) => {
      try {
        const data = await getNote(notePath, format);
        const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.registerTool(
    "search_notes",
    {
      description: "Simple text search over your vault with per-match context windows.",
      inputSchema: {
        query: z.string().min(1).describe("Search query"),
        contextLength: z.number().int().min(1).max(500).default(120).optional().describe("Context chars around matches"),
      },
      annotations: READ_ANNOTATIONS,
    },
    async ({ query, contextLength = 120 }) => {
      try {
        const results = await simpleSearch(query, contextLength);

        if (results.length === 0) {
          return { content: [{ type: "text", text: "No matches found." }] };
        }

        const formatted = results.map((result) => {
          const matches = result.matches
            .map((match, index) => `  [${index + 1}] ${match.context.replace(/\n/g, " ")}`)
            .join("\n");
          return `${result.filename}${typeof result.score === "number" ? ` (score: ${result.score.toFixed(3)})` : ""}\n${matches}`;
        });

        return { content: [{ type: "text", text: formatted.join("\n\n") }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

}
