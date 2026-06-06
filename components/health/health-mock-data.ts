export type WorkoutDayStatus = "done" | "planned" | "rest" | "today";

export type WeeklyWorkoutDay = {
  id: string;
  day: string;
  short: string;
  workout: string;
  detail?: string;
  status: WorkoutDayStatus;
};

export type HealthBasics = {
  sleep: {
    lastNight: number;
    target: number;
    insight: string;
  };
  movement: {
    steps: number;
    stepsTarget: number;
    activeMinutes: number;
    activeMinutesTarget: number;
    workoutLabel: string;
  };
  protein: { current: number; target: number; unit: string };
  water: { current: number; target: number; unit: string };
  recovery: { percent: number; state: string; hint: string };
};

export type RecentWorkout = {
  id: string;
  title: string;
  when: string;
  duration: string;
};

export const healthStats = {
  workoutsThisWeek: { value: 4, goal: 5, label: "Workouts this week" },
  recovery: { value: 72, label: "Recovery", hint: "Readiness guidance" },
};

export const healthBasics: HealthBasics = {
  sleep: {
    lastNight: 6.4,
    target: 8,
    insight: "Light sleep — protect your evening.",
  },
  movement: {
    steps: 6200,
    stepsTarget: 10000,
    activeMinutes: 22,
    activeMinutesTarget: 30,
    workoutLabel: "Active recovery · yoga flow",
  },
  protein: { current: 98, target: 140, unit: "g" },
  water: { current: 6, target: 8, unit: "glasses" },
  recovery: {
    percent: 72,
    state: "Steady",
    hint: "Enough to support your goals today",
  },
};

export const weeklyWorkoutSplit: WeeklyWorkoutDay[] = [
  {
    id: "mon",
    day: "Monday",
    short: "Mon",
    workout: "Upper body strength",
    detail: "45 min · Completed",
    status: "done",
  },
  {
    id: "tue",
    day: "Tuesday",
    short: "Tue",
    workout: "Morning run",
    detail: "30 min · Easy pace",
    status: "done",
  },
  {
    id: "wed",
    day: "Wednesday",
    short: "Wed",
    workout: "Active recovery",
    detail: "Yoga flow · 40 min",
    status: "today",
  },
  {
    id: "thu",
    day: "Thursday",
    short: "Thu",
    workout: "Lower body strength",
    detail: "50 min · Planned",
    status: "planned",
  },
  {
    id: "fri",
    day: "Friday",
    short: "Fri",
    workout: "Rest day",
    detail: "Walk + stretch",
    status: "rest",
  },
  {
    id: "sat",
    day: "Saturday",
    short: "Sat",
    workout: "Long run",
    detail: "5 km · Outdoor",
    status: "planned",
  },
  {
    id: "sun",
    day: "Sunday",
    short: "Sun",
    workout: "Mobility + meal prep",
    detail: "Light · Recovery",
    status: "planned",
  },
];

/** @deprecated Use healthBasics — kept for calendar/home protein focus */
export const todayHealthTrackers = [
  {
    label: "Protein",
    current: healthBasics.protein.current,
    target: healthBasics.protein.target,
    unit: healthBasics.protein.unit,
  },
];

export const recentWorkouts: RecentWorkout[] = [
  {
    id: "r1",
    title: "Strength training",
    when: "Yesterday",
    duration: "52 min",
  },
  {
    id: "r2",
    title: "Morning run",
    when: "Tue, Jun 3",
    duration: "28 min",
  },
  {
    id: "r3",
    title: "Yoga flow",
    when: "Mon, Jun 2",
    duration: "40 min",
  },
];
