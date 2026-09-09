"use client";

import { useState } from "react";
import {
  DEFAULT_BRANCH,
  DEFAULT_OWNER,
  DEFAULT_REPO,
  useSheet,
} from "@/lib/sheetStore";

const TOKEN_HELP_URL =
  "https://github.com/settings/personal-access-tokens/new";

type Props = {
  onConnected?: () => void;
  /** Hide owner/repo/branch behind a toggle when the defaults are fine. */
  compact?: boolean;
};

/**
 * Collects the fine-grained GitHub token used to commit standings updates.
 * The token is stored in this device's localStorage and only ever sent to
 * api.github.com.
 */
export default function SheetConnectForm({ onConnected, compact }: Props) {
  const owner = useSheet((s) => s.owner);
  const repo = useSheet((s) => s.repo);
  const branch = useSheet((s) => s.branch);
  const connect = useSheet((s) => s.connect);

  const [token, setToken] = useState("");
  const [ownerDraft, setOwnerDraft] = useState(owner || DEFAULT_OWNER);
  const [repoDraft, setRepoDraft] = useState(repo || DEFAULT_REPO);
  const [branchDraft, setBranchDraft] = useState(branch || DEFAULT_BRANCH);
  const [showAdvanced, setShowAdvanced] = useState(!compact);

  const canSave = token.trim().length > 0;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        connect({
          owner: ownerDraft,
          repo: repoDraft,
          branch: branchDraft,
          token,
        });
        setToken("");
        onConnected?.();
      }}
    >
      <p className="text-xs text-[var(--text-muted)]">
        Publishing writes straight to the repo, so this device needs a GitHub
        token. Create a{" "}
        <a
          className="underline underline-offset-2"
          href={TOKEN_HELP_URL}
          target="_blank"
          rel="noreferrer"
        >
          fine-grained token
        </a>{" "}
        limited to <span className="font-mono">{repoDraft}</span> with
        <span className="font-mono"> Contents: Read and write</span>. It is
        saved on this phone only.
      </p>

      <label className="flex flex-col gap-1">
        <span className="label">GitHub token</span>
        <input
          className="input font-mono text-sm"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="github_pat_…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          aria-label="GitHub token"
        />
      </label>

      {showAdvanced ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="flex flex-col gap-1">
            <span className="label">Owner</span>
            <input
              className="input font-mono text-sm"
              value={ownerDraft}
              onChange={(e) => setOwnerDraft(e.target.value)}
              aria-label="Repository owner"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Repo</span>
            <input
              className="input font-mono text-sm"
              value={repoDraft}
              onChange={(e) => setRepoDraft(e.target.value)}
              aria-label="Repository name"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Branch</span>
            <input
              className="input font-mono text-sm"
              value={branchDraft}
              onChange={(e) => setBranchDraft(e.target.value)}
              aria-label="Repository branch"
            />
          </label>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-sm self-start"
          onClick={() => setShowAdvanced(true)}
        >
          Change repository
        </button>
      )}

      <button className="btn btn-primary self-start" disabled={!canSave}>
        Save token
      </button>
    </form>
  );
}
