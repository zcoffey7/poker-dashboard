"use client";

import { useId } from "react";
import ModalShell, { ModalFooter } from "./ModalShell";
import { IconAlert, IconInfo } from "./icons";
import { settleConfirm, useConfirmQueue } from "@/lib/confirm";

/** Renders the pending `confirmAction` / `showNotice` prompt, if any. */
export default function ConfirmHost() {
  const current = useConfirmQueue((s) => s.queue[0]);
  if (!current) return null;
  return <ConfirmDialog key={current.id} {...current} />;
}

function ConfirmDialog({
  id,
  title,
  message,
  confirmLabel,
  tone = "default",
  notice,
}: {
  id: number;
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
  notice?: boolean;
}) {
  const titleId = useId();
  const descId = useId();
  const cancel = () => settleConfirm(id, false);
  const confirm = () => settleConfirm(id, true);
  const danger = tone === "danger";

  return (
    <ModalShell
      role="alertdialog"
      variant="center"
      onClose={notice ? confirm : cancel}
      labelledBy={titleId}
      describedBy={message ? descId : undefined}
      cardClassName="w-full max-w-md overflow-hidden"
    >
      <div className="flex gap-4 px-5 pt-5 pb-4">
        <span
          className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
            danger ? "bg-loss/12 text-loss" : "bg-primary/12 text-primary"
          }`}
        >
          {danger ? <IconAlert /> : <IconInfo />}
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {message && (
            <p id={descId} className="mt-1 text-sm text-muted leading-relaxed">
              {message}
            </p>
          )}
        </div>
      </div>
      <ModalFooter>
        {!notice && (
          <button
            type="button"
            className="btn flex-1 sm:flex-none"
            onClick={cancel}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          className={`btn flex-1 sm:flex-none ${danger ? "btn-danger-solid" : "btn-primary"}`}
          onClick={confirm}
        >
          {confirmLabel ?? "Confirm"}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}
