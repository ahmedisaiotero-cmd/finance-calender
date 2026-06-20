"use client";

export function SyncBrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div className={`sync-brand-mark sync-brand-mark--${size}`} aria-hidden>
      <span className="sync-brand-glyph" />
      <span className="sync-brand-word mobile-prototype-display">Sync</span>
    </div>
  );
}

export function SyncScreenBrand() {
  return (
    <div className="sync-screen-brand">
      <SyncBrandMark size="sm" />
    </div>
  );
}

export function SyncPrimaryButton({
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
      className="sync-primary-button"
    >
      {children}
    </button>
  );
}

export function SyncGhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="sync-ghost-button">
      {children}
    </button>
  );
}

export function SyncProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="sync-progress" aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} data-active={index < current} />
      ))}
    </div>
  );
}

export function SyncChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="sync-chip-grid">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className="sync-chip"
            data-active={active}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function SyncTextField({
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
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="sync-text-field sync-text-field--multiline"
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="sync-text-field"
    />
  );
}

export function OnboardingShell({
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
    <div className="sync-onboarding-screen">
      <div className="sync-onboarding-scroll mobile-prototype-pad-x">
        <SyncBrandMark size="sm" />
        <SyncProgress current={step.current} total={step.total} />
        <p className="sync-onboarding-eyebrow">{eyebrow}</p>
        <h2 className="sync-onboarding-question mobile-prototype-display">
          {question}
        </h2>
        <div className="sync-onboarding-body">{children}</div>
      </div>
      <footer className="sync-onboarding-footer mobile-prototype-pad-x">
        {footer}
      </footer>
    </div>
  );
}
