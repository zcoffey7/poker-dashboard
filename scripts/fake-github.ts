// A stand-in for the subset of the GitHub REST API that "Update Sheet" uses.
//
// It keeps a real (if simplified) git object model — blobs, trees, commits and
// a ref — so the integration test exercises the same request sequence the app
// issues against api.github.com: read ref, read files at that commit, create
// blobs, create a tree on top of the parent, commit, fast-forward the ref.
//
// Trees are stored flattened (full path -> blob sha) rather than nested. That
// is enough for the three files this feature touches and keeps the stub small.

import http from "node:http";
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";

type Tree = Map<string, string>;

export type FakeGitHubOptions = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  /** Initial working tree: path -> file contents. */
  files: Record<string, string>;
};

export type FakeGitHub = {
  baseUrl: string;
  close: () => Promise<void>;
  /** Every request the client made, in order. */
  requests: Array<{ method: string; path: string; auth: string | undefined }>;
  headSha: () => string;
  /** Files as they exist at the branch tip. */
  filesAtHead: () => Record<string, string>;
  commitLog: () => Array<{ sha: string; message: string; parents: string[] }>;
  /**
   * Simulate someone else pushing (a laptop, or a second phone) so the next
   * write finds the ref moved.
   */
  advanceBranch: (changes: Record<string, string>, message: string) => void;
  /** Force the next ref update to fail with 409, as GitHub does on a race. */
  failNextRefUpdate: () => void;
  /**
   * Land a competing push in the window between the client's read and its
   * write, which is the real-world race: the client's commit is no longer a
   * fast-forward and GitHub rejects it.
   */
  advanceOnNextRefUpdate: (
    changes: Record<string, string>,
    message: string,
  ) => void;
};

function sha1(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}

