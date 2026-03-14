import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRepository } from "./users";

function mockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  const client = {
    from: vi.fn(() => chain),
  };
  return { client, chain };
}

describe("UserRepository", () => {
  let repo: UserRepository;
  let mock: ReturnType<typeof mockSupabase>;

  beforeEach(() => {
    mock = mockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new UserRepository(mock.client as any);
  });

  describe("findById", () => {
    it("returns user when found", async () => {
      const user = { id: "u1", email: "test@test.com", name: "Test", role: "company" };
      mock.chain.single.mockResolvedValue({ data: user, error: null });

      const result = await repo.findById("u1");
      expect(result).toEqual(user);
      expect(mock.client.from).toHaveBeenCalledWith("users");
      expect(mock.chain.eq).toHaveBeenCalledWith("id", "u1");
    });

    it("returns null when not found", async () => {
      mock.chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await repo.findById("nonexistent");
      expect(result).toBeNull();
    });

    it("throws on unexpected error", async () => {
      mock.chain.single.mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      });

      await expect(repo.findById("u1")).rejects.toThrow();
    });
  });

  describe("findByEmail", () => {
    it("returns user by email", async () => {
      const user = { id: "u1", email: "test@test.com" };
      mock.chain.single.mockResolvedValue({ data: user, error: null });

      const result = await repo.findByEmail("test@test.com");
      expect(result).toEqual(user);
      expect(mock.chain.eq).toHaveBeenCalledWith("email", "test@test.com");
    });
  });

  describe("create", () => {
    it("creates a user and returns it", async () => {
      const input = {
        email: "new@test.com",
        name: "New User",
        role: "company" as const,
        auth_provider_id: "auth-123",
      };
      const created = { id: "u2", ...input };
      mock.chain.single.mockResolvedValue({ data: created, error: null });

      const result = await repo.create(input);
      expect(result).toEqual(created);
      expect(mock.chain.insert).toHaveBeenCalledWith(input);
    });

    it("throws on insert error", async () => {
      mock.chain.single.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key" },
      });

      await expect(
        repo.create({
          email: "dup@test.com",
          name: "Dup",
          role: "company",
          auth_provider_id: "auth-dup",
        })
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("updates user fields", async () => {
      const updated = { id: "u1", name: "Updated" };
      mock.chain.single.mockResolvedValue({ data: updated, error: null });

      const result = await repo.update("u1", { name: "Updated" });
      expect(result).toEqual(updated);
      expect(mock.chain.update).toHaveBeenCalledWith({ name: "Updated" });
    });
  });

  describe("getCompanyProfile", () => {
    it("returns profile when found", async () => {
      const profile = { id: "p1", user_id: "u1", company_name: "Test Corp" };
      mock.chain.single.mockResolvedValue({ data: profile, error: null });

      const result = await repo.getCompanyProfile("u1");
      expect(result).toEqual(profile);
      expect(mock.client.from).toHaveBeenCalledWith("company_profiles");
    });

    it("returns null when not found", async () => {
      mock.chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await repo.getCompanyProfile("u1");
      expect(result).toBeNull();
    });
  });

  describe("createCompanyProfile", () => {
    it("creates profile", async () => {
      const input = { user_id: "u1", company_name: "Test Corp" };
      const created = { id: "p1", ...input };
      mock.chain.single.mockResolvedValue({ data: created, error: null });

      const result = await repo.createCompanyProfile(input);
      expect(result).toEqual(created);
    });
  });

  describe("getAgentBuilderProfile", () => {
    it("returns profile when found", async () => {
      const profile = { id: "p1", user_id: "u1", display_name: "Agent" };
      mock.chain.single.mockResolvedValue({ data: profile, error: null });

      const result = await repo.getAgentBuilderProfile("u1");
      expect(result).toEqual(profile);
      expect(mock.client.from).toHaveBeenCalledWith("agent_builder_profiles");
    });
  });
});
