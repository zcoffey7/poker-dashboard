import {
  GAMES_JSON_PATH,
  OVERALL_CSV_PATH,
  modeCsvPath,
  type GameMode,
  type StandingsFiles,
} from "./types";

export type RepoConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  /** Overridable so tests can point at a stub GitHub. */
  apiBaseUrl?: string;
};

export const DEFAULT_API_BASE_URL = "https://api.github.com";

export class GitHubError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

function describe(status: number, path: string, body: string): string {
  if (status === 401) {
    return "GitHub rejected the token (401). Generate a new fine-grained token with Contents: Read and write.";
  }
  if (status === 403) {
    return "GitHub refused the request (403). The token is missing Contents: Read and write on this repository.";
  }
  if (status === 404) {
    return `GitHub returned 404 for ${path}. Check the owner, repo and branch — a fine-grained token also 404s when the repository isn't in its scope.`;
  }
  if (status === 409 || status === 422) {
    return "The branch moved while publishing. Try again to rebuild the update on the newest commit.";
  }
  const detail = body.slice(0, 200).trim();
  return `GitHub request to ${path} failed (${status})${detail ? `: ${detail}` : ""}`;
}

async function request<T>(
  config: RepoConfig,
  path: string,
  init: RequestInit & { raw?: boolean } = {},
): Promise<T> {
  const base = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const { raw, ...rest } = init;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers: {
      Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...rest.headers,
    },
  });
  if (!res.ok) {
    throw new GitHubError(res.status, describe(res.status, path, await res.text()));
  }
  return (raw ? await res.text() : await res.json()) as T;
}

function repoPath(config: RepoConfig, suffix: string): string {
  return `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(
    config.repo,
  )}${suffix}`;
}

/** SHA of the tip commit on the configured branch. */
export async function getHeadSha(config: RepoConfig): Promise<string> {
  const ref = await request<{ object: { sha: string } }>(
    config,
    repoPath(config, `/git/ref/heads/${encodeURIComponent(config.branch)}`),
  );
  return ref.object.sha;
}

async function getFile(
  config: RepoConfig,
  path: string,
  ref: string,
): Promise<string> {
  return request<string>(
    config,
    repoPath(config, `/contents/${path}?ref=${encodeURIComponent(ref)}`),
    { raw: true },
  );
}

export type StandingsSnapshot = {
  /** Commit the files were read at; used as the parent when publishing. */
  headSha: string;
  files: StandingsFiles;
};

/**
 * Read the three standings files at the current tip. Pinning every read to
 * one commit means the update is folded into a consistent snapshot.
 */
export async function fetchStandingsSnapshot(
  config: RepoConfig,
  mode: GameMode,
): Promise<StandingsSnapshot> {
  const headSha = await getHeadSha(config);
  const [overallCsv, modeCsv, gamesJson] = await Promise.all([
    getFile(config, OVERALL_CSV_PATH, headSha),
    getFile(config, modeCsvPath(mode), headSha),
    getFile(config, GAMES_JSON_PATH, headSha),
  ]);
  return { headSha, files: { overallCsv, modeCsv, gamesJson } };
}

export type CommitResult = {
  commitSha: string;
  /** Convenience link back to the commit on github.com. */
  htmlUrl: string;
};

/**
 * Commit all three files as a single revision via the Git Data API. The
 * Contents API would need one commit per file, which would leave the
 * standings briefly inconsistent and trigger three deploys.
 */
export async function commitStandingsFiles(
  config: RepoConfig,
  args: {
    mode: GameMode;
    parentSha: string;
    files: StandingsFiles;
    message: string;
  },
): Promise<CommitResult> {
  const entries = [
    { path: OVERALL_CSV_PATH, content: args.files.overallCsv },
    { path: modeCsvPath(args.mode), content: args.files.modeCsv },
    { path: GAMES_JSON_PATH, content: args.files.gamesJson },
  ];

  const parent = await request<{ tree: { sha: string } }>(
    config,
    repoPath(config, `/git/commits/${args.parentSha}`),
  );

  const blobs = await Promise.all(
    entries.map(async (entry) => {
      const blob = await request<{ sha: string }>(
        config,
        repoPath(config, "/git/blobs"),
        {
          method: "POST",
          body: JSON.stringify({ content: entry.content, encoding: "utf-8" }),
        },
      );
      return { path: entry.path, sha: blob.sha };
    }),
  );

  const tree = await request<{ sha: string }>(
    config,
    repoPath(config, "/git/trees"),
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: parent.tree.sha,
        tree: blobs.map((b) => ({
          path: b.path,
          mode: "100644",
          type: "blob",
          sha: b.sha,
        })),
      }),
    },
  );

  const commit = await request<{ sha: string; html_url?: string }>(
    config,
    repoPath(config, "/git/commits"),
    {
      method: "POST",
      body: JSON.stringify({
        message: args.message,
        tree: tree.sha,
        parents: [args.parentSha],
      }),
    },
  );

  await request(
    config,
    repoPath(config, `/git/refs/heads/${encodeURIComponent(config.branch)}`),
    { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) },
  );

  return {
    commitSha: commit.sha,
    htmlUrl:
      commit.html_url ??
      `https://github.com/${config.owner}/${config.repo}/commit/${commit.sha}`,
  };
}
