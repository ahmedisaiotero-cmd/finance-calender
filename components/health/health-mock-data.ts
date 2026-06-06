export type WorkoutDayStatus = "done" | "planned" | "rest" | "today";

export type WeeklyWorkoutDay = {
  id: string;
  day: string;
  short: string;
  workout: string;
  detail?: string;
  status: WorkoutDayStatus;
};

export type HealthTracker = {
  label: string;
  current: number;
  target: number;
  unit: string;
};

export type RecentWorkout = {
  id: string;
  title: string;
  when: string;
  duration: string;
  calories?: number;
};

export const healthStats = {
  workoutsThisWeek: { value: 4, goal: 5, label: "Workouts this week" },
  caloriesToday: { value: 1840, goal: 2200, label: "Calories today" },
  recovery: { value: 82, label: "Recovery", hint: "Readiness score" },
};

export const weeklyWorkoutSplit: WeeklyWorkoutDay[] = [
  {
    id: "mon",
    day: "Monday",
    short: "Mon",
    workout: "Upper body strength",
    detail: "45 min · Push focus",
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
    detail: "50 min · Leg focus",
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
    workout: "Meal prep + mobility",
    detail: "Light · Recovery",
    status: "planned",
  },
];

export const todayHealthTrackers: HealthTracker[] = [
  { label: "Calories", current: 1840, target: 2200, unit: "kcal" },
  { label: "Protein", current: 98, target: 140, unit: "g" },
  { label: "Water", current: 6, target: 8, unit: "glasses" },
  { label: "Sleep", current: 7.2, target: 8, unit: "hrs" },
  { label: "Weight", current: 172, target: 170, unit: "lbs" },
];

export const recentWorkouts: RecentWorkout[] = [
  {
    id: "r1",
    title: "Strength training",
    when: "Yesterday",
    duration: "52 min",
    calories: 410,
  },
  {
    id: "r2",
    title: "Morning run",
    when: "Tue, Jun 3",
    duration: "28 min",
    calories: 285,
  },
  {
    id: "r3",
    title: "Yoga flow",
    when: "Mon, Jun 2",
    duration: "40 min",
    calories: 160,
  },
];
