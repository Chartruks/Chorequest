export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      households: {
        Row: { created_at: string | null; created_by: string | null; id: string; invite_code: string; name: string }
        Insert: { created_at?: string | null; created_by?: string | null; id?: string; invite_code: string; name: string }
        Update: { created_at?: string | null; created_by?: string | null; id?: string; invite_code?: string; name?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null; character_type: string; created_at: string | null
          household_id: string | null; id: string; is_leader: boolean
          last_monster_attack: string; level: number; monster_hp: number
          player_hp: number; player_max_hp: number; points: number
          role: string | null; tower_floor: number; username: string | null; xp: number
        }
        Insert: {
          avatar_url?: string | null; character_type?: string; created_at?: string | null
          household_id?: string | null; id: string; is_leader?: boolean
          last_monster_attack?: string; level?: number; monster_hp?: number
          player_hp?: number; player_max_hp?: number; points?: number
          role?: string | null; tower_floor?: number; username?: string | null; xp?: number
        }
        Update: {
          avatar_url?: string | null; character_type?: string; created_at?: string | null
          household_id?: string | null; id?: string; is_leader?: boolean
          last_monster_attack?: string; level?: number; monster_hp?: number
          player_hp?: number; player_max_hp?: number; points?: number
          role?: string | null; tower_floor?: number; username?: string | null; xp?: number
        }
        Relationships: [{ foreignKeyName: "profiles_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      chores: {
        Row: {
          assigned_to: string | null; category: string; created_at: string | null
          created_by: string | null; damage_reward: number; description: string | null
          due_date: string | null; household_id: string | null; id: string
          points_reward: number; recurrence: string; status: string
          template_id: string | null; title: string; xp_reward: number
        }
        Insert: {
          assigned_to?: string | null; category?: string; created_at?: string | null
          created_by?: string | null; damage_reward?: number; description?: string | null
          due_date?: string | null; household_id?: string | null; id?: string
          points_reward?: number; recurrence?: string; status?: string
          template_id?: string | null; title: string; xp_reward?: number
        }
        Update: {
          assigned_to?: string | null; category?: string; created_at?: string | null
          created_by?: string | null; damage_reward?: number; description?: string | null
          due_date?: string | null; household_id?: string | null; id?: string
          points_reward?: number; recurrence?: string; status?: string
          template_id?: string | null; title?: string; xp_reward?: number
        }
        Relationships: [
          { foreignKeyName: "chores_assigned_to_fkey"; columns: ["assigned_to"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "chores_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "chores_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] },
          { foreignKeyName: "chores_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "chore_templates"; referencedColumns: ["id"] }
        ]
      }
      chore_templates: {
        Row: {
          category: string; damage_reward: number; description: string | null
          id: string; points_reward: number; recurrence: string; title: string; xp_reward: number
        }
        Insert: {
          category: string; damage_reward?: number; description?: string | null
          id?: string; points_reward: number; recurrence: string; title: string; xp_reward?: number
        }
        Update: {
          category?: string; damage_reward?: number; description?: string | null
          id?: string; points_reward?: number; recurrence?: string; title?: string; xp_reward?: number
        }
        Relationships: []
      }
      tower_floors: {
        Row: {
          attack_interval_hours: number; floor: number; money_reward: number
          monster_attack: number; monster_emoji: string; monster_max_hp: number
          monster_name: string; xp_reward: number
        }
        Insert: {
          attack_interval_hours?: number; floor: number; money_reward?: number
          monster_attack: number; monster_emoji?: string; monster_max_hp: number
          monster_name: string; xp_reward?: number
        }
        Update: {
          attack_interval_hours?: number; floor?: number; money_reward?: number
          monster_attack?: number; monster_emoji?: string; monster_max_hp?: number
          monster_name?: string; xp_reward?: number
        }
        Relationships: []
      }
      store_items: {
        Row: {
          cost: number; damage_bonus: number; description: string | null
          emoji: string; heal_amount: number; hp_bonus: number; id: string
          is_character: boolean; item_type: string; name: string; sort_order: number
        }
        Insert: {
          cost: number; damage_bonus?: number; description?: string | null
          emoji?: string; heal_amount?: number; hp_bonus?: number; id?: string
          is_character?: boolean; item_type: string; name: string; sort_order?: number
        }
        Update: {
          cost?: number; damage_bonus?: number; description?: string | null
          emoji?: string; heal_amount?: number; hp_bonus?: number; id?: string
          is_character?: boolean; item_type?: string; name?: string; sort_order?: number
        }
        Relationships: []
      }
      player_items: {
        Row: { equipped: boolean; id: string; item_id: string; profile_id: string; purchased_at: string }
        Insert: { equipped?: boolean; id?: string; item_id: string; profile_id: string; purchased_at?: string }
        Update: { equipped?: boolean; id?: string; item_id?: string; profile_id?: string; purchased_at?: string }
        Relationships: [
          { foreignKeyName: "player_items_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "store_items"; referencedColumns: ["id"] },
          { foreignKeyName: "player_items_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      rewards: {
        Row: {
          created_at: string | null; created_by: string | null; description: string | null
          household_id: string | null; id: string; in_game_bonus: Json | null
          points_cost: number; reward_type: string; title: string
        }
        Insert: {
          created_at?: string | null; created_by?: string | null; description?: string | null
          household_id?: string | null; id?: string; in_game_bonus?: Json | null
          points_cost?: number; reward_type?: string; title: string
        }
        Update: {
          created_at?: string | null; created_by?: string | null; description?: string | null
          household_id?: string | null; id?: string; in_game_bonus?: Json | null
          points_cost?: number; reward_type?: string; title?: string
        }
        Relationships: [
          { foreignKeyName: "rewards_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "rewards_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { get_my_household_id: { Args: never; Returns: string } }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]
export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
