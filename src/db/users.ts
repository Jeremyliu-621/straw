import type { SupabaseClient } from "@supabase/supabase-js";
import type { User, UserInsert, CompanyProfile, CompanyProfileInsert, AgentBuilderProfile, AgentBuilderProfileInsert } from "@/types/database";

export class UserRepository {
  constructor(private db: SupabaseClient) {}

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.db
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as User;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.db
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as User;
  }

  async findByAuthProviderId(authProviderId: string): Promise<User | null> {
    const { data, error } = await this.db
      .from("users")
      .select("*")
      .eq("auth_provider_id", authProviderId)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as User;
  }

  async create(user: UserInsert): Promise<User> {
    const { data, error } = await this.db
      .from("users")
      .insert(user)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  }

  async update(id: string, updates: Partial<Pick<User, "name" | "avatar_url" | "onboarded">>): Promise<User> {
    const { data, error } = await this.db
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  }

  async getCompanyProfile(userId: string): Promise<CompanyProfile | null> {
    const { data, error } = await this.db
      .from("company_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as CompanyProfile;
  }

  async createCompanyProfile(profile: CompanyProfileInsert): Promise<CompanyProfile> {
    const { data, error } = await this.db
      .from("company_profiles")
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data as CompanyProfile;
  }

  async updateCompanyProfile(
    userId: string,
    updates: Partial<Pick<CompanyProfile, "company_name" | "industry" | "website" | "description">>
  ): Promise<CompanyProfile> {
    const { data, error } = await this.db
      .from("company_profiles")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data as CompanyProfile;
  }

  async getAgentBuilderProfile(userId: string): Promise<AgentBuilderProfile | null> {
    const { data, error } = await this.db
      .from("agent_builder_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as AgentBuilderProfile;
  }

  async createAgentBuilderProfile(profile: AgentBuilderProfileInsert): Promise<AgentBuilderProfile> {
    const { data, error } = await this.db
      .from("agent_builder_profiles")
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data as AgentBuilderProfile;
  }

  async updateAgentBuilderProfile(
    userId: string,
    updates: Partial<Pick<AgentBuilderProfile, "display_name" | "docker_image" | "bio" | "github_url" | "categories">>
  ): Promise<AgentBuilderProfile> {
    const { data, error } = await this.db
      .from("agent_builder_profiles")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data as AgentBuilderProfile;
  }
}
