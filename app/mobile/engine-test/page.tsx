"use client";

import { FormEvent, useMemo, useState } from "react";

import { useCapturedItems } from "@/lib/captured-items";
import {
  processSyncMessage,
  type SyncEngineMessageResult,
} from "@/lib/sync-engine";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";

type RecentMessage = {
  id: string;
  text: string;
  response: string;
  remembered: boolean;
  category: string;
};

type ContextSnapshot = {
  enabled: boolean;
  memoryCount: number;
};

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sync-engine-test-debug-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function SyncEngineTestPage() {
  const { activeItems } = useCapturedItems();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<SyncEngineMessageResult | null>(null);
  const [recent, setRecent] = useState<RecentMessage[]>([]);
  const [useCurrentContext, setUseCurrentContext] = useState(false);
  const [lastRunContext, setLastRunContext] = useState<ContextSnapshot>({
    enabled: false,
    memoryCount: 0,
  });

  const contextMemories = useMemo(
    () => (useCurrentContext ? activeItems : []),
    [activeItems, useCurrentContext],
  );
  const contextPreview = useMemo(
    () =>
      contextMemories.slice(0, 5).map((item) => ({
        id: item.id,
        title: displayMemoryTitle(item),
        category: item.category,
      })),
    [contextMemories],
  );

  const debugRows = useMemo(() => {
    if (!result) return [];
    const debug = result.debug;
    return [
      ["Context enabled", lastRunContext.enabled ? "yes" : "no"],
      ["Memories loaded", String(lastRunContext.memoryCount)],
      ["Remembered", debug.remembered ? "yes" : "no"],
      ["Memory decision", debug.memoryDecision],
      [
        "Would create memory",
        debug.wouldCreateMemory ? "yes" : "no",
      ],
      [
        "Would update existing",
        debug.wouldUpdateExistingMemory ? "yes" : "no",
      ],
      ["Category", debug.category],
      ["Importance", debug.importance],
      ["Consequence summary", debug.consequenceSummary],
      ["Affected timeframe", debug.affectedTimeframe],
      ["Should surface later", debug.shouldSurfaceLater ? "yes" : "no"],
      ["Related memories found", String(debug.relatedMemoriesFound)],
      [
        "Related memory IDs",
        debug.relatedMemoryIds.length > 0
          ? debug.relatedMemoryIds.join(", ")
          : "none",
      ],
      [
        "Duplicate/update candidate",
        debug.duplicateUpdateCandidate
          ? `${debug.duplicateUpdateCandidate.title} (${debug.duplicateUpdateCandidate.id})`
          : "none",
      ],
      ["Dry run", debug.dryRun ? "yes" : "no"],
      ["Confidence", formatConfidence(debug.confidence)],
    ] as const;
  }, [lastRunContext, result]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = useCurrentContext
      ? processSyncMessage({
          text: input,
          context: {
            capturedItems: contextMemories,
            currentDate: new Date(),
            dryRun: true,
          },
        })
      : processSyncMessage({ text: input });
    setLastRunContext({
      enabled: useCurrentContext,
      memoryCount: contextMemories.length,
    });
    setResult(next);

    const trimmed = input.trim();
    if (!trimmed) return;

    setRecent((current) => [
      {
        id: `${Date.now()}-${current.length}`,
        text: trimmed,
        response: next.response || "No response.",
        remembered: next.debug.remembered,
        category: next.debug.category,
      },
      ...current,
    ].slice(0, 8));
    setInput("");
  }

  return (
    <main className="mobile-prototype sync-app">
      <div className="sync-app-screen">
        <section className="mobile-prototype-scroll mobile-prototype-pad-x sync-engine-test">
          <header className="sync-screen-header">
            <p className="sync-engine-test-kicker">Development only</p>
            <h1 className="sync-screen-title">Sync Engine Test</h1>
            <p className="sync-screen-subtitle">
              A hidden lab for checking how Sync understands one message.
            </p>
          </header>

          <form className="sync-engine-test-form" onSubmit={handleSubmit}>
            <label className="sync-capture-label" htmlFor="sync-engine-input">
              Test message
            </label>
            <textarea
              id="sync-engine-input"
              className="sync-text-field sync-text-field--multiline sync-engine-test-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="I worked on Sync from 8pm to 10pm"
              rows={4}
            />
            <label className="sync-engine-test-toggle">
              <input
                type="checkbox"
                checked={useCurrentContext}
                onChange={(event) => setUseCurrentContext(event.target.checked)}
              />
              <span>Use current Sync memory context</span>
            </label>
            <button className="sync-brief-capture-submit" type="submit">
              Run Engine
            </button>
          </form>

          <section className="sync-engine-test-section" aria-live="polite">
            <h2 className="sync-engine-test-heading">Response</h2>
            <p className="sync-engine-test-response">
              {result
                ? result.response || "No response. Sync did not have enough to say."
                : "Run a message to see Sync's reply."}
            </p>
          </section>

          <section className="sync-engine-test-section">
            <h2 className="sync-engine-test-heading">Debug</h2>
            {result ? (
              <dl className="sync-engine-test-debug">
                {debugRows.map(([label, value]) => (
                  <DebugRow key={label} label={label} value={value} />
                ))}
              </dl>
            ) : (
              <p className="sync-engine-test-muted">
                Internal decisions will show here after a run.
              </p>
            )}
          </section>

          <details className="sync-engine-test-section sync-engine-test-context">
            <summary className="sync-engine-test-heading">Context Preview</summary>
            {useCurrentContext ? (
              contextPreview.length > 0 ? (
                <ul className="sync-engine-test-recent">
                  {contextPreview.map((memory) => (
                    <li key={memory.id}>
                      <span>{memory.title}</span>
                      <small>{memory.category}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sync-engine-test-muted">
                  No active memories are available to pass into this run.
                </p>
              )
            ) : (
              <p className="sync-engine-test-muted">
                Current memory context is off for this run.
              </p>
            )}
          </details>

          <section className="sync-engine-test-section">
            <h2 className="sync-engine-test-heading">Recent Tests</h2>
            {recent.length > 0 ? (
              <ul className="sync-engine-test-recent">
                {recent.map((message) => (
                  <li key={message.id}>
                    <span>{message.text}</span>
                    <small>
                      {message.remembered ? "remembered" : "not remembered"} -{" "}
                      {message.category}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sync-engine-test-muted">No test messages yet.</p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
