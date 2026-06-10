export type SyncUserContext = {
  workSchedule?: {
    days: string[];
    startTime?: string;
    endTime?: string;
  };
  paySchedule?: {
    frequency: "weekly" | "biweekly" | "monthly";
    day?: string;
    nextPayDate?: string;
  };
  goals?: {
    id: string;
    title: string;
    area: "finance" | "health" | "work" | "school" | "personal";
    target?: string;
  }[];
  routines?: {
    id: string;
    title: string;
    area: "health" | "work" | "goals" | "personal";
    days?: string[];
    timeOfDay?: string;
  }[];
};

export const MOCK_SYNC_USER_CONTEXT: SyncUserContext = {
  goals: [
    {
      id: "sync-project",
      title: "Sync project",
      area: "personal",
    },
    {
      id: "savings-buffer",
      title: "Savings buffer",
      area: "finance",
    },
  ],
  routines: [
    {
      id: "gym-rhythm",
      title: "Gym",
      area: "health",
      days: ["MO", "WE", "FR"],
      timeOfDay: "evening",
    },
    {
      id: "project-block",
      title: "Project work",
      area: "goals",
      days: ["FR"],
      timeOfDay: "evening",
    },
  ],
};
