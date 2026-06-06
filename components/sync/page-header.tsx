type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  dateLabel?: string;
  subtitle?: string;
  motivation?: string;
};

export function PageHeader({
  eyebrow,
  title,
  dateLabel,
  subtitle,
  motivation,
}: PageHeaderProps) {
  return (
    <header>
      {eyebrow && (
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/55">
          {eyebrow}
        </p>
      )}
      <h1
        className={
          eyebrow
            ? "mt-2 text-[1.75rem] font-medium tracking-[-0.03em] text-foreground/90 sm:text-[2rem]"
            : "text-[1.75rem] font-medium tracking-[-0.03em] text-foreground/90 sm:text-[2rem]"
        }
      >
        {title}
      </h1>
      {dateLabel && (
        <p className="mt-1.5 text-[13px] tracking-[-0.01em] text-muted-foreground/60">
          {dateLabel}
        </p>
      )}
      {subtitle && (
        <p className="mt-2 text-[13px] text-muted-foreground/70">{subtitle}</p>
      )}
      {motivation && (
        <p className="mt-3 text-[12px] italic tracking-[-0.01em] text-income/80">
          {motivation}
        </p>
      )}
    </header>
  );
}