export async function startFakeGitHub(
  opts: FakeGitHubOptions,
): Promise<FakeGitHub> {
  const blobs = new Map<string, string>();
  const trees = new Map<string, Tree>();
  const commits = new Map<
    string,
    { tree: string; parents: string[]; message: string }
  >();
  let ref = "";
  let refUpdateShouldFail = false;
  let pendingRace: { changes: Record<string, string>; message: string } | null =
    null;
  const requests: FakeGitHub["requests"] = [];
  const log: Array<{ sha: string; message: string; parents: string[] }> = [];

  function writeTree(entries: Tree): string {
    const sha = sha1(
      [...entries.entries()].sort().map(([p, s]) => `${p}\0${s}`).join("\n"),
    );
    trees.set(sha, new Map(entries));
    return sha;
  }

  function commit(tree: string, parents: string[], message: string): string {
    const sha = sha1(`${tree}\0${parents.join(",")}\0${message}\0${log.length}`);
    commits.set(sha, { tree, parents, message });
    log.push({ sha, message, parents });
    return sha;
  }

  function seed(files: Record<string, string>): void {
    const entries: Tree = new Map();
    for (const [path, content] of Object.entries(files)) {
      const sha = sha1(content);
      blobs.set(sha, content);
      entries.set(path, sha);
    }
    ref = commit(writeTree(entries), [], "seed");
  }

  function applyToBranch(
    changes: Record<string, string>,
    message: string,
  ): void {
    const entries = new Map(treeAt(ref));
    for (const [path, content] of Object.entries(changes)) {
      const sha = sha1(content);
      blobs.set(sha, content);
      entries.set(path, sha);
    }
    ref = commit(writeTree(entries), [ref], message);
  }

  function treeAt(commitSha: string): Tree {
    const c = commits.get(commitSha);
    if (!c) throw new Error(`unknown commit ${commitSha}`);
    return trees.get(c.tree) ?? new Map();
  }

  seed(opts.files);

  const prefix = `/repos/${opts.owner}/${opts.repo}`;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const auth = req.headers.authorization;
    requests.push({ method: req.method ?? "GET", path: req.url ?? "/", auth });

    const send = (status: number, body: unknown, raw = false) => {
      const payload = raw ? String(body) : JSON.stringify(body);
      res.writeHead(status, {
        "content-type": raw
          ? "text/plain; charset=utf-8"
          : "application/json; charset=utf-8",
      });
      res.end(payload);
    };

    if (auth !== `Bearer ${opts.token}`) {
      send(401, { message: "Bad credentials" });
      return;
    }
    if (!url.pathname.startsWith(prefix)) {
      send(404, { message: "Not Found" });
      return;
    }

    const route = url.pathname.slice(prefix.length);
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        handle(route, url, req.method ?? "GET", body, send);
      } catch (err) {
        send(500, { message: (err as Error).message });
      }
    });
  });

  function handle(
    route: string,
    url: URL,
    method: string,
    body: string,
    send: (status: number, body: unknown, raw?: boolean) => void,
  ): void {
    const refRoute = `/git/ref/heads/${opts.branch}`;
    const refsRoute = `/git/refs/heads/${opts.branch}`;

    if (method === "GET" && route === refRoute) {
      send(200, { ref: `refs/heads/${opts.branch}`, object: { sha: ref } });
      return;
    }

    if (method === "GET" && route.startsWith("/contents/")) {
      const path = decodeURIComponent(route.slice("/contents/".length));
      const at = url.searchParams.get("ref") || ref;
      const blobSha = treeAt(at).get(path);
      if (!blobSha) {
        send(404, { message: "Not Found" });
        return;
      }
      send(200, blobs.get(blobSha) ?? "", true);
      return;
    }

    if (method === "GET" && route.startsWith("/git/commits/")) {
      const sha = route.slice("/git/commits/".length);
      const c = commits.get(sha);
      if (!c) {
        send(404, { message: "Not Found" });
        return;
      }
      send(200, { sha, tree: { sha: c.tree }, message: c.message });
      return;
    }

    if (method === "POST" && route === "/git/blobs") {
      const parsed = JSON.parse(body) as {
        content: string;
        encoding: string;
      };
      const content =
        parsed.encoding === "base64"
          ? Buffer.from(parsed.content, "base64").toString("utf8")
          : parsed.content;
      const sha = sha1(content);
      blobs.set(sha, content);
      send(201, { sha });
      return;
    }

    if (method === "POST" && route === "/git/trees") {
      const parsed = JSON.parse(body) as {
        base_tree?: string;
        tree: Array<{ path: string; sha: string; mode: string; type: string }>;
      };
      const base = parsed.base_tree
        ? new Map(trees.get(parsed.base_tree) ?? new Map())
        : new Map<string, string>();
      for (const entry of parsed.tree) base.set(entry.path, entry.sha);
      send(201, { sha: writeTree(base) });
      return;
    }

    if (method === "POST" && route === "/git/commits") {
      const parsed = JSON.parse(body) as {
        message: string;
        tree: string;
        parents: string[];
      };
      send(201, {
        sha: commit(parsed.tree, parsed.parents, parsed.message),
      });
      return;
    }

    if (method === "PATCH" && route === refsRoute) {
      if (refUpdateShouldFail) {
        refUpdateShouldFail = false;
        send(409, { message: "Update is not a fast forward" });
        return;
      }
      if (pendingRace) {
        const race = pendingRace;
        pendingRace = null;
        applyToBranch(race.changes, race.message);
      }
      const parsed = JSON.parse(body) as { sha: string };
      const target = commits.get(parsed.sha);
      if (!target) {
        send(422, { message: "Object does not exist" });
        return;
      }
      // Reject a commit whose parent isn't the current tip, exactly as a
      // non-force push would be rejected.
      if (!target.parents.includes(ref)) {
        send(409, { message: "Update is not a fast forward" });
        return;
      }
      ref = parsed.sha;
      send(200, { object: { sha: ref } });
      return;
    }

    send(404, { message: `Not Found: ${method} ${route}` });
  }

  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    requests,
    headSha: () => ref,
    filesAtHead: () => {
      const out: Record<string, string> = {};
      for (const [path, sha] of treeAt(ref)) out[path] = blobs.get(sha) ?? "";
      return out;
    },
    commitLog: () => [...log],
    advanceBranch: applyToBranch,
    failNextRefUpdate: () => {
      refUpdateShouldFail = true;
    },
    advanceOnNextRefUpdate: (changes, message) => {
      pendingRace = { changes, message };
    },
  };
}
