"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AWARENESS_CHIPS,
  buildDailyBrief,
  CAPTURE_EXAMPLES,
  EMPTY_ONBOARDING,
  PRIORITY_CHIPS,
  type MobilePrototypeScreen,
  type OnboardingData,
} from "@/components/mobile-prototype/build-briefing";
import { savePreferredName } from "@/lib/mobile-prototype/build-daily-brief";

type ThemeMode = "light" | "dark";

const ONBOARDING_FLOW: MobilePrototypeScreen[] = [
  "name",
  "week",
  "priorities",
  "awareness",
  "coming-up",
];

const TAGLINE = "Remember what shapes your future.";

function toggleChip(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function onboardingStep(screen: MobilePrototypeScreen) {
  const index = ONBOARDING_FLOW.indexOf(screen);
  return index === -1 ? null : { current: index + 1, total: ONBOARDING_FLOW.length };
}

function PrimaryButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-[1.15rem] px-5 py-[1.05rem] text-[15px] font-medium tracking-[0.01em] transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-38"
      style={{
        background: "linear-gradient(180deg, var(--mp-accent) 0%, var(--mp-accent-deep) 100%)",
        color: "var(--mp-button-fg)",
        boxShadow: "var(--mp-shadow), 0 0 0 1px var(--mp-border-strong)",
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mobile-prototype-glass rounded-full px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition-opacity active:opacity-70"
      style={{ color: "var(--mp-fg-muted)" }}
    >
      {children}
    </button>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mobile-prototype-progress" aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} data-active={index < current} />
      ))}
    </div>
  );
}

function ScreenFooter({ children }: { children: React.ReactNode }) {
  return <div className="mobile-prototype-footer">{children}</div>;
}

function QuestionShell({
  eyebrow,
  question,
  step,
  children,
  footer,
}: {
  eyebrow: string;
  question: string;
  step: { current: number; total: number };
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="mobile-prototype-screen mobile-prototype-fade-in">
      <div className="mobile-prototype-scroll mobile-prototype-pad-x pb-4 pt-2">
        <ProgressBar current={step.current} total={step.total} />
        <p
          className="mt-5 text-[10px] font-medium uppercase tracking-[0.2em]"
          style={{ color: "var(--mp-fg-subtle)" }}
        >
          {eyebrow}
        </p>
        <h2
          className="mobile-prototype-display mt-4 w-full text-[2.15rem] leading-[1.08] tracking-[-0.03em]"
          style={{ color: "var(--mp-fg)" }}
        >
          {question}
        </h2>
        <div className="mt-7 w-full">{children}</div>
      </div>
      <ScreenFooter>{footer}</ScreenFooter>
    </div>
  );
}

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex w-full flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className="rounded-[1rem] border px-3.5 py-2.5 text-[14px] font-medium transition-all active:scale-[0.98]"
            style={{
              background: active ? "var(--mp-chip-active-bg)" : "var(--mp-chip-bg)",
              borderColor: active
                ? "var(--mp-chip-active-border)"
                : "var(--mp-border)",
              color: active ? "var(--mp-fg)" : "var(--mp-fg-muted)",
              boxShadow: active ? "0 0 0 1px var(--mp-accent-glow)" : "none",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const shared =
    "mobile-prototype-glass w-full rounded-[1.15rem] px-4 py-4 text-[16px] leading-relaxed outline-none transition-shadow focus:shadow-[0_0_0_1px_var(--mp-border-strong)]";
  const style = {
    color: "var(--mp-fg)",
    caretColor: "var(--mp-accent)",
  } as const;

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className={`${shared} min-h-[148px] resize-none`}
        style={style}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={shared}
      style={style}
    />
  );
}

function BriefSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section
      className="mobile-prototype-glass mt-4 w-full rounded-[1.35rem] p-4"
      style={{ boxShadow: "0 0 0 1px var(--mp-border)" }}
    >
      <h3
        className="text-[10px] font-medium uppercase tracking-[0.18em]"
        style={{ color: "var(--mp-fg-subtle)" }}
      >
        {title}
      </h3>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-[15px] leading-[1.55]"
            style={{ color: "var(--mp-fg)" }}
          >
            <span
              className="mt-[10px] size-1.5 shrink-0 rounded-full"
              style={{
                background: "var(--mp-accent)",
                boxShadow: "0 0 10px var(--mp-accent-glow)",
              }}
            />
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
  const [lineOne, lineTwo] = TAGLINE.split(" your ");

  return (
    <div className="mobile-prototype-screen">
      <div className="mobile-prototype-pad-x flex h-full flex-col justify-between pb-6 pt-4">
        <div>
          <p
            className="mobile-prototype-rise-1 text-[10px] font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--mp-fg-subtle)" }}
          >
            A second brain for your life
          </p>

          <p
            className="mobile-prototype-display mobile-prototype-rise-2 mt-9 text-[4.25rem] leading-[0.88] tracking-[-0.05em]"
            style={{ color: "var(--mp-fg)" }}
          >
            SYNC
          </p>

          <p
            className="mobile-prototype-display mobile-prototype-rise-3 mt-7 w-full text-[1.95rem] leading-[1.04] tracking-[-0.03em]"
            style={{ color: "var(--mp-fg)" }}
          >
            {lineOne}
            <span style={{ color: "var(--mp-accent)" }}> your </span>
            {lineTwo}
          </p>

          <p
            className="mobile-prototype-rise-4 mt-5 w-full text-[15px] leading-[1.65]"
            style={{ color: "var(--mp-fg-muted)" }}
          >
            Calm awareness for the details that shape your days — not another
            planner, not another task list.
          </p>

          <div
            className="mobile-prototype-rise-4 mt-7 h-px w-16"
            style={{ background: "var(--mp-border-strong)" }}
          />
        </div>

        <div className="mobile-prototype-rise-4 w-full">
          <PrimaryButton onClick={onBegin}>Begin</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function MobilePrototypeApp() {
  const [screen, setScreen] = useState<MobilePrototypeScreen>("welcome");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [data, setData] = useState<OnboardingData>(EMPTY_ONBOARDING);
  const [captureInput, setCaptureInput] = useState("");
  const [recentCaptures, setRecentCaptures] = useState<string[]>([]);

  const brief = useMemo(() => buildDailyBrief(data), [data]);
  const step = onboardingStep(screen);

  useEffect(() => {
    if (screen !== "building") return;
    const timer = window.setTimeout(() => setScreen("brief"), 2400);
    return () => window.clearTimeout(timer);
  }, [screen]);

  const update = (patch: Partial<OnboardingData>) => {
    setData((current) => ({ ...current, ...patch }));
  };

  const handleCapture = () => {
    const trimmed = captureInput.trim();
    if (!trimmed) return;
    setRecentCaptures((current) => [trimmed, ...current].slice(0, 3));
    setCaptureInput("");
  };

  return (
    <div className="mobile-prototype" data-theme={theme}>
      <div className="mobile-prototype-shell">
        <header className="mobile-prototype-chrome">
          <GhostButton
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? "Light" : "Dark"}
          </GhostButton>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          {screen === "welcome" && (
            <WelcomeScreen onBegin={() => setScreen("name")} />
          )}

          {screen === "name" && step && (
            <QuestionShell
              eyebrow="Getting acquainted"
              question="What should Sync call you?"
              step={step}
              footer={
                <PrimaryButton
                  disabled={!data.name.trim()}
                  onClick={() => {
                    savePreferredName(data.name);
                    setScreen("week");
                  }}
                >
                  Continue
                </PrimaryButton>
              }
            >
              <TextField
                value={data.name}
                onChange={(value) => update({ name: value })}
                placeholder="Your first name"
              />
            </QuestionShell>
          )}

          {screen === "week" && step && (
            <QuestionShell
              eyebrow="Your rhythm"
              question="Tell me about your typical week."
              step={step}
              footer={
                <PrimaryButton
                  disabled={!data.typicalWeek.trim()}
                  onClick={() => setScreen("priorities")}
                >
                  Continue
                </PrimaryButton>
              }
            >
              <TextField
                multiline
                value={data.typicalWeek}
                onChange={(value) => update({ typicalWeek: value })}
                placeholder="I work Sunday through Wednesday from 11 AM to 9 PM."
              />
            </QuestionShell>
          )}

          {screen === "priorities" && step && (
            <QuestionShell
              eyebrow="What counts"
              question="What matters most right now?"
              step={step}
              footer={
                <PrimaryButton
                  disabled={data.priorities.length === 0}
                  onClick={() => setScreen("awareness")}
                >
                  Continue
                </PrimaryButton>
              }
            >
              <ChipGrid
                options={PRIORITY_CHIPS}
                selected={data.priorities}
                onToggle={(value) =>
                  update({ priorities: toggleChip(data.priorities, value) })
                }
              />
            </QuestionShell>
          )}

          {screen === "awareness" && step && (
            <QuestionShell
              eyebrow="Staying aware"
              question="What would you like Sync to help you stay aware of?"
              step={step}
              footer={
                <PrimaryButton
                  disabled={data.awareness.length === 0}
                  onClick={() => setScreen("coming-up")}
                >
                  Continue
                </PrimaryButton>
              }
            >
              <ChipGrid
                options={AWARENESS_CHIPS}
                selected={data.awareness}
                onToggle={(value) =>
                  update({ awareness: toggleChip(data.awareness, value) })
                }
              />
            </QuestionShell>
          )}

          {screen === "coming-up" && step && (
            <QuestionShell
              eyebrow="On the horizon"
              question="Anything important coming up?"
              step={step}
              footer={
                <PrimaryButton onClick={() => setScreen("building")}>
                  Continue
                </PrimaryButton>
              }
            >
              <TextField
                multiline
                value={data.comingUp}
                onChange={(value) => update({ comingUp: value })}
                placeholder={
                  "Mom's birthday in 10 days.\nPayday Friday.\nTrip next month."
                }
              />
            </QuestionShell>
          )}

          {screen === "building" && (
            <div className="mobile-prototype-screen mobile-prototype-fade-in">
              <div className="mobile-prototype-pad-x flex h-full flex-col justify-center">
                <p
                  className="mobile-prototype-display w-full text-[2.1rem] leading-[1.05] tracking-[-0.03em]"
                  style={{ color: "var(--mp-fg)" }}
                >
                  Building your briefing...
                </p>
                <p
                  className="mobile-prototype-pulse mt-5 w-full text-[14px] leading-relaxed"
                  style={{ color: "var(--mp-fg-muted)" }}
                >
                  Sync is learning about your life.
                </p>
              </div>
            </div>
          )}

          {screen === "brief" && (
            <div className="mobile-prototype-screen mobile-prototype-fade-in">
              <div className="mobile-prototype-scroll mobile-prototype-pad-x pb-4 pt-1">
                <header className="w-full">
                  <p
                    className="mobile-prototype-display text-[2.2rem] leading-none tracking-[-0.04em]"
                    style={{ color: "var(--mp-fg)" }}
                  >
                    SYNC
                  </p>
                  <p
                    className="mobile-prototype-display mt-4 w-full text-[1.75rem] leading-[1.08] tracking-[-0.03em]"
                    style={{ color: "var(--mp-fg)" }}
                  >
                    {brief.greeting}
                  </p>
                  <p
                    className="mt-3 w-full text-[15px] leading-[1.6]"
                    style={{ color: "var(--mp-fg-muted)" }}
                  >
                    Here&apos;s what matters right now.
                  </p>
                </header>

                {brief.sections.map((section) => (
                  <BriefSection
                    key={section.title}
                    title={section.title}
                    items={section.items}
                  />
                ))}

                <section
                  className="mobile-prototype-glass mt-4 w-full rounded-[1.35rem] p-4"
                  style={{ boxShadow: "0 0 0 1px var(--mp-border)" }}
                >
                  <h3
                    className="text-[10px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "var(--mp-fg-subtle)" }}
                  >
                    What&apos;s on your mind?
                  </h3>
                  <div className="mt-4 w-full">
                    <TextField
                      multiline
                      value={captureInput}
                      onChange={setCaptureInput}
                      placeholder="Tell Sync what happened or what's coming up..."
                    />
                  </div>
                  <div className="mt-3 flex w-full flex-wrap gap-2">
                    {CAPTURE_EXAMPLES.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setCaptureInput(example)}
                        className="rounded-[0.9rem] border px-3 py-2 text-left text-[12px] leading-snug active:scale-[0.98]"
                        style={{
                          borderColor: "var(--mp-border)",
                          color: "var(--mp-fg-muted)",
                          background: "var(--mp-chip-bg)",
                        }}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                  {recentCaptures.length > 0 && (
                    <ul
                      className="mt-4 w-full space-y-2 border-t pt-4"
                      style={{ borderColor: "var(--mp-border)" }}
                    >
                      {recentCaptures.map((capture) => (
                        <li
                          key={capture}
                          className="text-[13px] leading-relaxed"
                          style={{ color: "var(--mp-fg-muted)" }}
                        >
                          {capture}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="mt-4 pb-2">
                  <GhostButton onClick={() => setScreen("welcome")}>
                    Restart
                  </GhostButton>
                </div>
              </div>

              <ScreenFooter>
                <PrimaryButton onClick={handleCapture}>Add to Sync</PrimaryButton>
              </ScreenFooter>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
