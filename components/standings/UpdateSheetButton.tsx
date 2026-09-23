"use client";

import { useMemo, useState } from "react";
import UpdateSheetDialog from "./UpdateSheetDialog";
import { useSheet } from "@/lib/sheetStore";
import { sessionFingerprint } from "@/lib/standings/session";
import type { SessionDraft } from "@/lib/standings/types";
import { IconUpload } from "../icons";

type Props = {
  session: SessionDraft;
  className?: string;
};

/**
 * Recap-screen entry point for folding the finished game into the standings
 * sheet without waiting to get back to a computer.
 */
export default function UpdateSheetButton({ session, className }: Props) {
  const [open, setOpen] = useState(false);
  const published = useSheet((s) => s.published);

  const fingerprint = useMemo(() => sessionFingerprint(session), [session]);
  const alreadyPublished = published.some((p) => p.fingerprint === fingerprint);

  return (
    <>
      <button
        className={className ?? (alreadyPublished ? "btn" : "btn btn-primary")}
        onClick={() => setOpen(true)}
        disabled={session.players.length === 0}
        title={
          session.players.length === 0
            ? "No players to publish"
            : "Add this game to the standings sheet"
        }
        data-testid="update-sheet-button"
      >
        {!alreadyPublished && <IconUpload />}
        {alreadyPublished ? "Sheet updated ✓" : "Update Sheet"}
      </button>
      {open && (
        <UpdateSheetDialog session={session} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
