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
      challenge_rewards: {
        Row: {
          badge_type: string
          bonus_xp: number
          challenge_id: string
          claimed_at: string | null
          created_at: string
          id: string
          rank: number
          user_id: string
        }
        Insert: {
          badge_type: string
          bonus_xp?: number
          challenge_id: string
          claimed_at?: string | null
          created_at?: string
          id?: string
          rank: number
          user_id: string
        }
        Update: {
          badge_type?: string
          bonus_xp?: number
          challenge_id?: string
          claimed_at?: string | null
          created_at?: string
          id?: string
          rank?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_rewards_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_participants: {
        Row: {
          contest_id: string
          id: string
          joined_at: string
          referral_count: number
          telegram_chat_id: number | null
          telegram_username: string | null
          user_id: string
          words_added: number
          xp_earned: number
        }
        Insert: {
          contest_id: string
          id?: string
          joined_at?: string
          referral_count?: number
          telegram_chat_id?: number | null
          telegram_username?: string | null
          user_id: string
          words_added?: number
          xp_earned?: number
        }
        Update: {
          contest_id?: string
          id?: string
          joined_at?: string
          referral_count?: number
          telegram_chat_id?: number | null
          telegram_username?: string | null
          user_id?: string
          words_added?: number
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_participants_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_referrals: {
        Row: {
          contest_id: string
          created_at: string
          id: string
          is_valid: boolean
          referred_telegram_chat_id: number | null
          referred_user_id: string
          referrer_user_id: string
          validated_at: string | null
        }
        Insert: {
          contest_id: string
          created_at?: string
          id?: string
          is_valid?: boolean
          referred_telegram_chat_id?: number | null
          referred_user_id: string
          referrer_user_id: string
          validated_at?: string | null
        }
        Update: {
          contest_id?: string
          created_at?: string
          id?: string
          is_valid?: boolean
          referred_telegram_chat_id?: number | null
          referred_user_id?: string
          referrer_user_id?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contest_referrals_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          contest_type: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean
          min_referrals: number
          prizes: Json
          start_date: string
          title: string
          updated_at: string
          winner_count: number
        }
        Insert: {
          contest_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_referrals?: number
          prizes?: Json
          start_date?: string
          title: string
          updated_at?: string
          winner_count?: number
        }
        Update: {
          contest_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_referrals?: number
          prizes?: Json
          start_date?: string
          title?: string
          updated_at?: string
          winner_count?: number
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
      duel_responses: {
        Row: {
          created_at: string
          duel_id: string
          id: string
          is_correct: boolean
          response_time_ms: number
          user_id: string
          word_index: number
        }
        Insert: {
          created_at?: string
          duel_id: string
          id?: string
          is_correct: boolean
          response_time_ms: number
          user_id: string
          word_index: number
        }
        Update: {
          created_at?: string
          duel_id?: string
          id?: string
          is_correct?: boolean
          response_time_ms?: number
          user_id?: string
          word_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "duel_responses_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "word_duels"
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
          referral_source: string | null
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
          referral_source?: string | null
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
          referral_source?: string | null
          telegram_chat_id?: number | null
          telegram_connected_at?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          current_word_id: string | null
          id: string
          is_active: boolean | null
          last_activity: string | null
          started_at: string | null
          telegram_chat_id: number
          user_id: string
          user_language_id: string
          words_correct: number | null
          words_reviewed: number | null
        }
        Insert: {
          current_word_id?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          started_at?: string | null
          telegram_chat_id: number
          user_id: string
          user_language_id: string
          words_correct?: number | null
          words_reviewed?: number | null
        }
        Update: {
          current_word_id?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          started_at?: string | null
          telegram_chat_id?: number
          user_id?: string
          user_language_id?: string
          words_correct?: number | null
          words_reviewed?: number | null
        }
        Relationships: []
      }
      referral_visits: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          referral_id: string
          registered: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          referral_id: string
          registered?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          referral_id?: string
          registered?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_visits_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          clicks: number
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          registrations: number
          updated_at: string
        }
        Insert: {
          clicks?: number
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          registrations?: number
          updated_at?: string
        }
        Update: {
          clicks?: number
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          registrations?: number
          updated_at?: string
        }
        Relationships: []
      }
      required_channels: {
        Row: {
          channel_id: string
          channel_name: string
          channel_url: string
          channel_username: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          channel_id: string
          channel_name: string
          channel_url: string
          channel_username: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          channel_id?: string
          channel_name?: string
          channel_url?: string
          channel_username?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          achievements: string[] | null
          daily_goal: number
          id: string
          last_active_date: string
          last_activity_description: string | null
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
          daily_goal?: number
          id?: string
          last_active_date?: string
          last_activity_description?: string | null
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
          daily_goal?: number
          id?: string
          last_active_date?: string
          last_activity_description?: string | null
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
      weekly_challenge_participants: {
        Row: {
          challenge_id: string
          days_active: number | null
          id: string
          joined_at: string
          rank: number | null
          updated_at: string
          user_id: string
          words_correct: number | null
          words_reviewed: number | null
          xp_earned: number | null
        }
        Insert: {
          challenge_id: string
          days_active?: number | null
          id?: string
          joined_at?: string
          rank?: number | null
          updated_at?: string
          user_id: string
          words_correct?: number | null
          words_reviewed?: number | null
          xp_earned?: number | null
        }
        Update: {
          challenge_id?: string
          days_active?: number | null
          id?: string
          joined_at?: string
          rank?: number | null
          updated_at?: string
          user_id?: string
          words_correct?: number | null
          words_reviewed?: number | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_challenges: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      word_duels: {
        Row: {
          challenger_id: string
          challenger_score: number | null
          challenger_time_ms: number | null
          completed_at: string | null
          created_at: string
          current_word_index: number | null
          expires_at: string
          id: string
          opponent_id: string
          opponent_score: number | null
          opponent_time_ms: number | null
          started_at: string | null
          status: string
          updated_at: string
          winner_id: string | null
          word_count: number
          words: Json
        }
        Insert: {
          challenger_id: string
          challenger_score?: number | null
          challenger_time_ms?: number | null
          completed_at?: string | null
          created_at?: string
          current_word_index?: number | null
          expires_at?: string
          id?: string
          opponent_id: string
          opponent_score?: number | null
          opponent_time_ms?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
          word_count?: number
          words?: Json
        }
        Update: {
          challenger_id?: string
          challenger_score?: number | null
          challenger_time_ms?: number | null
          completed_at?: string | null
          created_at?: string
          current_word_index?: number | null
          expires_at?: string
          id?: string
          opponent_id?: string
          opponent_score?: number | null
          opponent_time_ms?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
          word_count?: number
          words?: Json
        }
        Relationships: []
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
      generate_friend_code: { Args: never; Returns: string }
      get_active_contest: {
        Args: never
        Returns: {
          contest_type: string
          description: string
          end_date: string
          id: string
          image_url: string
          prizes: Json
          title: string
          winner_count: number
        }[]
      }
      get_contest_leaderboard: {
        Args: { p_contest_id: string }
        Returns: {
          full_name: string
          rank: number
          referral_count: number
          telegram_username: string
          user_id: string
        }[]
      }
      get_or_create_weekly_challenge: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_challenge_winners: {
        Args: { p_challenge_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
