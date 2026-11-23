export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      admin_emails: {
        Row: {
          email: string;
        };
        Insert: {
          email: string;
        };
        Update: {
          email?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          role: "admin" | "student";
          full_name?: string | null;
          grade?: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: "admin" | "student";
          full_name?: string | null;
          grade?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: "admin" | "student";
          full_name?: string | null;
          grade?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      classes: {
        Row: {
          id: string;
          grade: number;
        };
        Insert: {
          id?: string;
          grade: number;
        };
        Update: {
          id?: string;
          grade?: number;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          class_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          }
        ];
      };
      tests: {
        Row: {
          id: string;
          subject_id: string;
          title: string;
          duration_minutes: number | null;
          marks_per_question: number;
          negative_marks: number;
          show_result: boolean;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          title: string;
          duration_minutes?: number | null;
          marks_per_question?: number;
          negative_marks?: number;
          show_result?: boolean;
          is_published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          title?: string;
          duration_minutes?: number | null;
          marks_per_question?: number;
          negative_marks?: number;
          show_result?: boolean;
          is_published?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tests_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      questions: {
        Row: {
          id: string;
          test_id: string;
          position: number;
          question_text: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_option: "A" | "B" | "C" | "D";
          explanation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          test_id: string;
          position: number;
          question_text: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_option: "A" | "B" | "C" | "D";
          explanation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          test_id?: string;
          position?: number;
          question_text?: string;
          option_a?: string;
          option_b?: string;
          option_c?: string;
          option_d?: string;
          correct_option?: "A" | "B" | "C" | "D";
          explanation?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          }
        ];
      };
      attempts: {
        Row: {
          id: string;
          test_id: string;
          student_id: string;
          student_name: string;
          class_id: string;
          total_questions: number;
          correct: number;
          wrong: number;
          unanswered: number;
          score: number;
          started_at: string;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          test_id: string;
          student_id: string;
          student_name: string;
          class_id: string;
          total_questions?: number;
          correct?: number;
          wrong?: number;
          unanswered?: number;
          score?: number;
          started_at?: string;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          test_id?: string;
          student_id?: string;
          student_name?: string;
          class_id?: string;
          total_questions?: number;
          correct?: number;
          wrong?: number;
          unanswered?: number;
          score?: number;
          started_at?: string;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          }
        ];
      };
      attempt_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option: "A" | "B" | "C" | "D" | null;
          is_correct: boolean;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_option?: "A" | "B" | "C" | "D" | null;
          is_correct: boolean;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string;
          selected_option?: "A" | "B" | "C" | "D" | null;
          is_correct?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          }
        ];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: {
          key?: string;
          value?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_test_questions: {
        Args: {
          p_test_id: string;
        };
        Returns: {
          id: string;
          test_id: string;
          position: number;
          question_text: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
        }[];
      };
      submit_attempt: {
        Args: {
          p_test_id: string;
          p_student_name: string;
          p_class_id: string;
          p_answers: Json;
        };
        Returns: {
          success: boolean;
          show_result: boolean;
          attempt_id: string;
          score?: number;
          total_questions?: number;
          correct?: number;
          wrong?: number;
          unanswered?: number;
        };
      };
      get_attempt_result: {
        Args: {
          p_attempt_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      user_role: "admin" | "student";
      mcq_option: "A" | "B" | "C" | "D";
    };
  };
}
