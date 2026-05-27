export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          role: 'parent' | 'child';
          points: number;
          level: number;
          household_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          role?: 'parent' | 'child';
          points?: number;
          level?: number;
          household_id?: string | null;
          created_at?: string;
        };
        Update: {
          username?: string | null;
          avatar_url?: string | null;
          role?: 'parent' | 'child';
          points?: number;
          level?: number;
          household_id?: string | null;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          invite_code?: string;
        };
        Relationships: [];
      };
      chores: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          description: string | null;
          points_reward: number;
          assigned_to: string | null;
          created_by: string;
          due_date: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'approved';
          recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          description?: string | null;
          points_reward?: number;
          assigned_to?: string | null;
          created_by: string;
          due_date?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'approved';
          recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          points_reward?: number;
          assigned_to?: string | null;
          due_date?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'approved';
          recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          description: string | null;
          points_cost: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          description?: string | null;
          points_cost: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          points_cost?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
