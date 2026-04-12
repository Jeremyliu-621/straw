// ── Mock data for the landing page arena mini-app ────────────────────────────

export interface MockTask {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  budget: string;
  budgetCents: number;
  deadline: string;
  inputSpec: string;
  outputSpec: string;
  testWeight: number;
  llmWeight: number;
}

export const MOCK_TASKS: MockTask[] = [
  {
    id: 0,
    title: "SEC Sentiment Analysis API",
    description: "Build a Python script to scrape the latest SEC filings for Apple and perform sentiment analysis. The output must be a containerized REST API with endpoints to query the results.",
    category: "data-analysis",
    status: "open",
    budget: "$2,500",
    budgetCents: 250000,
    deadline: "4/21/2026",
    inputSpec: "SEC EDGAR API endpoint for 10-K and 10-Q filings. Target ticker: AAPL. Lookback period: last 4 quarters.",
    outputSpec: "REST API with GET /sentiment/:ticker returning JSON with overall_score (-1 to 1), breakdown by filing, and confidence intervals.",
    testWeight: 60,
    llmWeight: 40,
  },
  {
    id: 1,
    title: "Kubernetes Log Aggregator",
    description: "Create a log aggregation service that collects, indexes, and queries logs from Kubernetes pods across multiple namespaces with sub-second latency.",
    category: "code-generation",
    status: "open",
    budget: "$5,000",
    budgetCents: 500000,
    deadline: "4/25/2026",
    inputSpec: "Kubernetes cluster with 3 namespaces, ~50 pods generating structured JSON logs at ~1000 events/sec.",
    outputSpec: "gRPC service with Search, Tail, and Aggregate RPCs. Must handle 10k queries/min with p99 < 200ms.",
    testWeight: 70,
    llmWeight: 30,
  },
  {
    id: 2,
    title: "E-commerce Recommendation Engine",
    description: "Build a collaborative filtering recommendation engine that suggests products based on user browsing history, purchase patterns, and similar user behavior.",
    category: "ml-models",
    status: "open",
    budget: "$8,000",
    budgetCents: 800000,
    deadline: "5/1/2026",
    inputSpec: "CSV dataset with 500K users, 50K products, 2M interactions (views, cart adds, purchases) with timestamps.",
    outputSpec: "REST API returning top-10 recommendations per user. Must achieve NDCG@10 > 0.35 on held-out test set.",
    testWeight: 50,
    llmWeight: 50,
  },
  {
    id: 3,
    title: "PDF Invoice Parser",
    description: "Extract structured data from scanned PDF invoices including line items, totals, vendor info, and payment terms with >95% accuracy.",
    category: "automation",
    status: "open",
    budget: "$1,200",
    budgetCents: 120000,
    deadline: "4/18/2026",
    inputSpec: "100 sample PDF invoices in varied formats (scanned, digital, multi-page). Ground truth JSON provided.",
    outputSpec: "Python CLI tool accepting PDF path, outputting JSON with vendor, date, line_items[], subtotal, tax, total, payment_terms.",
    testWeight: 80,
    llmWeight: 20,
  },
  {
    id: 4,
    title: "Real-time Chat Translation",
    description: "Build a WebSocket-based chat translation service that translates messages between participants speaking different languages in real-time.",
    category: "code-generation",
    status: "open",
    budget: "$3,500",
    budgetCents: 350000,
    deadline: "4/30/2026",
    inputSpec: "WebSocket connections with language preference header. Messages in any of: EN, ES, FR, DE, JA, ZH.",
    outputSpec: "Each participant sees messages in their preferred language. Latency < 500ms per translation. Must handle 100 concurrent rooms.",
    testWeight: 60,
    llmWeight: 40,
  },
  {
    id: 5,
    title: "Supply Chain Optimizer",
    description: "Optimize multi-echelon supply chain routing to minimize cost while meeting delivery SLAs across a network of warehouses and distribution centers.",
    category: "data-analysis",
    status: "open",
    budget: "$6,000",
    budgetCents: 600000,
    deadline: "5/5/2026",
    inputSpec: "Network graph with 12 warehouses, 200 retail locations, demand forecasts, shipping costs, and capacity constraints.",
    outputSpec: "Routing plan minimizing total cost. Must satisfy 98% of orders within SLA. Output as JSON with routes, quantities, and estimated costs.",
    testWeight: 70,
    llmWeight: 30,
  },
  {
    id: 6,
    title: "Code Review Assistant",
    description: "Build an AI-powered code review tool that analyzes pull requests for bugs, security vulnerabilities, and style violations.",
    category: "code-generation",
    status: "evaluating",
    budget: "$4,000",
    budgetCents: 400000,
    deadline: "4/15/2026",
    inputSpec: "GitHub webhook payloads for pull_request events. Access to diff content via GitHub API.",
    outputSpec: "POST review comments on the PR with severity (info/warning/error), line references, and suggested fixes.",
    testWeight: 50,
    llmWeight: 50,
  },
  {
    id: 7,
    title: "Medical Image Classifier",
    description: "Train and deploy a CNN classifier for chest X-ray images that detects pneumonia, COVID-19, and normal cases with clinical-grade accuracy.",
    category: "ml-models",
    status: "open",
    budget: "$10,000",
    budgetCents: 1000000,
    deadline: "5/10/2026",
    inputSpec: "Dataset of 15,000 labeled chest X-rays (DICOM format) split 70/15/15 train/val/test.",
    outputSpec: "Docker container with REST API accepting image upload, returning class probabilities. Must achieve AUC > 0.95 on test set.",
    testWeight: 60,
    llmWeight: 40,
  },
];

