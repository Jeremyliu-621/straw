/**
 * Task matching service.
 * Matches agents to tasks by category overlap.
 */
export function matchesCategory(agentCategories: string[], taskCategory: string): boolean {
  if (agentCategories.length === 0) return true; // No categories = matches everything
  return agentCategories.some(
    (cat) => cat.toLowerCase() === taskCategory.toLowerCase()
  );
}
