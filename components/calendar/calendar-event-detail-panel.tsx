"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CapturedSyncItem } from "@/lib/captured-items";
import type { TimelineEvent } from "@/lib/timeline-events";

type CalendarEventDetailPanelProps = {
  event: TimelineEvent;
  capture?: CapturedSyncItem | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSaveEdit?: (updates: { title: string; notes?: string }) => void;
};

export function CalendarEventDetailPanel({
  event,
  capture,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onSaveEdit,
}: CalendarEventDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(capture?.title ?? event.title);
  const [notes, setNotes] = useState(capture?.notes ?? "");

  const timeLabel = event.isAllDay
    ? "All day"
    : event.detail?.time ?? "Time not specified";

  function handleSave() {
    onSaveEdit?.({ title: title.trim() || event.title, notes: notes.trim() });
    setIsEditing(false);
  }

  return (
    <section className="sync-home-surface sync-calendar-event-detail">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
            Event details
          </p>
          {isEditing ? (
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-border/35 bg-background/35 px-3 text-[16px] text-foreground/92 outline-none"
              aria-label="Event title"
            />
          ) : (
            <h3 className="mt-1 text-[18px] font-medium tracking-[-0.03em] text-foreground/95">
              {event.title}
            </h3>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </header>

      <dl className="mt-4 space-y-3 text-[14px]">
        <div>
          <dt className="text-muted-foreground/55">When</dt>
          <dd className="mt-0.5 text-foreground/85">{timeLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/55">Category</dt>
          <dd className="mt-0.5 capitalize text-foreground/85">{event.lifeCategory}</dd>
        </div>
        {capture && (
          <div>
            <dt className="text-muted-foreground/55">Goes to</dt>
            <dd className="mt-0.5 text-foreground/85">
              {capture.destinations.join(" · ")}
            </dd>
          </div>
        )}
        {capture && (
          <div>
            <dt className="text-muted-foreground/55">Notes</dt>
            <dd className="mt-0.5 text-foreground/85">
              {isEditing ? (
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border/35 bg-background/35 px-3 py-2 text-[14px] text-foreground/88 outline-none"
                  aria-label="Event notes"
                />
              ) : (
                notes || "—"
              )}
            </dd>
          </div>
        )}
        {capture?.prompt && !isEditing && (
          <div>
            <dt className="text-muted-foreground/55">Captured as</dt>
            <dd className="mt-0.5 text-muted-foreground/72">{capture.prompt}</dd>
          </div>
        )}
      </dl>

      {capture && (
        <div className="mt-5 flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <Button type="button" size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(true);
                  onEdit?.();
                }}
              >
                Edit
              </Button>
              {onDuplicate && (
                <Button type="button" variant="outline" size="sm" onClick={onDuplicate}>
                  Duplicate
                </Button>
              )}
              {onDelete && (
                <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
