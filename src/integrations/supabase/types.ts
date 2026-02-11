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
      admin_config: {
        Row: {
          config_key: string
          config_value: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      candidate_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          candidate_id: string
          id: string
          is_active: boolean
          recruiter_id: string
          role_type: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          candidate_id: string
          id?: string
          is_active?: boolean
          recruiter_id: string
          role_type: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          candidate_id?: string
          id?: string
          is_active?: boolean
          recruiter_id?: string
          role_type?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_assignments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          degree: string | null
          drive_folder_url: string | null
          graduation_year: string | null
          id: string
          major: string | null
          notes: string | null
          referral_friend_name: string | null
          referral_source: string | null
          resume_url: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          university: string | null
          updated_at: string
          user_id: string
          visa_status: string | null
        }
        Insert: {
          created_at?: string
          degree?: string | null
          drive_folder_url?: string | null
          graduation_year?: string | null
          id?: string
          major?: string | null
          notes?: string | null
          referral_friend_name?: string | null
          referral_source?: string | null
          resume_url?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          university?: string | null
          updated_at?: string
          user_id: string
          visa_status?: string | null
        }
        Update: {
          created_at?: string
          degree?: string | null
          drive_folder_url?: string | null
          graduation_year?: string | null
          id?: string
          major?: string | null
          notes?: string | null
          referral_friend_name?: string | null
          referral_source?: string | null
          resume_url?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          university?: string | null
          updated_at?: string
          user_id?: string
          visa_status?: string | null
        }
        Relationships: []
      }
      client_intake_sheets: {
        Row: {
          candidate_id: string
          created_at: string
          data: Json
          id: string
          is_locked: boolean
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          data?: Json
          id?: string
          is_locked?: boolean
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          data?: Json
          id?: string
          is_locked?: boolean
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_intake_sheets_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_intake_sheets: {
        Row: {
          candidate_id: string
          created_at: string
          data: Json
          edited_by: string | null
          id: string
          version: number
        }
        Insert: {
          candidate_id: string
          created_at?: string
          data?: Json
          edited_by?: string | null
          id?: string
          version?: number
        }
        Update: {
          candidate_id?: string
          created_at?: string
          data?: Json
          edited_by?: string | null
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "credential_intake_sheets_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_submission_logs: {
        Row: {
          applications_count: number
          candidate_id: string
          created_at: string
          id: string
          log_date: string
          notes: string | null
          recruiter_id: string
          updated_at: string
        }
        Insert: {
          applications_count?: number
          candidate_id: string
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          recruiter_id: string
          updated_at?: string
        }
        Update: {
          applications_count?: number
          candidate_id?: string
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          recruiter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_submission_logs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          recipient_email: string
          status: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          recipient_email: string
          status?: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          status?: string
        }
        Relationships: []
      }
      interview_logs: {
        Row: {
          candidate_id: string
          company_name: string | null
          created_at: string
          difficult_questions: string | null
          id: string
          interview_date: string | null
          log_type: string
          notes: string | null
          outcome: string | null
          role_title: string | null
          round: string | null
          submitted_by: string
          support_needed: boolean | null
          support_notes: string | null
        }
        Insert: {
          candidate_id: string
          company_name?: string | null
          created_at?: string
          difficult_questions?: string | null
          id?: string
          interview_date?: string | null
          log_type: string
          notes?: string | null
          outcome?: string | null
          role_title?: string | null
          round?: string | null
          submitted_by: string
          support_needed?: boolean | null
          support_notes?: string | null
        }
        Update: {
          candidate_id?: string
          company_name?: string | null
          created_at?: string
          difficult_questions?: string | null
          id?: string
          interview_date?: string | null
          log_type?: string
          notes?: string | null
          outcome?: string | null
          role_title?: string | null
          round?: string | null
          submitted_by?: string
          support_needed?: boolean | null
          support_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_logs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          candidate_id: string
          company_name: string
          created_at: string
          id: string
          is_public: boolean
          job_url: string
          resume_used: string | null
          role_title: string
          status: string
          submission_log_id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          company_name?: string
          created_at?: string
          id?: string
          is_public?: boolean
          job_url?: string
          resume_used?: string | null
          role_title?: string
          status?: string
          submission_log_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          company_name?: string
          created_at?: string
          id?: string
          is_public?: boolean
          job_url?: string
          resume_used?: string | null
          role_title?: string
          status?: string
          submission_log_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_submission_log_id_fkey"
            columns: ["submission_log_id"]
            isOneToOne: false
            referencedRelation: "daily_submission_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          candidate_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_type: string
          status: string
        }
        Insert: {
          amount: number
          candidate_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_type?: string
          status?: string
        }
        Update: {
          amount?: number
          candidate_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_closures: {
        Row: {
          bgv_company_name: string | null
          candidate_id: string
          closed_by: string
          company_name: string
          created_at: string
          hr_email: string
          id: string
          interviewer_email: string | null
          notes: string | null
          offer_letter_url: string | null
          role_title: string
          salary: string
          start_date: string
        }
        Insert: {
          bgv_company_name?: string | null
          candidate_id: string
          closed_by: string
          company_name: string
          created_at?: string
          hr_email: string
          id?: string
          interviewer_email?: string | null
          notes?: string | null
          offer_letter_url?: string | null
          role_title: string
          salary: string
          start_date: string
        }
        Update: {
          bgv_company_name?: string | null
          candidate_id?: string
          closed_by?: string
          company_name?: string
          created_at?: string
          hr_email?: string
          id?: string
          interviewer_email?: string | null
          notes?: string | null
          offer_letter_url?: string | null
          role_title?: string
          salary?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_closures_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recruiter_bank_details: {
        Row: {
          bank_account_last4: string | null
          bank_name: string | null
          bank_routing_last4: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_last4?: string | null
          bank_name?: string | null
          bank_routing_last4?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_last4?: string | null
          bank_name?: string | null
          bank_routing_last4?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recruiter_profiles: {
        Row: {
          created_at: string
          documents_url: string | null
          id: string
          location: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documents_url?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documents_url?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          friend_email: string
          friend_name: string
          friend_phone: string | null
          id: string
          notes: string | null
          referral_note: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          friend_email: string
          friend_name: string
          friend_phone?: string | null
          id?: string
          notes?: string | null
          referral_note?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          friend_email?: string
          friend_name?: string
          friend_phone?: string | null
          id?: string
          notes?: string | null
          referral_note?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      role_suggestions: {
        Row: {
          candidate_confirmed: boolean | null
          candidate_id: string
          confirmed_at: string | null
          created_at: string
          description: string | null
          id: string
          role_title: string
          suggested_by: string | null
        }
        Insert: {
          candidate_confirmed?: boolean | null
          candidate_id: string
          confirmed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          role_title: string
          suggested_by?: string | null
        }
        Update: {
          candidate_confirmed?: boolean | null
          candidate_id?: string
          confirmed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          role_title?: string
          suggested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_suggestions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      training_clicks: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          training_type: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          training_type: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          training_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_clicks_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_role_suggestion: {
        Args: {
          _candidate_id: string
          _description?: string
          _role_title: string
        }
        Returns: string
      }
      admin_assign_recruiter: {
        Args: {
          _candidate_id: string
          _recruiter_id: string
          _role_type: string
        }
        Returns: string
      }
      admin_close_placement: {
        Args: {
          _bgv_company_name?: string
          _candidate_id: string
          _company_name: string
          _hr_email: string
          _interviewer_email?: string
          _notes?: string
          _offer_letter_url?: string
          _role_title: string
          _salary: string
          _start_date: string
        }
        Returns: string
      }
      admin_record_payment: {
        Args: {
          _amount: number
          _candidate_id: string
          _notes?: string
          _payment_type?: string
          _status?: string
        }
        Returns: string
      }
      admin_start_marketing: {
        Args: { _candidate_id: string }
        Returns: undefined
      }
      admin_unassign_recruiter: {
        Args: { _assignment_id: string }
        Returns: undefined
      }
      admin_update_candidate_status: {
        Args: { _candidate_id: string; _new_status: string; _reason?: string }
        Returns: undefined
      }
      confirm_role_selections: {
        Args: { _candidate_id: string; _decisions: Json }
        Returns: undefined
      }
      create_system_notification: {
        Args: {
          _link?: string
          _message: string
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
      get_public_config: { Args: { _keys?: string[] }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_intake_form: {
        Args: { _candidate_id: string; _form_data: Json }
        Returns: undefined
      }
      upsert_credential_intake: {
        Args: { _candidate_id: string; _form_data: Json }
        Returns: string
      }
    }
    Enums: {
      app_role: "candidate" | "recruiter" | "admin"
      candidate_status:
        | "lead"
        | "approved"
        | "intake_submitted"
        | "roles_suggested"
        | "roles_confirmed"
        | "paid"
        | "credential_completed"
        | "active_marketing"
        | "paused"
        | "cancelled"
        | "placed"
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
      app_role: ["candidate", "recruiter", "admin"],
      candidate_status: [
        "lead",
        "approved",
        "intake_submitted",
        "roles_suggested",
        "roles_confirmed",
        "paid",
        "credential_completed",
        "active_marketing",
        "paused",
        "cancelled",
        "placed",
      ],
    },
  },
} as const
