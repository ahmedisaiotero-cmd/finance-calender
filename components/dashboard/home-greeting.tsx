type HomeGreetingProps = {
  greeting: string;
};

export function HomeGreeting({ greeting }: HomeGreetingProps) {
  return (
    <header className="sync-home-greeting">
      <h1 className="text-[1.75rem] font-medium tracking-[-0.035em] text-foreground/95 sm:text-[2rem]">
        {greeting}
      </h1>
    </header>
  );
}
