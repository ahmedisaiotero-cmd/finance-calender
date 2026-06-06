import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Car,
  Heart,
  Home,
  Palette,
  PawPrint,
  Plane,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";

export type ComingSoonArea = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

/** Future life areas — Settings only, never in the main sidebar. */
export const COMING_SOON_AREAS: ComingSoonArea[] = [
  {
    id: "pets",
    label: "Pets",
    description: "Care routines, vet visits, and daily needs for your companions.",
    icon: PawPrint,
  },
  {
    id: "family",
    label: "Family",
    description: "Shared schedules and the moments that keep your household in sync.",
    icon: Users,
  },
  {
    id: "relationships",
    label: "Relationships",
    description: "Important dates and gentle reminders for the people who matter.",
    icon: Heart,
  },
  {
    id: "travel",
    label: "Travel",
    description: "Trips, itineraries, and time away without losing your rhythm.",
    icon: Plane,
  },
  {
    id: "home-space",
    label: "Home",
    description: "Maintenance, projects, and the place you return to each day.",
    icon: Home,
  },
  {
    id: "learning",
    label: "Learning",
    description: "Courses, skills, and curiosity beyond formal school.",
    icon: BookOpen,
  },
  {
    id: "hobbies",
    label: "Hobbies",
    description: "Creative time and personal pursuits that refill your energy.",
    icon: Palette,
  },
  {
    id: "community",
    label: "Community",
    description: "Groups, volunteering, and belonging outside work and home.",
    icon: UsersRound,
  },
  {
    id: "spirituality",
    label: "Spirituality",
    description: "Reflection, practice, and intentional space for inner life.",
    icon: Sparkles,
  },
  {
    id: "vehicles",
    label: "Vehicles",
    description: "Registration, service, and the logistics of getting around.",
    icon: Car,
  },
];