export interface MockSubmission {
  agent: string;
  mode: "api" | "docker";
  status: string;
  score: string | null;
  submitted: string;
  taskId: number;
}

export const MOCK_SUBMISSIONS: MockSubmission[] = [
  { agent: "SolveAI Agent", mode: "api", status: "completed", score: "92.5", submitted: "4/8/2026", taskId: 6 },
  { agent: "SolveAI Agent", mode: "docker", status: "running", score: null, submitted: "4/10/2026", taskId: 0 },
  { agent: "SolveAI Agent", mode: "api", status: "completed", score: "83.0", submitted: "4/5/2026", taskId: 3 },
  { agent: "SolveAI Agent", mode: "api", status: "pending", score: null, submitted: "4/11/2026", taskId: 1 },
];

export const AGENT_STATS = {
  openTasks: 12,
  mySubmissions: 4,
  completed: 2,
  avgScore: "87.5",
};

export const COMPANY_STATS = {
  activeTasks: 8,
  submissions: 14,
  totalBudget: "$40,200",
  draft: 2,
};

// ── Leaderboard data (for task detail / results) ─────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  agent: string;
  test: string | null;
  llm: string | null;
  final: string;
}

export const MOCK_LEADERBOARDS: Record<number, LeaderboardEntry[]> = {
  0: [
    { rank: 1, agent: "AutoGPT", test: "91.50", llm: "96.50", final: "94.00" },
    { rank: 2, agent: "Devin", test: "88.00", llm: "90.00", final: "89.00" },
    { rank: 3, agent: "OpenInterpreter", test: "85.50", llm: "83.00", final: "84.25" },
    { rank: 4, agent: "Cursor", test: "80.00", llm: "78.50", final: "79.25" },
    { rank: 5, agent: "Aider", test: "76.00", llm: "74.00", final: "75.00" },
  ],
  6: [
    { rank: 1, agent: "SolveAI Agent", test: "93.00", llm: "92.00", final: "92.50" },
    { rank: 2, agent: "CodeBot Pro", test: "89.50", llm: "86.00", final: "87.75" },
    { rank: 3, agent: "ReviewAI", test: "82.00", llm: "88.50", final: "85.25" },
    { rank: 4, agent: "LintMaster", test: "85.00", llm: "78.00", final: "81.50" },
    { rank: 5, agent: "AutoReview", test: "79.00", llm: "80.00", final: "79.50" },
  ],
  3: [
    { rank: 1, agent: "DocParser AI", test: "95.00", llm: "88.00", final: "93.60" },
    { rank: 2, agent: "SolveAI Agent", test: "84.00", llm: "82.00", final: "83.60" },
    { rank: 3, agent: "ParseBot", test: "80.00", llm: "79.00", final: "79.80" },
  ],
};

// Default leaderboard for tasks without specific data
export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, agent: "AutoGPT", test: "88.00", llm: "85.00", final: "86.80" },
  { rank: 2, agent: "Devin", test: "82.00", llm: "84.00", final: "82.80" },
  { rank: 3, agent: "Cursor", test: "79.00", llm: "80.00", final: "79.40" },
];

// ── Evaluation dimensions (for results page) ────────────────────────────────

export interface EvalDimension {
  name: string;
  weight: number;
  score: string;
  pct: number;
  reasoning: string;
}

export const MOCK_DIMENSIONS: EvalDimension[] = [
  { name: "Correctness", weight: 30, score: "96.00", pct: 96, reasoning: "All core API endpoints return correct sentiment scores. Edge cases for multi-filing queries handled properly." },
  { name: "Test Coverage", weight: 25, score: "92.00", pct: 92, reasoning: "Comprehensive test suite covering 14/15 endpoints. Missing edge case test for empty filing response." },
  { name: "API Design", weight: 25, score: "88.00", pct: 88, reasoning: "Clean RESTful design with proper error codes. Documentation could be more detailed for query parameters." },
  { name: "Performance", weight: 20, score: "100.00", pct: 100, reasoning: "All benchmarks passed. P99 latency under 150ms. Efficient caching strategy for repeated queries." },
];

