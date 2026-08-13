import Link from "next/link";

import { ALL_SYNC_ENGINE_TEST_SUITES } from "@/lib/sync-engine/testing/fixtures";
import {
  runSyncEngineTestSuites,
  type SyncEngineCaseRun,
  type SyncEngineTestStatus,
} from "@/lib/sync-engine/testing/test-runner";
import { philosophyRuleLabel } from "@/lib/sync-engine/testing/philosophy";

import styles from "../page.module.css";

function statusLabel(status: SyncEngineTestStatus) {
  if (status === "pass") return "pass";
  if (status === "warn") return "warn";
  if (status === "known_gap") return "known gap";
  return "fail";
}

function formatExpected(value: unknown) {
  return JSON.stringify(
    value,
    (_key, current) => {
      if (current instanceof RegExp) return current.toString();
      return current;
    },
    2,
  );
}

function CaseResult({ testCase }: { testCase: SyncEngineCaseRun }) {
  return (
    <details className={styles.testCase}>
      <summary>
        <span className={styles[`status-${testCase.status}`]}>
          {statusLabel(testCase.status)}
        </span>
        <strong>{testCase.title}</strong>
      </summary>
      <div className={styles.testCaseBody}>
        <section>
          <h3>Input</h3>
          {testCase.input.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
        <section>
          <h3>Expected behavior</h3>
          <pre>{formatExpected(testCase.expected)}</pre>
        </section>
        <section>
          <h3>Actual engine output</h3>
          <pre>
            {formatExpected({
              response: testCase.output.response,
              memoryDecision: testCase.output.debug.memoryDecision,
              category: testCase.output.debug.category,
              importance: testCase.output.debug.importance,
              affectedTimeframe: testCase.output.debug.affectedTimeframe,
              surfaceLater: testCase.output.debug.shouldSurfaceLater,
              relatedMemoryIds: testCase.output.debug.relatedMemoryIds,
              confidence: testCase.output.debug.confidence,
              futureFollowUpDecision: testCase.output.futureFollowUpDecision,
              briefingEffect: testCase.output.briefingEffect,
            })}
          </pre>
        </section>
        <section>
          <h3>Mismatch reason</h3>
          {testCase.mismatchReasons.length > 0 ? (
            <ul>
              {testCase.mismatchReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p>No mismatch.</p>
          )}
          {testCase.knownGap ? <p>Known gap: {testCase.knownGap}</p> : null}
        </section>
        <section>
          <h3>Philosophy rules</h3>
          <ul>
            {testCase.philosophyRules.map((rule) => (
              <li key={rule}>{philosophyRuleLabel(rule)}</li>
            ))}
          </ul>
        </section>
      </div>
    </details>
  );
}

export default async function SyncLabTestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ suite?: string }>;
}) {
  const params = await searchParams;
  const selectedSuiteId = params?.suite;
  const selectedSuite = selectedSuiteId
    ? ALL_SYNC_ENGINE_TEST_SUITES.find((suite) => suite.id === selectedSuiteId)
    : null;
  const suitesToRun = selectedSuite ? [selectedSuite] : [...ALL_SYNC_ENGINE_TEST_SUITES];
  const run = runSyncEngineTestSuites(suitesToRun);

  return (
    <main className={`${styles.page} ${styles.managementShell}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>SYNC</p>
          <p className={styles.subtitle}>Intelligence testing.</p>
        </div>
        <nav className={styles.labNav} aria-label="Sync lab">
          <Link href="/sync-lab">Lab</Link>
          <Link href="/sync-lab/memory">Memory</Link>
          <Link href="/sync-lab/review">Review</Link>
          <Link href="/sync-lab/tests">Tests</Link>
        </nav>
      </header>

      <section className={styles.testIntro}>
        <div>
          <h1>Sync Engine Tests</h1>
          <p>
            Deterministic checks for memory, consequences, relationships,
            patterns, follow-ups, contradictions, and safety.
          </p>
        </div>
        <div className={styles.testSummary}>
          <span>{run.summary.passed} pass</span>
          <span>{run.summary.warned} warn</span>
          <span>{run.summary.knownGaps} known gap</span>
          <span>{run.summary.failed} fail</span>
        </div>
      </section>

      <section className={styles.testControls} aria-label="Test suites">
        <Link href="/sync-lab/tests">Run all suites</Link>
        {ALL_SYNC_ENGINE_TEST_SUITES.map((suite) => (
          <Link
            href={`/sync-lab/tests?suite=${suite.id}`}
            key={suite.id}
            data-active={suite.id === selectedSuiteId}
          >
            Run {suite.title}
          </Link>
        ))}
      </section>

      <section className={styles.testSuites}>
        {run.suites.map((suite) => (
          <article className={styles.testSuite} key={suite.suiteId}>
            <header>
              <div>
                <h2>{suite.suiteTitle}</h2>
                <p>{suite.goal}</p>
              </div>
              <div className={styles.testSummary}>
                <span>{suite.passCount} pass</span>
                <span>{suite.warnCount} warn</span>
                <span>{suite.failCount} fail</span>
              </div>
            </header>
            <div className={styles.testCases}>
              {suite.cases.map((testCase) => (
                <CaseResult key={testCase.caseId} testCase={testCase} />
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
