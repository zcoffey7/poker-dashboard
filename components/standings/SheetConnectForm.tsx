"use client";

import { useState } from "react";
import {
  DEFAULT_BRANCH,
  DEFAULT_OWNER,
  DEFAULT_REPO,
  useSheet,
} from "@/lib/sheetStore";
import { Field } from "../Section";
import { IconExternal } from "../icons";

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
      className="flex flex-col gap-4"
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
      <p className="text-sm text-muted leading-relaxed">
        Publishing writes straight to the repo, so this device needs a GitHub
        token. Create a{" "}
        <a
          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
          href={TOKEN_HELP_URL}
          target="_blank"
          rel="noreferrer"
        >
          fine-grained token
          <IconExternal size="0.9em" />
        </a>{" "}
        limited to <span className="font-mono text-[0.8125rem] text-text">{repoDraft}</span>{" "}
        with{" "}
        <span className="font-mono text-[0.8125rem] text-text">
          Contents: Read and write
        </span>
        . It&apos;s saved on this device only.
      </p>

      <Field label="GitHub token">
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
      </Field>

      {showAdvanced ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Owner">
            <input
              className="input input-sm font-mono"
              value={ownerDraft}
              onChange={(e) => setOwnerDraft(e.target.value)}
              aria-label="Repository owner"
            />
          </Field>
          <Field label="Repo">
            <input
              className="input input-sm font-mono"
              value={repoDraft}
              onChange={(e) => setRepoDraft(e.target.value)}
              aria-label="Repository name"
            />
          </Field>
          <Field label="Branch">
            <input
              className="input input-sm font-mono"
              value={branchDraft}
              onChange={(e) => setBranchDraft(e.target.value)}
              aria-label="Repository branch"
            />
          </Field>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button className="btn btn-primary" disabled={!canSave}>
          Save token
        </button>
        {!showAdvanced && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAdvanced(true)}
          >
            Change repository
          </button>
        )}
      </div>
    </form>
  );
}
