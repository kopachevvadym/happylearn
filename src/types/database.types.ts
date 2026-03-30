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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          avatar_url: string | null
          display_role: string | null
          bio: string | null
          default_source_lang: string
          default_target_lang: string
          daily_goal: number
          onboarding_completed: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          avatar_url?: string | null
          display_role?: string | null
          bio?: string | null
          default_source_lang?: string
          default_target_lang?: string
          daily_goal?: number
          onboarding_completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          avatar_url?: string | null
          display_role?: string | null
          bio?: string | null
          default_source_lang?: string
          default_target_lang?: string
          daily_goal?: number
          onboarding_completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      words: {
        Row: {
          id: string
          user_id: string
          word: string
          translations: string[]
          examples: string[]
          source_lang: string
          target_lang: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word: string
          translations?: string[]
          examples?: string[]
          source_lang: string
          target_lang: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          word?: string
          translations?: string[]
          examples?: string[]
          source_lang?: string
          target_lang?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          source_lang: string
          target_lang: string
          is_public: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          source_lang: string
          target_lang: string
          is_public?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          source_lang?: string
          target_lang?: string
          is_public?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      collection_words: {
        Row: {
          id: string
          collection_id: string
          word_id: string
          added_at: string
        }
        Insert: {
          id?: string
          collection_id: string
          word_id: string
          added_at?: string
        }
        Update: {
          id?: string
          collection_id?: string
          word_id?: string
          added_at?: string
        }
        Relationships: []
      }
      collection_follows: {
        Row: {
          id: string
          user_id: string
          collection_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          collection_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          collection_id?: string
          created_at?: string
        }
        Relationships: []
      }
      word_progress: {
        Row: {
          id: string
          user_id: string
          word_id: string
          ease_factor: number
          interval: number
          repetitions: number
          next_review_at: string
          is_learned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word_id: string
          ease_factor?: number
          interval?: number
          repetitions?: number
          next_review_at?: string
          is_learned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          word_id?: string
          ease_factor?: number
          interval?: number
          repetitions?: number
          next_review_at?: string
          is_learned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          id: string
          user_id: string
          current_streak: number
          longest_streak: number
          last_activity_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_activity_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          current_streak?: number
          longest_streak?: number
          last_activity_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          icon_url: string | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          icon_url?: string | null
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          icon_url?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          earned_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          key: string
          prefix: string
          name: string
          last_used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          key: string
          prefix?: string
          name: string
          last_used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          key?: string
          prefix?: string
          name?: string
          last_used_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          collection_ids: string[]
          total_words: number
          correct_answers: number
          started_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          collection_ids?: string[]
          total_words?: number
          correct_answers?: number
          started_at?: string
          finished_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          collection_ids?: string[]
          total_words?: number
          correct_answers?: number
          started_at?: string
          finished_at?: string | null
        }
        Relationships: []
      }
      study_session_words: {
        Row: {
          id: string
          session_id: string
          word_id: string
          format: 'flip' | 'quiz' | 'write'
          is_correct: boolean
        }
        Insert: {
          id?: string
          session_id: string
          word_id: string
          format: 'flip' | 'quiz' | 'write'
          is_correct: boolean
        }
        Update: {
          id?: string
          session_id?: string
          word_id?: string
          format?: 'flip' | 'quiz' | 'write'
          is_correct?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
