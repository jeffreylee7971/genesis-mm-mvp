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
      conversation_starters: {
        Row: {
          generated_at: string
          id: string
          match_id: string
          starters: string[]
        }
        Insert: {
          generated_at?: string
          id?: string
          match_id: string
          starters?: string[]
        }
        Update: {
          generated_at?: string
          id?: string
          match_id?: string
          starters?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "conversation_starters_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_matches: {
        Row: {
          candidate_id: string
          compatibility_score: number
          created_at: string
          highlight: string | null
          id: string
          match_date: string
          viewer_id: string
        }
        Insert: {
          candidate_id: string
          compatibility_score?: number
          created_at?: string
          highlight?: string | null
          id?: string
          match_date?: string
          viewer_id: string
        }
        Update: {
          candidate_id?: string
          compatibility_score?: number
          created_at?: string
          highlight?: string | null
          id?: string
          match_date?: string
          viewer_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          compatibility_narrative: string | null
          compatibility_score: number | null
          created_at: string
          id: string
          initiator: string | null
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          compatibility_narrative?: string | null
          compatibility_score?: number | null
          created_at?: string
          id?: string
          initiator?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          user_id_1: string
          user_id_2: string
        }
        Update: {
          compatibility_narrative?: string | null
          compatibility_score?: number | null
          created_at?: string
          id?: string
          initiator?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          match_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          match_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          match_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          attachment_signals: Json
          bio: string | null
          children_current: number | null
          children_wanted: number | null
          created_at: string
          family_timeline: Database["public"]["Enums"]["family_timeline"] | null
          lifestyle: Json
          open_text_future: string | null
          open_text_parenting: string | null
          open_text_sunday: string | null
          open_to_existing_children: string | null
          parenting_philosophy: Json
          relationship_structure:
            | Database["public"]["Enums"]["relationship_structure"]
            | null
          semantic_scores: Json | null
          updated_at: string
          user_id: string
          x_readiness_signal: number | null
        }
        Insert: {
          attachment_signals?: Json
          bio?: string | null
          children_current?: number | null
          children_wanted?: number | null
          created_at?: string
          family_timeline?:
            | Database["public"]["Enums"]["family_timeline"]
            | null
          lifestyle?: Json
          open_text_future?: string | null
          open_text_parenting?: string | null
          open_text_sunday?: string | null
          open_to_existing_children?: string | null
          parenting_philosophy?: Json
          relationship_structure?:
            | Database["public"]["Enums"]["relationship_structure"]
            | null
          semantic_scores?: Json | null
          updated_at?: string
          user_id: string
          x_readiness_signal?: number | null
        }
        Update: {
          attachment_signals?: Json
          bio?: string | null
          children_current?: number | null
          children_wanted?: number | null
          created_at?: string
          family_timeline?:
            | Database["public"]["Enums"]["family_timeline"]
            | null
          lifestyle?: Json
          open_text_future?: string | null
          open_text_parenting?: string | null
          open_text_sunday?: string | null
          open_to_existing_children?: string | null
          parenting_philosophy?: Json
          relationship_structure?:
            | Database["public"]["Enums"]["relationship_structure"]
            | null
          semantic_scores?: Json | null
          updated_at?: string
          user_id?: string
          x_readiness_signal?: number | null
        }
        Relationships: []
      }
      success: {
        Row: {
          id: string
          marked_matched_at: string
          partner_found: string | null
          stripe_paid: boolean
          user_id: string
        }
        Insert: {
          id?: string
          marked_matched_at?: string
          partner_found?: string | null
          stripe_paid?: boolean
          user_id: string
        }
        Update: {
          id?: string
          marked_matched_at?: string
          partner_found?: string | null
          stripe_paid?: boolean
          user_id?: string
        }
        Relationships: []
      }
      users_meta: {
        Row: {
          age: number | null
          city: string | null
          created_at: string
          id: string
          name: string
          onboarding_complete: boolean
          paused: boolean
          photos: string[]
          updated_at: string
          x_connected: boolean
          x_handle: string | null
        }
        Insert: {
          age?: number | null
          city?: string | null
          created_at?: string
          id: string
          name?: string
          onboarding_complete?: boolean
          paused?: boolean
          photos?: string[]
          updated_at?: string
          x_connected?: boolean
          x_handle?: string | null
        }
        Update: {
          age?: number | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          onboarding_complete?: boolean
          paused?: boolean
          photos?: string[]
          updated_at?: string
          x_connected?: boolean
          x_handle?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_daily_matches: { Args: { _viewer: string }; Returns: number }
      user_in_match: {
        Args: { _match: string; _user: string }
        Returns: boolean
      }
      users_are_mutually_matched: {
        Args: { _a: string; _b: string }
        Returns: boolean
      }
    }
    Enums: {
      family_timeline:
        | "within_1_year"
        | "1_to_2_years"
        | "2_to_4_years"
        | "open_but_serious"
      match_status: "pending" | "mutual" | "connected" | "passed"
      relationship_structure:
        | "traditional_marriage"
        | "open_to_alternatives"
        | "either"
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
      family_timeline: [
        "within_1_year",
        "1_to_2_years",
        "2_to_4_years",
        "open_but_serious",
      ],
      match_status: ["pending", "mutual", "connected", "passed"],
      relationship_structure: [
        "traditional_marriage",
        "open_to_alternatives",
        "either",
      ],
    },
  },
} as const
