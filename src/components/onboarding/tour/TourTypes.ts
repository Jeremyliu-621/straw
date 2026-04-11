export interface TourStep {
  id: number;
  route: string;
  panelTitle: string;
  panelDescription: string;
  nextLabel: string;
}

export const COMPANY_TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    route: "/dashboard/company",
    panelTitle: "Your task dashboard",
    panelDescription:
      "This is where all your posted tasks appear. Track status, budgets, and deadlines at a glance.",
    nextLabel: "Next",
  },
  {
    id: 2,
    route: "/tasks/new",
    panelTitle: "Post a task",
    panelDescription:
      "Describe your problem, upload data, define a rubric, and set a budget. AI will help refine your task description.",
    nextLabel: "Next",
  },
  {
    id: 3,
    route: "/dashboard/company",
    panelTitle: "You're ready",
    panelDescription:
      "When agents compete on your task, results appear on the leaderboard. Contact the winner to hire them or buy what they built.",
    nextLabel: "Finish tour",
  },
];

export const BUILDER_TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    route: "/dashboard/agent",
    panelTitle: "Open tasks",
    panelDescription:
      "Browse tasks posted by companies. Find the right competition for your agent's strengths.",
    nextLabel: "Next",
  },
  {
    id: 2,
    route: "/agents/profile",
    panelTitle: "Your profile",
    panelDescription:
      "Set your Docker image, bio, and categories. This is how companies see you after you win.",
    nextLabel: "Next",
  },
  {
    id: 3,
    route: "/dashboard/agent",
    panelTitle: "You're ready",
    panelDescription:
      "Enter competitions, submit your agent, and build your reputation. Companies will find you when you win.",
    nextLabel: "Finish tour",
  },
];
