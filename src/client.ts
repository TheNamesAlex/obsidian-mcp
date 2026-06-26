import type {
    NoteJson,
    SimpleSearchResult,
    StatusResponse,
    VaultListResponse,
} from "./models/common.js";
import { normalizeVaultPath } from "./utils/notes.js";

const { OBSIDIAN_API_KEY, OBSIDIAN_BASE_URL } = process.env;

if (!OBSIDIAN_API_KEY) {
  throw new Error("Missing required environment variable: OBSIDIAN_API_KEY");
}

const BASE_URL = (OBSIDIAN_BASE_URL ?? "http://127.0.0.1:27123").replace(/\/+$/, "");

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  headers?: Record<string, string>;
  body?: string;
  params?: Record<string, string | number | boolean | undefined>;
  responseType?: "json" | "text";
}

function buildPath(path: string): string {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

function encodeVaultPath(path: string): string {
  const normalized = normalizeVaultPath(path);
  if (!normalized) return "";
  return normalized
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${buildPath(path)}`);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${OBSIDIAN_API_KEY}`,
    ...(options.headers ?? {}),
  };

  const response = await fetch(url, {
    method,
    headers,
    body: options.body,
  });

  if (!response.ok) {
    const raw = await response.text();
    let errorText = raw;

    try {
      const parsed = JSON.parse(raw) as { message?: string; errorCode?: number };
      if (parsed.message) {
        errorText = `${parsed.message}${parsed.errorCode ? ` (code: ${parsed.errorCode})` : ""}`;
      }
    } catch {
      // If response is not JSON, preserve the original body text.
    }

    throw new Error(`Obsidian API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (options.responseType === "text") {
    return (await response.text()) as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") || contentType.includes("+json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function getStatus(): Promise<StatusResponse> {
  return request<StatusResponse>("GET", "/");
}

export async function listDirectory(path = ""): Promise<string[]> {
  const encoded = encodeVaultPath(path);
  const endpoint = encoded ? `/vault/${encoded}` : "/vault/";
  const data = await request<VaultListResponse>("GET", endpoint);
  return data.files;
}

export async function getNote(notePath: string, format: "markdown" | "json" = "markdown"): Promise<string | NoteJson> {
  const encoded = encodeVaultPath(notePath);
  if (!encoded) throw new Error("notePath cannot be empty");

  const headers =
    format === "json"
      ? { Accept: "application/vnd.olrapi.note+json" }
      : { Accept: "text/markdown" };

  return request<string | NoteJson>("GET", `/vault/${encoded}`, {
    headers,
    responseType: format === "markdown" ? "text" : "json",
  });
}

export async function upsertNote(notePath: string, content: string): Promise<void> {
  const encoded = encodeVaultPath(notePath);
  if (!encoded) throw new Error("notePath cannot be empty");

  await request<void>("PUT", `/vault/${encoded}`, {
    headers: { "Content-Type": "text/markdown" },
    body: content,
  });
}

export async function appendToNote(notePath: string, content: string): Promise<void> {
  const encoded = encodeVaultPath(notePath);
  if (!encoded) throw new Error("notePath cannot be empty");

  await request<void>("POST", `/vault/${encoded}`, {
    headers: { "Content-Type": "text/markdown" },
    body: content,
  });
}

export async function deleteNote(notePath: string): Promise<void> {
  const encoded = encodeVaultPath(notePath);
  if (!encoded) throw new Error("notePath cannot be empty");

  await request<void>("DELETE", `/vault/${encoded}`);
}

export async function patchNote(args: {
  notePath: string;
  operation: "append" | "prepend" | "replace";
  targetType: "heading" | "block" | "frontmatter";
  target: string;
  content: string;
  contentType?: "text/markdown" | "application/json";
}): Promise<void> {
  const encoded = encodeVaultPath(args.notePath);
  if (!encoded) throw new Error("notePath cannot be empty");

  await request<void>("PATCH", `/vault/${encoded}`, {
    headers: {
      Operation: args.operation,
      "Target-Type": args.targetType,
      Target: args.target,
      "Content-Type": args.contentType ?? "text/markdown",
    },
    body: args.content,
  });
}

export async function simpleSearch(query: string, contextLength = 100): Promise<SimpleSearchResult[]> {
  return request<SimpleSearchResult[]>("POST", "/search/simple/", {
    params: { query, contextLength },
  });
}
