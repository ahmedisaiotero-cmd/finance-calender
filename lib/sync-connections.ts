export type ConnectionStatus = "connected" | "pending" | "disconnected";

export type LifeDomain = "calendar" | "money" | "health" | "goals";

export type DomainConnection = {
  status: ConnectionStatus | "manual";
  sourceLabel: string;
};

export type HomeConnections = Record<LifeDomain, DomainConnection>;

export const CONNECTION_EMPTY_COPY: Record<
  Exclude<LifeDomain, "goals">,
  { message: string; actionLabel: string; href: string }
> = {
  calendar: {
    message:
      "Keep using Google Calendar. Connect it here and Sync will read your schedule — only what matters for today.",
    actionLabel: "Connect Google Calendar",
    href: "/calendar",
  },
  money: {
    message:
      "Keep your accounts where they are. Connect Chase, Amex, or your bank and Sync will surface calm financial guidance.",
    actionLabel: "Connect accounts",
    href: "/finance",
  },
  health: {
    message:
      "Keep Apple Health or your tracker. Connect it and Sync will read sleep, movement, and recovery — nothing more.",
    actionLabel: "Connect health",
    href: "/fitness",
  },
};

export type HomeConnectionSignals = {
  usingLiveTimeline: boolean;
  usingDatabase: boolean;
  healthSessions: number;
  hasHealthEvents: boolean;
};

export function resolveHomeConnections(
  signals: HomeConnectionSignals,
): HomeConnections {
  const calendarConnected = signals.usingLiveTimeline;

  let moneyStatus: ConnectionStatus = "disconnected";
  let moneySource = "Connect Finance";
  if (signals.usingDatabase) {
    moneyStatus = "connected";
    moneySource = "Chase";
  } else if (signals.usingLiveTimeline) {
    moneyStatus = "pending";
    moneySource = "Connect Finance";
  }

  const healthConnected =
    signals.healthSessions > 0 ||
    (signals.usingLiveTimeline && signals.hasHealthEvents);

  return {
    calendar: {
      status: calendarConnected ? "connected" : "disconnected",
      sourceLabel: calendarConnected ? "Google Calendar" : "Connect Calendar",
    },
    money: {
      status: moneyStatus,
      sourceLabel: moneySource,
    },
    health: {
      status: healthConnected ? "connected" : "disconnected",
      sourceLabel: healthConnected ? "Apple Health" : "Connect Health",
    },
    goals: {
      status: "manual",
      sourceLabel: "Manual",
    },
  };
}

export function isDomainActive(
  connection: DomainConnection,
): connection is DomainConnection & { status: "connected" | "manual" } {
  return connection.status === "connected" || connection.status === "manual";
}

export function buildConnectedLifeLabel(connections: HomeConnections): string {
  const word = (domain: DomainConnection) => {
    if (domain.status === "manual") return "manual";
    if (domain.status === "connected") return "connected";
    if (domain.status === "pending") return "pending";
    return "not connected";
  };

  return [
    `Calendar ${word(connections.calendar)}`,
    `Finance ${word(connections.money)}`,
    `Health ${word(connections.health)}`,
    `Goals ${word(connections.goals)}`,
  ].join(" · ");
}
