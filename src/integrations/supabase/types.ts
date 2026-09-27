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
      bot_customers: {
        Row: {
          mode: string | null
          owner_id: number | null
          pending: Json
          tg_user_id: number
          updated_at: string
        }
        Insert: {
          mode?: string | null
          owner_id?: number | null
          pending?: Json
          tg_user_id: number
          updated_at?: string
        }
        Update: {
          mode?: string | null
          owner_id?: number | null
          pending?: Json
          tg_user_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_customers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          failed: number
          id: string
          owner_id: number
          sent: number
          text: string
        }
        Insert: {
          created_at?: string
          failed?: number
          id?: string
          owner_id: number
          sent?: number
          text: string
        }
        Update: {
          created_at?: string
          failed?: number
          id?: string
          owner_id?: number
          sent?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      content_suggestions: {
        Row: {
          chat_id: number | null
          created_at: string
          id: string
          kind: string
          meta: Json
          owner_id: number
          published_at: string | null
          published_message_id: number | null
          status: string
          text: string
        }
        Insert: {
          chat_id?: number | null
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          owner_id: number
          published_at?: string | null
          published_message_id?: number | null
          status?: string
          text: string
        }
        Update: {
          chat_id?: number | null
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          owner_id?: number
          published_at?: string | null
          published_message_id?: number | null
          status?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_suggestions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      insights: {
        Row: {
          created_at: string
          id: string
          message_count: number
          negative: number
          negative_drivers: Json
          neutral: number
          owner_id: number
          positive: number
          positive_drivers: Json
          summary: string | null
          topics: Json
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          negative?: number
          negative_drivers?: Json
          neutral?: number
          owner_id: number
          positive?: number
          positive_drivers?: Json
          summary?: string | null
          topics?: Json
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          negative?: number
          negative_drivers?: Json
          neutral?: number
          owner_id?: number
          positive?: number
          positive_drivers?: Json
          summary?: string | null
          topics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "insights_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      members: {
        Row: {
          amount: number
          created_at: string
          id: string
          name: string
          note: string | null
          owner_id: number
          phone: string | null
          status: string
          tg_user_id: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          name: string
          note?: string | null
          owner_id: number
          phone?: string | null
          status?: string
          tg_user_id?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          owner_id?: number
          phone?: string | null
          status?: string
          tg_user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "members_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      question_clusters: {
        Row: {
          answer: string | null
          answered_at: string | null
          ask_count: number
          created_at: string
          id: string
          owner_id: number
          question: string
          sources: Json
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          ask_count?: number
          created_at?: string
          id?: string
          owner_id: number
          question: string
          sources?: Json
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          ask_count?: number
          created_at?: string
          id?: string
          owner_id?: number
          question?: string
          sources?: Json
        }
        Relationships: [
          {
            foreignKeyName: "question_clusters_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      records: {
        Row: {
          amount: number
          client: string | null
          created_at: string
          data_type: string
          due_date: string | null
          id: string
          owner_id: number
          status: string
          title: string
        }
        Insert: {
          amount?: number
          client?: string | null
          created_at?: string
          data_type?: string
          due_date?: string | null
          id?: string
          owner_id: number
          status?: string
          title: string
        }
        Update: {
          amount?: number
          client?: string | null
          created_at?: string
          data_type?: string
          due_date?: string | null
          id?: string
          owner_id?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "records_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      reminders: {
        Row: {
          active: boolean
          chat_id: number | null
          created_at: string
          id: string
          last_sent_at: string | null
          owner_id: number
          repeat: string
          send_at: string
          text: string
        }
        Insert: {
          active?: boolean
          chat_id?: number | null
          created_at?: string
          id?: string
          last_sent_at?: string | null
          owner_id: number
          repeat?: string
          send_at: string
          text: string
        }
        Update: {
          active?: boolean
          chat_id?: number | null
          created_at?: string
          id?: string
          last_sent_at?: string | null
          owner_id?: number
          repeat?: string
          send_at?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      tg_chats: {
        Row: {
          chat_id: number
          chat_type: string | null
          created_at: string
          owner_id: number
          title: string | null
        }
        Insert: {
          chat_id: number
          chat_type?: string | null
          created_at?: string
          owner_id: number
          title?: string | null
        }
        Update: {
          chat_id?: number
          chat_type?: string | null
          created_at?: string
          owner_id?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tg_chats_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      tg_messages: {
        Row: {
          ai_generated: boolean
          chat_id: number
          created_at: string
          from_name: string | null
          id: string
          is_question: boolean
          kind: string
          message_id: number
          origin_chat_id: number | null
          origin_message_id: number | null
          owner_id: number
          reactions: number
          replies: number
          text: string
        }
        Insert: {
          ai_generated?: boolean
          chat_id: number
          created_at?: string
          from_name?: string | null
          id?: string
          is_question?: boolean
          kind?: string
          message_id: number
          origin_chat_id?: number | null
          origin_message_id?: number | null
          owner_id: number
          reactions?: number
          replies?: number
          text: string
        }
        Update: {
          ai_generated?: boolean
          chat_id?: number
          created_at?: string
          from_name?: string | null
          id?: string
          is_question?: boolean
          kind?: string
          message_id?: number
          origin_chat_id?: number | null
          origin_message_id?: number | null
          owner_id?: number
          reactions?: number
          replies?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "tg_messages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      tg_owners: {
        Row: {
          analysis_day: string | null
          analysis_runs: number
          cabinet_token: string
          content_auto_publish: boolean
          content_chat_id: number | null
          content_footer_disabled: boolean
          created_at: string
          display_name: string | null
          first_name: string | null
          is_demo: boolean
          language: string
          modules: string[]
          niche: string | null
          onboarded_at: string | null
          plan_status: string
          plan_tier: string
          step: string
          subscription_ends_at: string | null
          telegram_id: number
          trial_ends_at: string
          updated_at: string
          username: string | null
          workspace_type: string | null
        }
        Insert: {
          analysis_day?: string | null
          analysis_runs?: number
          cabinet_token?: string
          content_auto_publish?: boolean
          content_chat_id?: number | null
          content_footer_disabled?: boolean
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          is_demo?: boolean
          language?: string
          modules?: string[]
          niche?: string | null
          onboarded_at?: string | null
          plan_status?: string
          plan_tier?: string
          step?: string
          subscription_ends_at?: string | null
          telegram_id: number
          trial_ends_at?: string
          updated_at?: string
          username?: string | null
          workspace_type?: string | null
        }
        Update: {
          analysis_day?: string | null
          analysis_runs?: number
          cabinet_token?: string
          content_auto_publish?: boolean
          content_chat_id?: number | null
          content_footer_disabled?: boolean
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          is_demo?: boolean
          language?: string
          modules?: string[]
          niche?: string | null
          onboarded_at?: string | null
          plan_status?: string
          plan_tier?: string
          step?: string
          subscription_ends_at?: string | null
          telegram_id?: number
          trial_ends_at?: string
          updated_at?: string
          username?: string | null
          workspace_type?: string | null
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          bucket: string
          count: number
          owner_id: number
          period_key: number
          updated_at: string
        }
        Insert: {
          bucket: string
          count?: number
          owner_id: number
          period_key: number
          updated_at?: string
        }
        Update: {
          bucket?: string
          count?: number
          owner_id?: number
          period_key?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vip_orders: {
        Row: {
          amount: number
          created_at: string
          days: number
          id: string
          owner_id: number
          paid_at: string | null
          payme_cancel_time: number | null
          payme_create_time: number | null
          payme_perform_time: number | null
          payme_reason: number | null
          payme_state: number | null
          provider: string | null
          provider_tx: string | null
          seq: number
          status: string
          tg_user_id: number
          user_name: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          days: number
          id?: string
          owner_id: number
          paid_at?: string | null
          payme_cancel_time?: number | null
          payme_create_time?: number | null
          payme_perform_time?: number | null
          payme_reason?: number | null
          payme_state?: number | null
          provider?: string | null
          provider_tx?: string | null
          seq?: number
          status?: string
          tg_user_id: number
          user_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          days?: number
          id?: string
          owner_id?: number
          paid_at?: string | null
          payme_cancel_time?: number | null
          payme_create_time?: number | null
          payme_perform_time?: number | null
          payme_reason?: number | null
          payme_state?: number | null
          provider?: string | null
          provider_tx?: string | null
          seq?: number
          status?: string
          tg_user_id?: number
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vip_orders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      vip_settings: {
        Row: {
          chat_id: number | null
          click_merchant_id: string | null
          click_secret_key: string | null
          click_service_id: string | null
          days: number
          owner_id: number
          payme_key: string | null
          payme_merchant_id: string | null
          price: number
          updated_at: string
        }
        Insert: {
          chat_id?: number | null
          click_merchant_id?: string | null
          click_secret_key?: string | null
          click_service_id?: string | null
          days?: number
          owner_id: number
          payme_key?: string | null
          payme_merchant_id?: string | null
          price?: number
          updated_at?: string
        }
        Update: {
          chat_id?: number | null
          click_merchant_id?: string | null
          click_secret_key?: string | null
          click_service_id?: string | null
          days?: number
          owner_id?: number
          payme_key?: string | null
          payme_merchant_id?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      vip_subs: {
        Row: {
          chat_id: number
          ends_at: string
          notified_at: string | null
          owner_id: number
          status: string
          tg_user_id: number
          user_name: string | null
        }
        Insert: {
          chat_id: number
          ends_at: string
          notified_at?: string | null
          owner_id: number
          status?: string
          tg_user_id: number
          user_name?: string | null
        }
        Update: {
          chat_id?: number
          ends_at?: string
          notified_at?: string | null
          owner_id?: number
          status?: string
          tg_user_id?: number
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vip_subs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "tg_owners"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_message_engagement: {
        Args: {
          _absolute_reactions?: boolean
          _chat: number
          _msg: number
          _reactions: number
          _replies: number
        }
        Returns: undefined
      }
      bootstrap_first_admin: { Args: { _user_id: string }; Returns: boolean }
      consume_analysis_slot: {
        Args: { _max?: number; _owner: number }
        Returns: boolean
      }
      consume_quota: {
        Args: {
          _bucket: string
          _max: number
          _owner: number
          _period_days: number
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      refund_quota: {
        Args: { _bucket: string; _owner: number; _period_days: number }
        Returns: undefined
      }
      replace_question_clusters: {
        Args: { _owner: number; _rows: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
