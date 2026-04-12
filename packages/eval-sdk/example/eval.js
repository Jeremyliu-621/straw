const fs = require("fs");
const path = require("path");

const AGENT_OUTPUT = "/agent_output";
const RESULTS = "/results";

// Read all files from agent output
const files = fs.readdirSync(AGENT_OUTPUT);
let allOutput = "";
for (const file of files) {
  const filePath = path.join(AGENT_OUTPUT, file);
  if (fs.statSync(filePath).isFile()) {
    allOutput += fs.readFileSync(filePath, "utf8");
  }
}

// Evaluate: example checks for required keywords
const criteria = {
  has_output: allOutput.trim().length > 0,
  mentions_result: /result|output|answer/i.test(allOutput),
};

const scores = {
  completeness: criteria.has_output ? 100 : 0,
  quality: criteria.mentions_result ? 80 : 20,
};

const finalScore = Math.round(
  Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
);

const result = {
  score: finalScore,
  pass: finalScore >= 60,
  breakdown: scores,
  notes: `Evaluated ${files.length} output file(s). Score: ${finalScore}/100`,
};

// Write result
fs.mkdirSync(RESULTS, { recursive: true });
fs.writeFileSync(path.join(RESULTS, "score.json"), JSON.stringify(result, null, 2));
console.log("Eval complete:", JSON.stringify(result));
