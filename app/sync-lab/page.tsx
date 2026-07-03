"use client";

import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useCapturedItems, type CapturedSyncItem } from "@/lib/captured-items";
import { buildLifeGraphDiagnostics } from "@/lib/intelligence/life-graph";
import {
  processSyncMessage,
  type SyncEngineConversationTurn,
  type SyncEngineMessageResult,
} from "@/lib/sync-engine";
import {
  buildSyncLabBrief,
  memoryFromSyncEngineResult,
  resolveSyncLabMemoryContext,
  syncLabDisplayResponse,
  SYNC_LAB_CONTEXT_DEFAULT,
  SYNC_LAB_MEMORY_VISIBILITY_DEFAULT,
  type SyncLabMemoryVisibility,
  type SyncLabMemoryVisibilityMap,
} from "@/lib/sync-engine/tools/lab-state";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

import {
  readLabMemories,
  readLabMemoryVisibility,
  writeLabMemories,
  writeLabMemoryVisibility,
} from "./lab-session";
import styles from "./page.module.css";

const SAMPLE_INPUTS = [
  "I skipped my workout again.",
  "I spent too much eating out.",
  "Mom's birthday is tomorrow.",
  "I worked on Sync until 2 AM.",
  "Rent is due after payday.",
  "I feel tired before work.",
  "Dinner moved to Friday.",
  "I don't want to forget to cancel Uber.",
] as const;

type ConversationTurn = {
  id: string;
  userText: string;
  result: SyncEngineMessageResult;
  durationMs: number;
  createdAt: string;
};

