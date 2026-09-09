import {
  GitHubError,
  commitStandingsFiles,
  fetchStandingsSnapshot,
  type CommitResult,
  type RepoConfig,
} from "./github";
import { buildStandingsUpdate, type StandingsUpdate } from "./update";
import type { SessionDraft } from "./types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Add Sep 9 cash game to standings." — matches the existing history. */
export function commitMessageFor(session: SessionDraft): string {
  const [, month, day] = session.date.split("-");
  const label = `${MONTHS[Number.parseInt(month, 10) - 1] ?? month} ${Number.parseInt(day, 10)}`;
  return `Add ${label} ${session.mode} game to standings.`;
}

export type PublishResult = {
  update: StandingsUpdate;
  commit: CommitResult;
};

/**
 * Read the standings at the branch tip, fold the session in, and commit all
 * three files at once. If the branch moves between the read and the write
 * (another publish, or a push from a laptop) the whole thing is rebuilt on
 * the new tip rather than clobbering it.
 */
export async function publishSession(
  config: RepoConfig,
  session: SessionDraft,
  opts: { attempts?: number } = {},
): Promise<PublishResult> {
  const attempts = opts.attempts ?? 2;
  let lastConflict: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const snapshot = await fetchStandingsSnapshot(config, session.mode);
    const update = buildStandingsUpdate(snapshot.files, session);
    try {
      const commit = await commitStandingsFiles(config, {
        mode: session.mode,
        parentSha: snapshot.headSha,
        files: update.files,
        message: commitMessageFor(update.session),
      });
      return { update, commit };
    } catch (err) {
      const moved =
        err instanceof GitHubError && (err.status === 409 || err.status === 422);
      if (!moved) throw err;
      lastConflict = err;
    }
  }

  throw lastConflict;
}

/** Preview the update without touching the repo. */
export async function previewSession(
  config: RepoConfig,
  session: SessionDraft,
): Promise<StandingsUpdate> {
  const snapshot = await fetchStandingsSnapshot(config, session.mode);
  return buildStandingsUpdate(snapshot.files, session);
}
