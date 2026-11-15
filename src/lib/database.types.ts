// Generated from the live Supabase project's PostgREST schema (project kiflaiepdjewkgqtaqvq, schema public).
// The supabase CLI needs a login, so this was built from the REST schema description. Only the mirror_* tables are included
// (the legacy non-prefixed tables are intentionally ignored). Regenerate with:
//   npx supabase gen types typescript --project-id kiflaiepdjewkgqtaqvq --schema public > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      mirror_answer_attempts: {
        Row: {
          id: string
          user_id: string
          interview_id: string | null
          turn_id: string | null
          question_key: string
          question: string
          attempt_no: number
          answer_text: string
          transcript_source: string
          duration_seconds: number | null
          word_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          interview_id?: string | null
          turn_id?: string | null
          question_key: string
          question: string
          attempt_no: number
          answer_text: string
          transcript_source?: string
          duration_seconds?: number | null
          word_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          interview_id?: string | null
          turn_id?: string | null
          question_key?: string
          question?: string
          attempt_no?: number
          answer_text?: string
          transcript_source?: string
          duration_seconds?: number | null
          word_count?: number | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'mirror_answer_attempts_interview_id_fkey'; columns: ['interview_id']; isOneToOne: false; referencedRelation: 'mirror_interviews'; referencedColumns: ['id'] },
          { foreignKeyName: 'mirror_answer_attempts_turn_id_fkey'; columns: ['turn_id']; isOneToOne: false; referencedRelation: 'mirror_turns'; referencedColumns: ['id'] }
        ]
      }
      mirror_interviews: {
        Row: {
          id: string
          workspace_id: string
          role: string
          industry: string | null
          status: string
          asked_questions: Json
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          role: string
          industry?: string | null
          status?: string
          asked_questions: Json
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          role?: string
          industry?: string | null
          status?: string
          asked_questions?: Json
          created_at?: string
          user_id?: string | null
        }
        Relationships: [
          { foreignKeyName: 'mirror_interviews_workspace_id_fkey'; columns: ['workspace_id']; isOneToOne: false; referencedRelation: 'mirror_workspaces'; referencedColumns: ['slug'] }
        ]
      }
      mirror_practice_attempts: {
        Row: {
          id: string
          workspace_id: string
          item_id: string
          track: string
          topic: string
          level: number
          correct: boolean
          seconds: number
          hints_used: number
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          item_id: string
          track: string
          topic: string
          level: number
          correct: boolean
          seconds?: number
          hints_used?: number
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          item_id?: string
          track?: string
          topic?: string
          level?: number
          correct?: boolean
          seconds?: number
          hints_used?: number
          created_at?: string
          user_id?: string | null
        }
        Relationships: [
          { foreignKeyName: 'mirror_practice_attempts_workspace_id_fkey'; columns: ['workspace_id']; isOneToOne: false; referencedRelation: 'mirror_workspaces'; referencedColumns: ['slug'] }
        ]
      }
      mirror_profiles: {
        Row: {
          workspace_id: string
          role: string
          story: string
          pressure_question: string
          pressure_answer: string
          summary: string
          focus: string
          first_question: string
          resume_text: string | null
          mode: string
          created_at: string
          resume_name: string | null
          user_id: string | null
        }
        Insert: {
          workspace_id: string
          role: string
          story: string
          pressure_question: string
          pressure_answer: string
          summary: string
          focus: string
          first_question: string
          resume_text?: string | null
          mode?: string
          created_at?: string
          resume_name?: string | null
          user_id?: string | null
        }
        Update: {
          workspace_id?: string
          role?: string
          story?: string
          pressure_question?: string
          pressure_answer?: string
          summary?: string
          focus?: string
          first_question?: string
          resume_text?: string | null
          mode?: string
          created_at?: string
          resume_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          { foreignKeyName: 'mirror_profiles_workspace_id_fkey'; columns: ['workspace_id']; isOneToOne: false; referencedRelation: 'mirror_workspaces'; referencedColumns: ['slug'] }
        ]
      }
      mirror_reflections: {
        Row: {
          id: string
          workspace_id: string
          interview_id: string
          role: string
          readiness_label: string | null
          readiness_range: Json | null
          evidence: Json
          focus: string
          model: string
          created_at: string
          suggestion: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          interview_id: string
          role: string
          readiness_label?: string | null
          readiness_range?: Json | null
          evidence: Json
          focus: string
          model: string
          created_at?: string
          suggestion?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          interview_id?: string
          role?: string
          readiness_label?: string | null
          readiness_range?: Json | null
          evidence?: Json
          focus?: string
          model?: string
          created_at?: string
          suggestion?: string | null
          user_id?: string | null
        }
        Relationships: [
          { foreignKeyName: 'mirror_reflections_workspace_id_fkey'; columns: ['workspace_id']; isOneToOne: false; referencedRelation: 'mirror_workspaces'; referencedColumns: ['slug'] },
          { foreignKeyName: 'mirror_reflections_interview_id_fkey'; columns: ['interview_id']; isOneToOne: false; referencedRelation: 'mirror_interviews'; referencedColumns: ['id'] }
        ]
      }
      mirror_replay_schedule: {
        Row: {
          id: string
          user_id: string
          item_kind: string
          item_key: string
          track: string | null
          due_at: string
          interval_days: number
          ease: number
          repetitions: number
          last_recall: string | null
          last_reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          item_kind: string
          item_key: string
          track?: string | null
          due_at?: string
          interval_days?: number
          ease?: number
          repetitions?: number
          last_recall?: string | null
          last_reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_kind?: string
          item_key?: string
          track?: string | null
          due_at?: string
          interval_days?: number
          ease?: number
          repetitions?: number
          last_recall?: string | null
          last_reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mirror_resume_claims: {
        Row: {
          id: string
          user_id: string
          claim: string
          category: string
          source_quote: string | null
          resume_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          claim: string
          category?: string
          source_quote?: string | null
          resume_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          claim?: string
          category?: string
          source_quote?: string | null
          resume_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mirror_stories: {
        Row: {
          id: string
          user_id: string
          title: string
          situation: string | null
          task: string | null
          action: string | null
          result: string | null
          themes: string[]
          source: string
          source_interview_id: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          situation?: string | null
          task?: string | null
          action?: string | null
          result?: string | null
          themes: string[]
          source?: string
          source_interview_id?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          situation?: string | null
          task?: string | null
          action?: string | null
          result?: string | null
          themes?: string[]
          source?: string
          source_interview_id?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'mirror_stories_source_interview_id_fkey'; columns: ['source_interview_id']; isOneToOne: false; referencedRelation: 'mirror_interviews'; referencedColumns: ['id'] }
        ]
      }
      mirror_target_gap_matches: {
        Row: {
          id: string
          user_id: string
          target_id: string
          skill_name: string
          skill_weight: string
          jd_quote: string | null
          claim_id: string | null
          match_status: string
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          target_id: string
          skill_name: string
          skill_weight: string
          jd_quote?: string | null
          claim_id?: string | null
          match_status: string
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_id?: string
          skill_name?: string
          skill_weight?: string
          jd_quote?: string | null
          claim_id?: string | null
          match_status?: string
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'mirror_target_gap_matches_target_id_fkey'; columns: ['target_id']; isOneToOne: false; referencedRelation: 'mirror_targets'; referencedColumns: ['id'] },
          { foreignKeyName: 'mirror_target_gap_matches_claim_id_fkey'; columns: ['claim_id']; isOneToOne: false; referencedRelation: 'mirror_resume_claims'; referencedColumns: ['id'] }
        ]
      }
      mirror_targets: {
        Row: {
          id: string
          workspace_id: string
          company: string
          role: string
          interview_date: string | null
          jd: string
          status: string
          skills: Json
          rounds: Json
          events: Json
          debriefs: Json
          next_step: string | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          company: string
          role: string
          interview_date?: string | null
          jd: string
          status?: string
          skills: Json
          rounds: Json
          events: Json
          debriefs: Json
          next_step?: string | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          company?: string
          role?: string
          interview_date?: string | null
          jd?: string
          status?: string
          skills?: Json
          rounds?: Json
          events?: Json
          debriefs?: Json
          next_step?: string | null
          created_at?: string
          user_id?: string | null
        }
        Relationships: [
          { foreignKeyName: 'mirror_targets_workspace_id_fkey'; columns: ['workspace_id']; isOneToOne: false; referencedRelation: 'mirror_workspaces'; referencedColumns: ['slug'] }
        ]
      }
      mirror_turns: {
        Row: {
          id: string
          workspace_id: string
          interview_id: string
          question_index: number
          question: string
          answer: string
          transcript_source: string
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          interview_id: string
          question_index: number
          question: string
          answer: string
          transcript_source?: string
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          interview_id?: string
          question_index?: number
          question?: string
          answer?: string
          transcript_source?: string
          created_at?: string
          user_id?: string | null
        }
        Relationships: [
          { foreignKeyName: 'mirror_turns_workspace_id_fkey'; columns: ['workspace_id']; isOneToOne: false; referencedRelation: 'mirror_workspaces'; referencedColumns: ['slug'] },
          { foreignKeyName: 'mirror_turns_interview_id_fkey'; columns: ['interview_id']; isOneToOne: false; referencedRelation: 'mirror_interviews'; referencedColumns: ['id'] }
        ]
      }
      mirror_workspaces: {
        Row: {
          slug: string
          created_at: string
          user_id: string | null
        }
        Insert: {
          slug: string
          created_at?: string
          user_id?: string | null
        }
        Update: {
          slug?: string
          created_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
