import type { TimelineEvent } from "@/lib/timeline-events";

/** Display-only rows when the live timeline is sparse (structures unchanged). */
export type DashboardTodayRow = {
  id: string;
  time: string;
  title: string;
  category: TimelineEvent["lifeCategory"];
  meta?: string;
};

export type DashboardUpcomingRow = {
  id: string;
  dayLabel: string;
  dateLabel: string;
  title: string;
  category: TimelineEvent["lifeCategory"];
  meta?: string;
};

export const fallbackTodayRows: DashboardTodayRow[] = [
  {
    id: "t1",
    time: "8:30 AM",
    title: "Team standup",
    category: "career",
    meta: "15 min",
  },
  {
    id: "t2",
    time: "12:30 PM",
    title: "Leg day",
    category: "health",
    meta: "45 min",
  },
  {
    id: "t3",
    time: "6:00 PM",
    title: "Grocery run",
    category: "money",
    meta: "~$85 budgeted",
  },
  {
    id: "t4",
    time: "7:30 PM",
    title: "Call with Sam",
    category: "relationships",
    meta: "Catch up",
  },
];

export const fallbackUpcomingRows: DashboardUpcomingRow[] = [
  {
    id: "u1",
    dayLabel: "Tomorrow",
    dateLabel: "Jun 2",
    title: "Netflix subscription",
    category: "money",
    meta: "$15.99",
  },
  {
    id: "u2",
    dayLabel: "Wed",
    dateLabel: "Jun 3",
    title: "Product review deadline",
    category: "career",
    meta: "Draft due",
  },
  {
    id: "u3",
    dayLabel: "Thu",
    dateLabel: "Jun 4",
    title: "Morning run",
    category: "health",
    meta: "5 km",
  },
  {
    id: "u4",
    dayLabel: "Fri",
    dateLabel: "Jun 5",
    title: "Rent payment",
    category: "money",
    meta: "$1,450",
  },
  {
    id: "u5",
    dayLabel: "Sat",
    dateLabel: "Jun 6",
    title: "Hike with Alex",
    category: "relationships",
    meta: "All day",
  },
  {
    id: "u6",
    dayLabel: "Sun",
    dateLabel: "Jun 7",
    title: "Weekly planning",
    category: "personal",
    meta: "30 min",
  },
];

export const moneySnapshot = {
  spent: 2847,
  budget: 4000,
  label: "May 2026",
};

export const healthSnapshot = {
  activeDays: 4,
  goalDays: 5,
  minutes: 135,
  label: "This week",
};

export const careerSnapshot = {
  tasksDue: 2,
  label: "This week",
  nextUp: "Product review · Wed",
};
