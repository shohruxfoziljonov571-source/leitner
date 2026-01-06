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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          user_language_id: string
          words_correct: number | null
          words_reviewed: number | null
          xp_earned: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          user_id: string
          user_language_id: string
          words_correct?: number | null
          words_reviewed?: number | null
          xp_earned?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          user_language_id?: string
          words_correct?: number | null
          words_reviewed?: number | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_stats_user_language_id_fkey"
            columns: ["user_language_id"]
            isOneToOne: false
            referencedRelation: "user_languages"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          daily_reminder_time: string | null
          id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          telegram_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_reminder_time?: string | null
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          telegram_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_reminder_time?: string | null
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          telegram_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          friend_code: string | null
          full_name: string | null
          id: string
          preferred_language: string | null
          telegram_chat_id: number | null
          telegram_connected_at: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          friend_code?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string | null
          telegram_chat_id?: number | null
          telegram_connected_at?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          friend_code?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string | null
          telegram_chat_id?: number | null
          telegram_connected_at?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_languages: {
        Row: {
          created_at: string
          id: string
          source_language: string
          target_language: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_language: string
          target_language: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_language?: string
          target_language?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          achievements: string[] | null
          id: string
          last_active_date: string
          learned_words: number
          level: number | null
          streak: number
          today_correct: number
          today_reviewed: number
          total_words: number
          user_id: string
          user_language_id: string
          xp: number | null
        }
        Insert: {
          achievements?: string[] | null
          id?: string
          last_active_date?: string
          learned_words?: number
          level?: number | null
          streak?: number
          today_correct?: number
          today_reviewed?: number
          total_words?: number
          user_id: string
          user_language_id: string
          xp?: number | null
        }
        Update: {
          achievements?: string[] | null
          id?: string
          last_active_date?: string
          learned_words?: number
          level?: number | null
          streak?: number
          today_correct?: number
          today_reviewed?: number
          total_words?: number
          user_id?: string
          user_language_id?: string
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_language_id_fkey"
            columns: ["user_language_id"]
            isOneToOne: false
            referencedRelation: "user_languages"
            referencedColumns: ["id"]
          },
        ]
      }
      words: {
        Row: {
          box_number: number
          category_id: string | null
          created_at: string
          example_sentences: string[] | null
          id: string
          last_reviewed: string | null
          next_review_time: string
          original_word: string
          source_language: string
          target_language: string
          times_correct: number
          times_incorrect: number
          times_reviewed: number
          translated_word: string
          user_id: string
          user_language_id: string
        }
        Insert: {
          box_number?: number
          category_id?: string | null
          created_at?: string
          example_sentences?: string[] | null
          id?: string
          last_reviewed?: string | null
          next_review_time?: string
          original_word: string
          source_language: string
          target_language: string
          times_correct?: number
          times_incorrect?: number
          times_reviewed?: number
          translated_word: string
          user_id: string
          user_language_id: string
        }
        Update: {
          box_number?: number
          category_id?: string | null
          created_at?: string
          example_sentences?: string[] | null
          id?: string
          last_reviewed?: string | null
          next_review_time?: string
          original_word?: string
          source_language?: string
          target_language?: string
          times_correct?: number
          times_incorrect?: number
          times_reviewed?: number
          translated_word?: string
          user_id?: string
          user_language_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "words_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "words_user_language_id_fkey"
            columns: ["user_language_id"]
            isOneToOne: false
            referencedRelation: "user_languages"
            referencedColumns: ["id"]
          },
        ]
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
