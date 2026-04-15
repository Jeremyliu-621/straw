/**
 * Seed script: Create "Sonnet Generator" task (Weird — purely qualitative eval)
 *
 * Zero code requirements. Tests whether the LLM judge can evaluate
 * creative writing: meter, rhyme scheme, imagery, emotional resonance.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(supabaseUrl, supabaseServiceKey);

const COMPANY_ID = "bb5b5819-f0e2-4f09-ae6f-53de6475f129";

async function main() {
  console.log("Creating task: Sonnet Generator...\n");

  const { data: task, error: taskError } = await db
    .from("tasks")
    .insert({
      company_id: COMPANY_ID,
      title: "Build a Shakespearean Sonnet Generator",
      description: `Build a program that generates original Shakespearean sonnets on any given topic.

## What is a Shakespearean Sonnet?
- 14 lines of iambic pentameter (10 syllables per line, alternating unstressed/stressed)
- Rhyme scheme: ABAB CDCD EFEF GG
- Three quatrains developing an argument or theme
- A final couplet that delivers a twist, resolution, or epigram
- Volta (turn) typically at or before line 9

## Requirements

### The Generator
A command-line program that takes a topic as input and outputs a sonnet:
\`\`\`
$ python sonnet.py "the passage of time"
\`\`\`

### Quality Bar
The output must be:
- **Metrically correct**: Lines should scan as iambic pentameter. Not every line must be perfect (Shakespeare himself varied the meter), but the predominant rhythm must be iambic pentameter.
- **Rhyming**: The ABAB CDCD EFEF GG scheme must be followed. Slant rhymes are acceptable where full rhymes would force awkward phrasing. Eye rhymes (love/move) count.
- **Coherent**: The sonnet must be about the given topic. Not word salad. Each quatrain should develop the theme, and the couplet should land.
- **Evocative**: Use concrete imagery, metaphor, allusion. Avoid cliches ("roses are red" tier). The sonnet should make the reader feel something.

### Deliverables
1. \`sonnet.py\` (or any language) — the generator
2. \`samples/\` directory — at least 5 pre-generated sonnets on different topics:
   - "the passage of time"
   - "unrequited love"
   - "artificial intelligence"
   - "a city at night"
   - "the ocean"
3. \`SUBMISSION.md\` — explain your approach to meter, rhyme, coherence, and creativity
4. \`README.md\` — how to run it

### What We're Really Evaluating
This is not a code quality contest. We care about the OUTPUT — the sonnets themselves. The code is just the means. A hacky script that produces beautiful sonnets beats clean code that produces mediocre verse.

We will evaluate the 5 sample sonnets plus generate 2 additional sonnets on surprise topics.`,
      category: "creative-writing",
      input_spec: `A single string: the topic for the sonnet. Examples: "the passage of time", "artificial intelligence", "a city at night".`,
      output_spec: `A Shakespearean sonnet (14 lines, iambic pentameter, ABAB CDCD EFEF GG rhyme scheme) on the given topic. Must be original, coherent, and evocative.`,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      budget_cents: 50_000,
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

  const criteria = [
    { task_id: task.id, name: "Meter & Form", description: "Do the sonnets scan as iambic pentameter? Is the ABAB CDCD EFEF GG rhyme scheme followed? Are there exactly 14 lines? Are variations in meter intentional and effective, or just wrong?", weight: 30, position: 1 },
    { task_id: task.id, name: "Imagery & Language", description: "Does the poet use concrete imagery, metaphor, and allusion? Is the language evocative? Does it avoid cliches? Is word choice precise and surprising?", weight: 25, position: 2 },
    { task_id: task.id, name: "Coherence & Structure", description: "Does each quatrain develop the theme? Does the volta work? Does the couplet land? Is there an argument or emotional arc across the 14 lines?", weight: 25, position: 3 },
    { task_id: task.id, name: "Range & Consistency", description: "Are the 5 sample sonnets consistently good across different topics? Can the generator handle both abstract ('time') and concrete ('a city at night') subjects? Does quality vary wildly or stay high?", weight: 10, position: 4 },
    { task_id: task.id, name: "Documentation & Approach", description: "Does the SUBMISSION.md explain the approach to meter, rhyme, and creativity? Is it honest about limitations? Does the README work?", weight: 10, position: 5 },
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
  console.log(`Category: creative-writing`);
  console.log(`Difficulty: Weird (purely qualitative)`);
  console.log(`Rubric: Meter 30%, Imagery 25%, Coherence 25%, Range 10%, Docs 10%`);
}

main().catch(console.error);
