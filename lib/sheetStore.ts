"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RepoConfig } from "./standings/github";

export const DEFAULT_OWNER = "zcoffey7";
export const DEFAULT_REPO = "poker-dashboard";
export const DEFAULT_BRANCH = "main";

/** Most recent successful publish, kept only for the confirmation UI. */
export type PublishRecord = {
  fingerprint: string;
  gameId: string;
  commitUrl: string;
  at: number;
};

type SheetState = {
  owner: string;
  repo: string;
  branch: string;
  /**
   * Fine-grained GitHub token, scoped to this repository with
   * Contents: Read and write. Lives in this device's localStorage only — it
   * is never sent anywhere except api.github.com.
   */
  token: string;
  /** Fingerprints of sessions already committed from this device. */
  published: PublishRecord[];
};

type SheetStore = SheetState & {
  connect: (draft: {
    owner: string;
    repo: string;
    branch: string;
    token: string;
  }) => void;
  disconnect: () => void;
  recordPublish: (record: PublishRecord) => void;
};

const initialState: SheetState = {
  owner: DEFAULT_OWNER,
  repo: DEFAULT_REPO,
  branch: DEFAULT_BRANCH,
  token: "",
  published: [],
};

const MAX_PUBLISH_HISTORY = 20;

export const useSheet = create<SheetStore>()(
  persist(
    (set) => ({
      ...initialState,

      connect: (draft) =>
        set({
          owner: draft.owner.trim() || DEFAULT_OWNER,
          repo: draft.repo.trim() || DEFAULT_REPO,
          branch: draft.branch.trim() || DEFAULT_BRANCH,
          token: draft.token.trim(),
        }),

      disconnect: () => set({ token: "" }),

      recordPublish: (record) =>
        set((s) => ({
          published: [
            record,
            ...s.published.filter((p) => p.fingerprint !== record.fingerprint),
          ].slice(0, MAX_PUBLISH_HISTORY),
        })),
    }),
    {
      name: "poker-sheet-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([, v]) => typeof v !== "function"),
        ) as SheetState,
    },
  ),
);

export function isConnected(state: Pick<SheetState, "token">): boolean {
  return state.token.trim().length > 0;
}

export function repoConfig(state: SheetState): RepoConfig {
  return {
    owner: state.owner,
    repo: state.repo,
    branch: state.branch,
    token: state.token,
  };
}