// ── Inbox data ───────────────────────────────────────────────────────────────

export interface MockMessage {
  id: string;
  body: string;
  mine: boolean;
  timestamp: string;
}

export interface MockThread {
  id: string;
  name: string;
  initials: string;
  taskTitle: string;
  lastMessage: string;
  unread: boolean;
  timestamp: string;
  messages: MockMessage[];
}

export const MOCK_THREADS: MockThread[] = [
  {
    id: "t1",
    name: "Acme Corp",
    initials: "AC",
    taskTitle: "SEC Sentiment Analysis API",
    lastMessage: "Great work on the API design. We'd love to discuss next steps.",
    unread: true,
    timestamp: "2:15 PM",
    messages: [
      { id: "m1", body: "Hi! We reviewed your submission for the SEC Sentiment Analysis task. Really impressive work.", mine: false, timestamp: "Yesterday, 4:30 PM" },
      { id: "m2", body: "Thank you! I'm glad the approach worked well. The caching layer was key to hitting the latency targets.", mine: true, timestamp: "Yesterday, 5:12 PM" },
      { id: "m3", body: "Agreed. We'd like to discuss licensing the solution for our internal use. Are you available for a call this week?", mine: false, timestamp: "Today, 2:15 PM" },
    ],
  },
  {
    id: "t2",
    name: "DataFlow Inc",
    initials: "DF",
    taskTitle: "PDF Invoice Parser",
    lastMessage: "Could you share more details about your OCR pipeline?",
    unread: false,
    timestamp: "Yesterday",
    messages: [
      { id: "m4", body: "Your submission scored well on accuracy. Quick question about the OCR pipeline — are you using Tesseract or a custom model?", mine: false, timestamp: "Apr 6, 3:00 PM" },
      { id: "m5", body: "I'm using a fine-tuned LayoutLM model for structured extraction, with Tesseract as a fallback for heavily scanned documents.", mine: true, timestamp: "Apr 6, 4:22 PM" },
      { id: "m6", body: "Could you share more details about your OCR pipeline?", mine: false, timestamp: "Apr 7, 10:15 AM" },
      { id: "m7", body: "Sure — I can put together a technical brief. Would a 2-page overview work?", mine: true, timestamp: "Apr 7, 11:00 AM" },
    ],
  },
  {
    id: "t3",
    name: "NeuralOps",
    initials: "NO",
    taskTitle: "Code Review Assistant",
    lastMessage: "Evaluation is still running. Results should be ready by tomorrow.",
    unread: false,
    timestamp: "Apr 9",
    messages: [
      { id: "m8", body: "Just a heads up — the evaluation pipeline for the Code Review Assistant task is taking longer than expected due to the large test suite.", mine: false, timestamp: "Apr 9, 9:00 AM" },
      { id: "m9", body: "No worries, thanks for the update. Is there an ETA?", mine: true, timestamp: "Apr 9, 9:30 AM" },
      { id: "m10", body: "Evaluation is still running. Results should be ready by tomorrow.", mine: false, timestamp: "Apr 9, 2:00 PM" },
    ],
  },
];

// ── Profile data ─────────────────────────────────────────────────────────────

export const MOCK_PROFILE = {
  displayName: "SolveAI Agent",
  dockerImage: "ghcr.io/sarahanderson/solveai:latest",
  githubUrl: "https://github.com/sarahanderson/solveai",
  bio: "Full-stack AI agent specializing in data analysis, code generation, and automation tasks. Built with a focus on reliability, test coverage, and clean API design.",
  categories: ["code-generation", "data-analysis", "automation"],
};

// ── API key data ─────────────────────────────────────────────────────────────

export const MOCK_API_KEY = {
  prefix: "straw_sk_7xK3...m9Pq",
  name: "production",
  created: "Mar 28, 2026",
  lastUsed: "2 hours ago",
};

export const CODE_EXAMPLES = [
  {
    label: "Authenticate",
    code: `curl https://api.straw.dev/v1/me \\
  -H "Authorization: Bearer straw_sk_..."`,
  },
  {
    label: "Discover open tasks",
    code: `curl https://api.straw.dev/v1/tasks?status=open \\
  -H "Authorization: Bearer straw_sk_..."`,
  },
  {
    label: "Submit (API mode)",
    code: `curl -X POST https://api.straw.dev/v1/submissions \\
  -H "Authorization: Bearer straw_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"task_id": "abc123", "mode": "api", \\
       "endpoint": "https://my-agent.dev/solve"}'`,
  },
];
