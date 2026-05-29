export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_key: string
          id: string
          profile_id: string | null
          unlocked_at: string
        }
        Insert: {
          achievement_key: string
          id?: string
          profile_id?: string | null
          unlocked_at?: string
        }
        Update: {
          achievement_key?: string
          id?: string
          profile_id?: string | null
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      base_modules: {
        Row: {
          built_at: string
          household_id: string | null
          id: string
          level: number
          module_type: string
        }
        Insert: {
          built_at?: string
          household_id?: string | null
          id?: string
          level?: number
          module_type: string
        }
        Update: {
          built_at?: string
          household_id?: string | null
          id?: string
          level?: number
          module_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_modules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_templates: {
        Row: {
          category: string
          description: string | null
          energy_reward: number
          food_reward: number
          id: string
          knowledge_reward: number
          money_reward: number
          morale_reward: number
          points_reward: number
          recurrence: string
          story_chapter: number | null
          title: string
        }
        Insert: {
          category: string
          description?: string | null
          energy_reward?: number
          food_reward?: number
          id?: string
          knowledge_reward?: number
          money_reward?: number
          morale_reward?: number
          points_reward: number
          recurrence: string
          story_chapter?: number | null
          title: string
        }
        Update: {
          category?: string
          description?: string | null
          energy_reward?: number
          food_reward?: number
          id?: string
          knowledge_reward?: number
          money_reward?: number
          morale_reward?: number
          points_reward?: number
          recurrence?: string
          story_chapter?: number | null
          title?: string
        }
        Relationships: []
      }
      chores: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          energy_reward: number
          food_reward: number
          household_id: string | null
          id: string
          knowledge_reward: number
          money_reward: number
          morale_reward: number
          points_reward: number
          recurrence: string
          status: string
          template_id: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          energy_reward?: number
          food_reward?: number
          household_id?: string | null
          id?: string
          knowledge_reward?: number
          money_reward?: number
          morale_reward?: number
          points_reward?: number
          recurrence?: string
          status?: string
          template_id?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          energy_reward?: number
          food_reward?: number
          household_id?: string | null
          id?: string
          knowledge_reward?: number
          money_reward?: number
          morale_reward?: number
          points_reward?: number
          recurrence?: string
          status?: string
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "chore_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      discovered_sectors: {
        Row: {
          arrives_at: string
          combat_outcome: Json | null
          departs_at: string
          explorer_id: string | null
          household_id: string | null
          id: string
          resource_yield: Json | null
          sector_id: string | null
          status: string
        }
        Insert: {
          arrives_at: string
          combat_outcome?: Json | null
          departs_at: string
          explorer_id?: string | null
          household_id?: string | null
          id?: string
          resource_yield?: Json | null
          sector_id?: string | null
          status?: string
        }
        Update: {
          arrives_at?: string
          combat_outcome?: Json | null
          departs_at?: string
          explorer_id?: string | null
          household_id?: string | null
          id?: string
          resource_yield?: Json | null
          sector_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovered_sectors_explorer_id_fkey"
            columns: ["explorer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovered_sectors_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovered_sectors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      game_state: {
        Row: {
          ammo: number
          created_at: string
          current_chapter: number
          energy: number
          food: number
          fuel: number
          household_id: string | null
          id: string
          intel: number
          knowledge: number
          last_idle_tick: string
          medicine: number
          money: number
          morale: number
          steel: number
        }
        Insert: {
          ammo?: number
          created_at?: string
          current_chapter?: number
          energy?: number
          food?: number
          fuel?: number
          household_id?: string | null
          id?: string
          intel?: number
          knowledge?: number
          last_idle_tick?: string
          medicine?: number
          money?: number
          morale?: number
          steel?: number
        }
        Update: {
          ammo?: number
          created_at?: string
          current_chapter?: number
          energy?: number
          food?: number
          fuel?: number
          household_id?: string | null
          id?: string
          intel?: number
          knowledge?: number
          last_idle_tick?: string
          medicine?: number
          money?: number
          morale?: number
          steel?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_state_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          invite_code: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          household_id: string | null
          id: string
          is_leader: boolean
          level: number
          points: number
          role: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          household_id?: string | null
          id: string
          is_leader?: boolean
          level?: number
          points?: number
          role?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          household_id?: string | null
          id?: string
          is_leader?: boolean
          level?: number
          points?: number
          role?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          household_id: string | null
          id: string
          in_game_bonus: Json | null
          points_cost: number
          reward_type: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          household_id?: string | null
          id?: string
          in_game_bonus?: Json | null
          points_cost?: number
          reward_type?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          household_id?: string | null
          id?: string
          in_game_bonus?: Json | null
          points_cost?: number
          reward_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          biome: string
          description: string | null
          id: string
          lore: string | null
          name: string
          threat_level: number
          unlock_chapter: number
        }
        Insert: {
          biome: string
          description?: string | null
          id?: string
          lore?: string | null
          name: string
          threat_level?: number
          unlock_chapter?: number
        }
        Update: {
          biome?: string
          description?: string | null
          id?: string
          lore?: string | null
          name?: string
          threat_level?: number
          unlock_chapter?: number
        }
        Relationships: []
      }
      story_events: {
        Row: {
          chapter: number
          event_key: string
          household_id: string | null
          id: string
          read_by: string[]
          triggered_at: string
        }
        Insert: {
          chapter: number
          event_key: string
          household_id?: string | null
          id?: string
          read_by?: string[]
          triggered_at?: string
        }
        Update: {
          chapter?: number
          event_key?: string
          household_id?: string | null
          id?: string
          read_by?: string[]
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_household_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
