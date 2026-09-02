export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      adoption_returns: {
        Row: {
          adoption_id: string
          created_at: string
          created_by_user_id: string | null
          id: string
          notes: string | null
          reason: string
          returned_at: string
          shelter_id: string
        }
        Insert: {
          adoption_id: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          reason: string
          returned_at: string
          shelter_id: string
        }
        Update: {
          adoption_id?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          reason?: string
          returned_at?: string
          shelter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_returns_shelter_id_adoption_id_fkey"
            columns: ["shelter_id", "adoption_id"]
            isOneToOne: false
            referencedRelation: "adoptions"
            referencedColumns: ["shelter_id", "id"]
          },
          {
            foreignKeyName: "adoption_returns_shelter_id_created_by_user_id_fkey"
            columns: ["shelter_id", "created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["shelter_id", "id"]
          },
          {
            foreignKeyName: "adoption_returns_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      adoptions: {
        Row: {
          adoption_date: string
          adoption_photo_path: string | null
          animal_id: string
          candidate_id: string
          created_at: string
          handover_notes: string | null
          id: string
          shelter_id: string
          status: string
        }
        Insert: {
          adoption_date: string
          adoption_photo_path?: string | null
          animal_id: string
          candidate_id: string
          created_at?: string
          handover_notes?: string | null
          id?: string
          shelter_id: string
          status?: string
        }
        Update: {
          adoption_date?: string
          adoption_photo_path?: string | null
          animal_id?: string
          candidate_id?: string
          created_at?: string
          handover_notes?: string | null
          id?: string
          shelter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoptions_shelter_id_animal_id_fkey"
            columns: ["shelter_id", "animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["shelter_id", "id"]
          },
          {
            foreignKeyName: "adoptions_shelter_id_candidate_id_animal_id_fkey"
            columns: ["shelter_id", "candidate_id", "animal_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["shelter_id", "id", "animal_id"]
          },
          {
            foreignKeyName: "adoptions_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          approximate_age_months: number | null
          archived_at: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          primary_photo_path: string | null
          sex: string
          shelter_id: string
          size: string
          species: string
          status: string
          updated_at: string
        }
        Insert: {
          approximate_age_months?: number | null
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          primary_photo_path?: string | null
          sex: string
          shelter_id: string
          size: string
          species: string
          status?: string
          updated_at?: string
        }
        Update: {
          approximate_age_months?: number | null
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          primary_photo_path?: string | null
          sex?: string
          shelter_id?: string
          size?: string
          species?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "animals_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          animal_id: string
          archived_at: string | null
          created_at: string
          id: string
          notes: string | null
          person_id: string
          shelter_id: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          animal_id: string
          archived_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          person_id: string
          shelter_id: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          animal_id?: string
          archived_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          person_id?: string
          shelter_id?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_shelter_id_animal_id_fkey"
            columns: ["shelter_id", "animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["shelter_id", "id"]
          },
          {
            foreignKeyName: "candidates_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_shelter_id_person_id_fkey"
            columns: ["shelter_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["shelter_id", "id"]
          },
        ]
      }
      evaluations: {
        Row: {
          candidate_id: string
          concerns: string[]
          created_at: string
          created_by_user_id: string | null
          id: string
          notes: string | null
          overall_fit: string
          positive_factors: string[]
          recommendation: string
          shelter_id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          concerns?: string[]
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          overall_fit: string
          positive_factors?: string[]
          recommendation: string
          shelter_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          concerns?: string[]
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          overall_fit?: string
          positive_factors?: string[]
          recommendation?: string
          shelter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_shelter_id_candidate_id_fkey"
            columns: ["shelter_id", "candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["shelter_id", "id"]
          },
          {
            foreignKeyName: "evaluations_shelter_id_created_by_user_id_fkey"
            columns: ["shelter_id", "created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["shelter_id", "id"]
          },
          {
            foreignKeyName: "evaluations_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          adoption_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          due_date: string
          id: string
          notes: string | null
          outcome: string | null
          photo_path: string | null
          rescheduled_from_followup_id: string | null
          shelter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          adoption_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          outcome?: string | null
          photo_path?: string | null
          rescheduled_from_followup_id?: string | null
          shelter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          adoption_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          photo_path?: string | null
          rescheduled_from_followup_id?: string | null
          shelter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_shelter_id_adoption_id_fkey"
            columns: ["shelter_id", "adoption_id"]
            isOneToOne: false
            referencedRelation: "adoptions"
            referencedColumns: ["shelter_id", "id"]
          },
          {
            foreignKeyName: "followups_shelter_id_adoption_id_rescheduled_from_followup_fkey"
            columns: [
              "shelter_id",
              "adoption_id",
              "rescheduled_from_followup_id",
            ]
            isOneToOne: false
            referencedRelation: "followups"
            referencedColumns: ["shelter_id", "adoption_id", "id"]
          },
          {
            foreignKeyName: "followups_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          notes: string | null
          rescheduled_from_meeting_id: string | null
          result: string | null
          scheduled_at: string
          shelter_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          notes?: string | null
          rescheduled_from_meeting_id?: string | null
          result?: string | null
          scheduled_at: string
          shelter_id: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          rescheduled_from_meeting_id?: string | null
          result?: string | null
          scheduled_at?: string
          shelter_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_shelter_id_candidate_id_fkey"
            columns: ["shelter_id", "candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["shelter_id", "id"]
          },
          {
            foreignKeyName: "meetings_shelter_id_candidate_id_rescheduled_from_meeting__fkey"
            columns: [
              "shelter_id",
              "candidate_id",
              "rescheduled_from_meeting_id",
            ]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["shelter_id", "candidate_id", "id"]
          },
          {
            foreignKeyName: "meetings_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          shelter_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          shelter_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          shelter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          shelter_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          shelter_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          shelter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      shelters: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          animal_id: string
          created_at: string
          data: Json | null
          domain_record_id: string | null
          domain_record_type: string | null
          event_type: string
          id: string
          occurred_at: string
          shelter_id: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          data?: Json | null
          domain_record_id?: string | null
          domain_record_type?: string | null
          event_type: string
          id?: string
          occurred_at: string
          shelter_id: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          data?: Json | null
          domain_record_id?: string | null
          domain_record_type?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          shelter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_shelter_id_animal_id_fkey"
            columns: ["shelter_id", "animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["shelter_id", "id"]
          },
          {
            foreignKeyName: "timeline_events_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_adoption: {
        Args: {
          p_adoption_date: string
          p_candidate_id: string
          p_followup_due_dates: string[]
          p_handover_notes: string | null
        }
        Returns: string
      }
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
