/**
 * Agent builder service
 * Handles agent profiles, validation, and category matching
 */

import { AgentBuilder, Task } from "@/types/database";
import { TASK_CONFIG } from "@/constants";

/**
 * Validate Docker image URL format
 * Accepts: docker.io/user/image:tag, ghcr.io/user/image, etc.
 */
export function validateDockerImageUrl(url: string): boolean {
  try {
    // Must be a valid URL
    new URL(url);
    // Should contain image name with optional tag
    const path = new URL(url).pathname;
    return path.length > 1;
  } catch {
    return false;
  }
}

/**
 * Check if agent is eligible for a task based on category matching
 */
export function isAgentEligibleForTask(
  agentCategories: string[],
  taskCategory: string
): boolean {
  return agentCategories.includes(taskCategory);
}

/**
 * Get all tasks an agent is eligible for
 */
export function getEligibleTasks(
  agentCategories: string[],
  allTasks: Task[]
): Task[] {
  return allTasks.filter(
    (task) =>
      task.status === "open" && // Only open tasks
      isAgentEligibleForTask(agentCategories, task.category)
  );
}

/**
 * Calculate agent reputation score
 */
export function calculateReputation(agent: {
  tasks_attempted: number;
  tasks_won: number;
  average_score: number;
}): number {
  if (agent.tasks_attempted === 0) {
    return 0;
  }

  const winRate = (agent.tasks_won / agent.tasks_attempted) * 100;
  const scoreComponent = agent.average_score;
  const winRateComponent = Math.min(winRate * 0.5, 50); // Cap win rate at 50 points

  // Reputation = (average score) + (win rate bonus)
  return Math.round((scoreComponent + winRateComponent) * 10) / 10;
}

/**
 * Derive specializations (categories) from past wins
 */
export function deriveSpecializations(
  wins: Array<{ category: string }>
): string[] {
  const categoryCounts = new Map<string, number>();

  for (const win of wins) {
    categoryCounts.set(
      win.category,
      (categoryCounts.get(win.category) || 0) + 1
    );
  }

  // Return categories sorted by win count
  return Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0]);
}

/**
 * Validate agent profile data
 */
export function validateAgentProfile(agent: Partial<AgentBuilder>): string[] {
  const errors: string[] = [];

  if (!agent.display_name || agent.display_name.length < 2) {
    errors.push("Display name must be at least 2 characters");
  }

  if (agent.display_name && agent.display_name.length > 50) {
    errors.push("Display name must be at most 50 characters");
  }

  if (agent.bio && agent.bio.length > 500) {
    errors.push("Bio must be at most 500 characters");
  }

  if (!agent.docker_image_url) {
    errors.push("Docker image URL is required");
  } else if (!validateDockerImageUrl(agent.docker_image_url)) {
    errors.push("Invalid Docker image URL format");
  }

  if (!agent.categories || agent.categories.length === 0) {
    errors.push("Must select at least one category");
  } else if (agent.categories.length > 5) {
    errors.push("Can select at most 5 categories");
  } else {
    // Validate each category is valid
    for (const cat of agent.categories) {
      if (!TASK_CONFIG.CATEGORIES.includes(cat as any)) {
        errors.push(`Invalid category: ${cat}`);
      }
    }
  }

  return errors;
}

/**
 * Format agent profile for response
 */
export function formatAgentProfile(agent: AgentBuilder & { user?: any }) {
  return {
    id: agent.id,
    display_name: agent.display_name,
    bio: agent.bio,
    categories: agent.categories,
    reputation_score: agent.reputation_score,
    tasks_attempted: agent.tasks_attempted,
    tasks_won: agent.tasks_won,
    average_score: agent.average_score,
    created_at: agent.created_at,
    user: agent.user
      ? {
          email: agent.user.email,
        }
      : undefined,
  };
}

/**
 * Check if agent has already submitted to a task
 */
export function hasAgentSubmitted(
  agentId: string,
  submissions: Array<{ agent_builder_id: string }>
): boolean {
  return submissions.some((s) => s.agent_builder_id === agentId);
}
