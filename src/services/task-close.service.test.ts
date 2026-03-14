import { describe, it, expect, vi, beforeEach } from "vitest";
import { closeExpiredTask } from "./task-close.service";

// Mock supabase
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockSingle = vi.fn();

const mockDb = {
  from: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
  })),
};

mockSelect.mockReturnValue({
  eq: mockEq,
});

mockEq.mockReturnValue({
  single: mockSingle,
  eq: mockEq,
  in: mockIn,
});

mockIn.mockReturnValue({
  single: mockSingle,
});

mockUpdate.mockReturnValue({
  eq: mockEq,
});

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockDb,
}));

describe("closeExpiredTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: task not found
    mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
  });

  it("returns error when task not found", async () => {
    const result = await closeExpiredTask("nonexistent");
    expect(result.closed).toBe(false);
    expect(result.error).toBe("Task not found");
  });

  it("returns closed=true when task already closed", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "t1", status: "closed", deadline: "2024-01-01T00:00:00Z" },
      error: null,
    });

    const result = await closeExpiredTask("t1");
    expect(result.closed).toBe(true);
  });

  it("returns error when deadline has not passed", async () => {
    const futureDeadline = new Date(Date.now() + 86400000).toISOString();
    mockSingle.mockResolvedValueOnce({
      data: { id: "t1", status: "open", deadline: futureDeadline },
      error: null,
    });

    const result = await closeExpiredTask("t1");
    expect(result.closed).toBe(false);
    expect(result.error).toBe("Deadline has not passed");
  });

  it("ignores draft tasks", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "t1", status: "draft", deadline: "2024-01-01T00:00:00Z" },
      error: null,
    });

    const result = await closeExpiredTask("t1");
    expect(result.closed).toBe(false);
  });
});