function compactConversationTurns(
  turns: ConversationTurn[],
  limit = 12,
): SyncEngineConversationTurn[] {
  const compact: SyncEngineConversationTurn[] = [];
  for (const turn of turns.slice(-limit)) {
    compact.push({
      role: "user",
      text: turn.userText,
      timestamp: turn.createdAt,
      intent: turn.result.conversationIntent.type,
      memoryDecision: turn.result.debug.memoryDecision,
      category: turn.result.debug.category,
      importance: turn.result.debug.importance,
      judgmentPrimary: turn.result.runtime.after.judgment.primary,
      response: turn.result.response,
    });
    compact.push({
      role: "sync",
      text: syncLabDisplayResponse(turn.result),
      timestamp: turn.createdAt,
      intent: turn.result.conversationIntent.type,
      memoryDecision: turn.result.debug.memoryDecision,
      category: turn.result.debug.category,
      importance: turn.result.debug.importance,
      judgmentPrimary: turn.result.runtime.after.judgment.primary,
      response: turn.result.response,
    });
  }
  return compact.slice(-(limit * 2));
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function stateTransitionAction(result: SyncEngineMessageResult) {
  if (result.debug.wouldCreateMemory) return "create memory";
  if (result.debug.wouldUpdateExistingMemory) return "update memory";
  if (result.debug.memoryDecision === "ask_follow_up") return "ask now";
  return "none";
}

function decisionWhy(result: SyncEngineMessageResult) {
  if (result.debug.memoryDecision === "ask_follow_up") {
    return result.futureFollowUpDecision.reason;
  }
  if (result.debug.wouldUpdateExistingMemory) {
    return "Sync found this close enough to existing context to update it.";
  }
  if (result.debug.wouldCreateMemory) {
    return "Sync found enough detail to hold this as lab memory.";
  }
  return "Sync did not find enough useful signal to remember this.";
}

function decisionMemoryLabel(result: SyncEngineMessageResult) {
  if (result.debug.wouldUpdateExistingMemory) return "update";
  if (result.debug.wouldCreateMemory) return "remember";
  if (result.debug.memoryDecision === "ask_follow_up") return "ask follow-up";
  return "ignore";
}

function DecisionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.decisionRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DecisionPanel({
  turn,
  onClose,
}: {
  turn: ConversationTurn;
  onClose: () => void;
}) {
  const { result } = turn;
  const consequence =
    result.debug.consequenceSummary || result.consequence?.summary || "none";

  return (
    <div className={styles.decisionPanel}>
      <div className={styles.decisionPanelHeader}>
        <span>Decision</span>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className={styles.decisionList}>
        <DecisionRow label="Memory" value={decisionMemoryLabel(result)} />
        <DecisionRow label="Why" value={decisionWhy(result)} />
        <DecisionRow label="Category" value={result.debug.category} />
        <DecisionRow label="Importance" value={result.debug.importance} />
        <DecisionRow
          label="surface later"
          value={result.debug.shouldSurfaceLater ? "yes" : "no"}
        />
        <DecisionRow label="Consequence" value={consequence} />
        <DecisionRow
          label="Confidence"
          value={formatConfidence(result.debug.confidence)}
        />
      </div>
      <details className={styles.advancedDecision}>
        <summary>Advanced</summary>
        <div className={styles.advancedBlock}>
          <span>reasoningTrace</span>
          <ol>
            {result.reasoningTrace.map((step) => (
              <li key={`${turn.id}-${step.step}`}>
                <strong>{step.step.replaceAll("_", " ")}</strong>
                <p>{step.summary}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className={styles.advancedBlock}>
          <span>contextUse</span>
          <code>{JSON.stringify(result.contextUse)}</code>
        </div>
        <div className={styles.advancedBlock}>
          <span>runtime brain (after)</span>
          <code>{JSON.stringify(result.runtime.after, null, 2)}</code>
        </div>
        <div className={styles.advancedBlock}>
          <span>runtime judgment changed</span>
          <code>{result.runtime.judgmentChanged ? "yes" : "no"}</code>
        </div>
        <div className={styles.advancedBlock}>
          <span>pattern insight</span>
          <code>{result.runtime.pattern.insight ?? "none"}</code>
        </div>
        <div className={styles.advancedBlock}>
          <span>briefingEffect</span>
          <code>{JSON.stringify(result.briefingEffect)}</code>
        </div>
        <div className={styles.advancedBlock}>
          <span>conversationIntent</span>
          <code>{JSON.stringify(result.conversationIntent)}</code>
        </div>
        <div className={styles.advancedBlock}>
          <span>conversationState</span>
          <code>{JSON.stringify(result.conversationState)}</code>
        </div>
        <div className={styles.advancedBlock}>
          <span>conversationGoal</span>
          <code>{JSON.stringify(result.conversationGoal)}</code>
        </div>
        <div className={styles.advancedBlock}>
          <span>stateTransition raw summary</span>
          <code>{stateTransitionAction(result)}</code>
        </div>
        <div className={styles.advancedBlock}>
          <span>related memory IDs</span>
          <code>
            {result.debug.relatedMemoryIds.length
              ? result.debug.relatedMemoryIds.join(", ")
              : "none"}
          </code>
        </div>
      </details>
    </div>
  );
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SyncLabPage() {
  const { activeItems } = useCapturedItems();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [testMemories, setTestMemoriesState] = useState<CapturedSyncItem[]>([]);
  const [memoryVisibility, setMemoryVisibilityState] =
    useState<SyncLabMemoryVisibilityMap>({});
  const [memoryMode, setMemoryMode] = useState<SyncLabMemoryVisibility>(
    SYNC_LAB_MEMORY_VISIBILITY_DEFAULT,
  );
  const [referenceCounts, setReferenceCounts] = useState<Record<string, number>>({});
  const [useCurrentContext, setUseCurrentContext] = useState(
    SYNC_LAB_CONTEXT_DEFAULT,
  );
  const [openDecisionTurnId, setOpenDecisionTurnId] = useState<string | null>(null);
  const [workSchedule] = useState(() =>
    typeof window === "undefined" ? null : loadActiveWorkSchedule() ?? null,
  );

  useEffect(() => {
    queueMicrotask(() => {
      setTestMemoriesState(readLabMemories());
      setMemoryVisibilityState(readLabMemoryVisibility());
    });
  }, []);

  function setLabMemories(memories: CapturedSyncItem[]) {
    setTestMemoriesState(memories);
    writeLabMemories(memories);
  }

  function setLabMemoryVisibility(visibility: SyncLabMemoryVisibilityMap) {
    setMemoryVisibilityState(visibility);
    writeLabMemoryVisibility(visibility);
  }

  const memoryContext = useMemo(
    () =>
      resolveSyncLabMemoryContext({
        contextEnabled: useCurrentContext,
        storedItems: activeItems,
        testItems: testMemories,
      }),
    [activeItems, testMemories, useCurrentContext],
  );
  const brief = useMemo(
    () =>
      buildSyncLabBrief({
        items: memoryContext.combinedMemories,
        workSchedule,
      }).preview,
    [memoryContext.combinedMemories, workSchedule],
  );

  function runMessages(messages: string[], options?: { resetLabMemory?: boolean }) {
    if (messages.length === 0) return;

    let localMemories = options?.resetLabMemory ? [] : [...testMemories];
    const nextVisibility = options?.resetLabMemory ? {} : { ...memoryVisibility };
    const nextTurns: ConversationTurn[] = [];
    const nextReferenceCounts = options?.resetLabMemory ? {} : { ...referenceCounts };

    for (const message of messages) {
      const trimmed = message.trim();
      const runContext = resolveSyncLabMemoryContext({
        contextEnabled: useCurrentContext,
        storedItems: activeItems,
        testItems: localMemories,
      });
      const started = performance.now();
      const recentTurns = compactConversationTurns([...turns, ...nextTurns], 12);
      const result = processSyncMessage({
        text: trimmed,
        storedMemories: runContext.storedMemories,
        labMemories: runContext.labMemories,
        workSchedule,
        engineMode: "dryRun",
        conversation: { turns: recentTurns },
      });
      const durationMs = performance.now() - started;
      const memory = memoryFromSyncEngineResult(result);
      const nextMemories = memory
        ? [memory, ...localMemories.filter((item) => item.id !== memory.id)]
        : localMemories;
      if (memory) {
        nextVisibility[memory.id] = memoryMode;
      }

      for (const id of result.debug.relatedMemoryIds) {
        nextReferenceCounts[id] = (nextReferenceCounts[id] ?? 0) + 1;
      }

      nextTurns.push({
        id: `${Date.now()}-${nextTurns.length}-${trimmed}`,
        userText: trimmed,
        result,
        durationMs,
        createdAt: new Date().toISOString(),
      });
      localMemories = nextMemories;
    }

    setTurns((current) =>
      options?.resetLabMemory ? nextTurns : [...current, ...nextTurns],
    );
    setLabMemories(localMemories);
    setLabMemoryVisibility(nextVisibility);
    setReferenceCounts(nextReferenceCounts);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    runMessages([trimmed]);
    setInput("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function resetTestMemory() {
    setLabMemories([]);
    setLabMemoryVisibility({});
    setReferenceCounts({});
  }

  function replayConversation() {
    const messages = turns.map((turn) => turn.userText);
    setOpenDecisionTurnId(null);
    resetTestMemory();
    runMessages(messages, { resetLabMemory: true });
  }

  function exportState() {
    const diagnostics = buildLifeGraphDiagnostics({
      items: memoryContext.combinedMemories,
    });

    downloadJson("sync-engine-lab-state.json", {
      exportedAt: new Date().toISOString(),
      conversation: turns,
      testMemories,
      memoryVisibility,
      storedMemoryCount: activeItems.length,
      briefingPreview: brief,
      runtimeBrain: turns.at(-1)?.result.runtime ?? null,
      contextEnabled: useCurrentContext,
      lifeGraphDiagnostics: diagnostics,
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.brand}>SYNC</p>
            <p className={styles.subtitle}>Learning to understand.</p>
          </div>
          <nav className={styles.labNav} aria-label="Sync lab">
            <Link href="/sync-lab">Lab</Link>
            <Link href="/sync-lab/memory">Memory</Link>
            <Link href="/sync-lab/review">Review</Link>
          </nav>
        </header>

        <section className={styles.conversation} aria-live="polite">
          {turns.length === 0 ? (
            <p className={styles.empty}>
              Tell Sync something real. This lab stays in dry run while the
              engine learns how to understand.
            </p>
          ) : (
            turns.map((turn) => (
              <article className={styles.turn} key={turn.id}>
                <div className={`${styles.message} ${styles.userMessage}`}>
                  {turn.userText || "(empty input)"}
                  <div className={styles.meta}>{formatTime(turn.createdAt)}</div>
                </div>
                <div className={`${styles.message} ${styles.syncMessage}`}>
                  {syncLabDisplayResponse(turn.result) ||
                    "No response. Sync did not have enough to say."}
                  <div className={styles.responseActions}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDecisionTurnId((current) =>
                          current === turn.id ? null : turn.id,
                        )
                      }
                    >
                      Decision
                    </button>
                  </div>
                  {openDecisionTurnId === turn.id ? (
                    <DecisionPanel
                      turn={turn}
                      onClose={() => setOpenDecisionTurnId(null)}
                    />
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>

        <section className={styles.composerWrap}>
          <details className={styles.toolsMenu}>
            <summary>Lab tools</summary>
            <div className={styles.tools}>
              <label className={styles.contextToggle}>
                <span>Memory mode</span>
                <select
                  value={memoryMode}
                  onChange={(event) =>
                    setMemoryMode(event.target.value as SyncLabMemoryVisibility)
                  }
                >
                  <option value="internal">Internal only</option>
                  <option value="visible">Internal + visible memory list</option>
                </select>
              </label>
              <label className={styles.contextToggle}>
                <input
                  type="checkbox"
                  checked={useCurrentContext}
                  onChange={(event) => setUseCurrentContext(event.target.checked)}
                />
                <span>Use current Sync memory context</span>
              </label>
              <button
                className={styles.toolButton}
                type="button"
                onClick={() => runMessages([...SAMPLE_INPUTS])}
              >
                Run Sample Inputs
              </button>
              <button
                className={styles.toolButton}
                type="button"
                onClick={exportState}
              >
                Export JSON
              </button>
              <button
                className={styles.toolButton}
                type="button"
                onClick={() => {
                  setTurns([]);
                  setOpenDecisionTurnId(null);
                }}
              >
                Clear Conversation
              </button>
              <button
                className={styles.toolButton}
                type="button"
                onClick={resetTestMemory}
              >
                Reset Test Memory
              </button>
              <button
                className={styles.toolButton}
                type="button"
                disabled={turns.length === 0}
                onClick={replayConversation}
              >
                Replay Previous Conversation
              </button>
            </div>
          </details>

          <form className={styles.composer} onSubmit={handleSubmit}>
            <textarea
              className={styles.input}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell Sync what happened..."
              rows={2}
            />
            <button className={styles.send} type="submit">
              Send
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
