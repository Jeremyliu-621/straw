/**
 * Seed script: Create "Design a Board Game" task (Weird — qualitative eval)
 *
 * This task tests whether the LLM judge can evaluate creative, non-code output.
 * There's no objectively "correct" answer — the judge must assess game design
 * quality, ruleset coherence, visual design, and playability.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(supabaseUrl, supabaseServiceKey);

const COMPANY_ID = "bb5b5819-f0e2-4f09-ae6f-53de6475f129";

async function main() {
  console.log("Creating task: Design a Board Game...\n");

  const { data: task, error: taskError } = await db
    .from("tasks")
    .insert({
      company_id: COMPANY_ID,
      title: "Design a Complete Board Game",
      description: `Design an original board game from scratch. This is a creative design challenge, not purely a coding task.

## Deliverables

### 1. Rules Document (rules.md)
A complete, unambiguous rulebook that a group of strangers could pick up and play without any external guidance. Must include:
- **Theme and objective** — what's the story? How do you win?
- **Setup** — how many players, what pieces, initial board state
- **Turn structure** — what happens on each turn, in what order
- **Core mechanics** — movement, resource management, combat, trading, card draws, dice — whatever your game uses
- **Special rules** — edge cases, tiebreakers, variant rules for different player counts
- **Example turn** — walk through one complete turn with specific board state

The rules should be internally consistent. No contradictions, no ambiguity about what happens when two rules conflict.

### 2. Board Layout (board.svg)
A printable board layout as an SVG file. Must be:
- Playable at standard letter/A4 paper size
- Visually clear — spaces, paths, zones, and labels are readable
- Thematically consistent with the rules
- Not just a grid — the layout should reflect the game's mechanics

### 3. CLI Simulator (game.py or game.ts)
A command-line program that lets 2-4 players play the game interactively:
- Displays the board state in text form
- Prompts players for decisions on their turn
- Enforces the rules (rejects illegal moves)
- Tracks score/resources/position
- Declares a winner when the game ends
- Handles all the mechanics described in the rules

The simulator doesn't need AI opponents — human players taking turns at the same terminal is fine.

### 4. SUBMISSION.md
Explain your design philosophy: why these mechanics? What makes the game interesting? What playtesting insights would you expect? How does the game scale with player count?

## What Makes a Great Submission
- **Originality** — don't clone Monopoly or Settlers of Catan. Surprise us.
- **Elegance** — simple rules that create complex, interesting decisions
- **Coherence** — theme, mechanics, and visual design should reinforce each other
- **Playability** — the game should actually be fun, not just technically complete
- **Polish** — the SVG should look good, the simulator should be pleasant to use`,
      category: "creative-design",
      input_spec: `No specific input. This is an open-ended creative challenge. The only constraint is the deliverables list above: rules document, SVG board, CLI simulator, and SUBMISSION.md.`,
      output_spec: `Four files minimum:
1. rules.md — Complete rulebook
2. board.svg — Printable board layout
3. game.py (or game.ts) — Interactive CLI simulator
4. SUBMISSION.md — Design philosophy and decisions

Additional files (card definitions, asset lists, etc.) are welcome if the game design requires them.`,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      budget_cents: 75_000,
      eval_mode: "llm",
      status: "draft",
      test_weight: 0,
      llm_weight: 100,
    })
    .select()
    .single();

  if (taskError) {
    console.error("Failed to create task:", taskError);
    process.exit(1);
  }

  console.log(`Task created: ${task.id}`);

  const criteria = [
    { task_id: task.id, name: "Game Design & Originality", description: "Is the game concept original and interesting? Are the core mechanics well-designed? Do simple rules create meaningful decisions? Is there strategic depth without overwhelming complexity? Would you actually want to play this?", weight: 30, position: 1 },
    { task_id: task.id, name: "Rules Completeness & Clarity", description: "Can a stranger play the game using only the rules document? Are all edge cases covered? Is the turn structure unambiguous? Are there contradictions? Does the example turn actually follow the stated rules?", weight: 25, position: 2 },
    { task_id: task.id, name: "CLI Simulator Correctness", description: "Does the simulator correctly implement all the rules? Does it enforce legality? Does it handle edge cases (tiebreakers, special conditions)? Is the text UI clear and usable? Does it track all game state correctly?", weight: 20, position: 3 },
    { task_id: task.id, name: "Visual Design (SVG Board)", description: "Is the board visually clear and printable? Does the layout reflect the game's mechanics? Is it thematically consistent? Would you be able to play using a printed copy?", weight: 15, position: 4 },
    { task_id: task.id, name: "Thematic Coherence & Polish", description: "Do theme, mechanics, visual design, and documentation all reinforce each other? Does the SUBMISSION.md show genuine design thinking? Is the overall package polished and complete?", weight: 10, position: 5 },
  ];

  const { error: criteriaError } = await db.from("rubric_criteria").insert(criteria);
  if (criteriaError) {
    console.error("Failed to insert criteria:", criteriaError);
    process.exit(1);
  }

  const { error: publishError } = await db
    .from("tasks")
    .update({ status: "open" })
    .eq("id", task.id);

  if (publishError) {
    console.error("Failed to publish:", publishError);
    process.exit(1);
  }

  console.log(`Published! Task ID: ${task.id}`);
  console.log(`Title: ${task.title}`);
  console.log(`Category: creative-design`);
  console.log(`Difficulty: Weird / Edge Case (qualitative eval)`);
  console.log(`Rubric: 5 criteria (Design 30%, Rules 25%, Simulator 20%, Visual 15%, Coherence 10%)`);
}

main().catch(console.error);
