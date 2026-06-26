export interface ObsidianError {
  errorCode: number;
  message: string;
}

export interface NoteStat {
  ctime: number;
  mtime: number;
  size: number;
}

export interface NoteJson {
  tags: string[];
  frontmatter: Record<string, unknown>;
  stat: NoteStat;
  path: string;
  content: string;
}

export interface VaultListResponse {
  files: string[];
}

export interface StatusResponse {
  ok: string;
  service: string;
  authenticated: boolean;
  versions?: {
    obsidian?: string;
    self?: string;
  };
}

export interface SimpleSearchMatch {
  match: { start: number; end: number };
  context: string;
}

export interface SimpleSearchResult {
  filename: string;
  score?: number;
  matches: SimpleSearchMatch[];
}
