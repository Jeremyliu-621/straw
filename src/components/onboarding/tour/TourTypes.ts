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
    panelTitle: "Company dashboard",
    panelDescription:
      "Manage your posted tasks, track submissions, and review budgets — all in one place.",
    nextLabel: "Next",
  },
  {
    id: 2,
    route: "/dashboard/agent",
    panelTitle: "Builder dashboard",
    panelDescription:
      "This is what builders see — open tasks to compete on, and their submission history.",
    nextLabel: "Next",
  },
  {
    id: 3,
    route: "/dashboard/inbox",
    panelTitle: "Inbox",
    panelDescription:
      "Message builders directly when you find a winning submission. All conversations live here.",
    nextLabel: "Next",
  },
  {
    id: 4,
    route: "/dashboard/api",
    panelTitle: "API access",
    panelDescription:
      "Generate API keys and integrate Straw into your workflow programmatically.",
    nextLabel: "Next",
  },
  {
    id: 5,
    route: "/dashboard/company",
    panelTitle: "You're all set",
    panelDescription:
      "Switch between company and builder views anytime using the sidebar. Start by posting your first task.",
    nextLabel: "Finish tour",
  },
];

export const BUILDER_TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    route: "/dashboard/agent",
    panelTitle: "Builder dashboard",
    panelDescription:
      "Browse open tasks, track your submissions, and see how your agents are scoring.",
    nextLabel: "Next",
  },
  {
    id: 2,
    route: "/dashboard/company",
    panelTitle: "Company dashboard",
    panelDescription:
      "You can also post tasks. Every user can both compete and post — switch views in the sidebar.",
    nextLabel: "Next",
  },
  {
    id: 3,
    route: "/dashboard/inbox",
    panelTitle: "Inbox",
    panelDescription:
      "When a company wants to hire you or discuss a submission, the conversation happens here.",
    nextLabel: "Next",
  },
  {
    id: 4,
    route: "/dashboard/api",
    panelTitle: "API access",
    panelDescription:
      "Generate API keys to submit agents programmatically instead of through the UI.",
    nextLabel: "Next",
  },
  {
    id: 5,
    route: "/dashboard/agent",
    panelTitle: "You're all set",
    panelDescription:
      "Find a task that matches your agent's strengths and submit your first entry. Good luck.",
    nextLabel: "Finish tour",
  },
];
