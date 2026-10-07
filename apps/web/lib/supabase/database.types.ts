// Generato dallo schema Supabase (progetto qxqqlvzrkzxgvkszemme). Rigenerare con `npm run db:types`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type JobRow = {
  attempts: number;
  claimed_at: string | null;
  claimed_by: string | null;
  created_at: string;
  dedupe_key: string | null;
  error: string | null;
  finished_at: string | null;
  heartbeat_at: string | null;
  id: string;
  max_attempts: number;
  params: Json;
  priority: number;
  progress: Json;
  result: Json | null;
  scheduled_for: string;
  started_at: string | null;
  status: Database['public']['Enums']['job_status'];
  type: string;
  updated_at: string;
  user_id: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      api_tokens: {
        Row: {
          created_at: string;
          id: string;
          label: string | null;
          last_used_at: string | null;
          revoked_at: string | null;
          token_hash: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label?: string | null;
          last_used_at?: string | null;
          revoked_at?: string | null;
          token_hash: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string | null;
          last_used_at?: string | null;
          revoked_at?: string | null;
          token_hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'api_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      deep_views: {
        Row: {
          alias: string;
          created_at: string;
          id: string;
          job_id: string | null;
          keyword_id: string;
          pages: number;
          summary: Json | null;
          user_id: string;
        };
        Insert: {
          alias?: string;
          created_at?: string;
          id?: string;
          job_id?: string | null;
          keyword_id: string;
          pages?: number;
          summary?: Json | null;
          user_id: string;
        };
        Update: {
          alias?: string;
          created_at?: string;
          id?: string;
          job_id?: string | null;
          keyword_id?: string;
          pages?: number;
          summary?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'deep_views_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deep_views_keyword_id_fkey';
            columns: ['keyword_id'];
            isOneToOne: false;
            referencedRelation: 'keywords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deep_views_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      jobs: {
        Row: JobRow;
        Insert: {
          attempts?: number;
          claimed_at?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          dedupe_key?: string | null;
          error?: string | null;
          finished_at?: string | null;
          heartbeat_at?: string | null;
          id?: string;
          max_attempts?: number;
          params: Json;
          priority?: number;
          progress?: Json;
          result?: Json | null;
          scheduled_for?: string;
          started_at?: string | null;
          status?: Database['public']['Enums']['job_status'];
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          claimed_at?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          dedupe_key?: string | null;
          error?: string | null;
          finished_at?: string | null;
          heartbeat_at?: string | null;
          id?: string;
          max_attempts?: number;
          params?: Json;
          priority?: number;
          progress?: Json;
          result?: Json | null;
          scheduled_for?: string;
          started_at?: string | null;
          status?: Database['public']['Enums']['job_status'];
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'jobs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      keyword_rank_snapshots: {
        Row: {
          absolute_position: number | null;
          asin: string;
          captured_at: string;
          found: boolean;
          id: number;
          is_sponsored: boolean | null;
          job_id: string | null;
          organic_position: number | null;
          page: number | null;
          position: number | null;
          serp_snapshot_id: string | null;
          tracked_keyword_id: string;
          user_id: string;
        };
        Insert: {
          absolute_position?: number | null;
          asin: string;
          captured_at?: string;
          found: boolean;
          id?: never;
          is_sponsored?: boolean | null;
          job_id?: string | null;
          organic_position?: number | null;
          page?: number | null;
          position?: number | null;
          serp_snapshot_id?: string | null;
          tracked_keyword_id: string;
          user_id: string;
        };
        Update: {
          absolute_position?: number | null;
          asin?: string;
          captured_at?: string;
          found?: boolean;
          id?: never;
          is_sponsored?: boolean | null;
          job_id?: string | null;
          organic_position?: number | null;
          page?: number | null;
          position?: number | null;
          serp_snapshot_id?: string | null;
          tracked_keyword_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'keyword_rank_snapshots_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'keyword_rank_snapshots_serp_snapshot_id_fkey';
            columns: ['serp_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'serp_snapshots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'keyword_rank_snapshots_tracked_keyword_id_fkey';
            columns: ['tracked_keyword_id'];
            isOneToOne: false;
            referencedRelation: 'tracked_keywords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'keyword_rank_snapshots_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      keyword_suggestions: {
        Row: {
          alias: string;
          created_at: string;
          depth: number;
          id: number;
          normalized: string;
          position: number | null;
          session_id: string;
          source_query: string;
          suggestion: string;
          user_id: string;
        };
        Insert: {
          alias: string;
          created_at?: string;
          depth?: number;
          id?: never;
          normalized: string;
          position?: number | null;
          session_id: string;
          source_query: string;
          suggestion: string;
          user_id: string;
        };
        Update: {
          alias?: string;
          created_at?: string;
          depth?: number;
          id?: never;
          normalized?: string;
          position?: number | null;
          session_id?: string;
          source_query?: string;
          suggestion?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'keyword_suggestions_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'research_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'keyword_suggestions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      keywords: {
        Row: {
          created_at: string;
          id: string;
          marketplace: string;
          normalized: string;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          marketplace?: string;
          normalized: string;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          marketplace?: string;
          normalized?: string;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'keywords_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      niche_items: {
        Row: {
          asin: string | null;
          created_at: string;
          id: string;
          keyword_id: string | null;
          kind: string;
          niche_id: string;
          note: string | null;
          user_id: string;
        };
        Insert: {
          asin?: string | null;
          created_at?: string;
          id?: string;
          keyword_id?: string | null;
          kind: string;
          niche_id: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          asin?: string | null;
          created_at?: string;
          id?: string;
          keyword_id?: string | null;
          kind?: string;
          niche_id?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'niche_items_keyword_id_fkey';
            columns: ['keyword_id'];
            isOneToOne: false;
            referencedRelation: 'keywords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'niche_items_niche_id_fkey';
            columns: ['niche_id'];
            isOneToOne: false;
            referencedRelation: 'niches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'niche_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      niches: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'niches_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      product_snapshots: {
        Row: {
          asin: string;
          bsr: number | null;
          bsr_store: string | null;
          captured_at: string;
          category_ranks: Json;
          currency: string;
          est_daily_sales: number | null;
          formats: Json;
          id: number;
          job_id: string | null;
          price_cents: number | null;
          rating: number | null;
          reviews_count: number | null;
          source: string;
        };
        Insert: {
          asin: string;
          bsr?: number | null;
          bsr_store?: string | null;
          captured_at?: string;
          category_ranks?: Json;
          currency?: string;
          est_daily_sales?: number | null;
          formats?: Json;
          id?: never;
          job_id?: string | null;
          price_cents?: number | null;
          rating?: number | null;
          reviews_count?: number | null;
          source: string;
        };
        Update: {
          asin?: string;
          bsr?: number | null;
          bsr_store?: string | null;
          captured_at?: string;
          category_ranks?: Json;
          currency?: string;
          est_daily_sales?: number | null;
          formats?: Json;
          id?: never;
          job_id?: string | null;
          price_cents?: number | null;
          rating?: number | null;
          reviews_count?: number | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_snapshots_asin_fkey';
            columns: ['asin'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['asin'];
          },
          {
            foreignKeyName: 'product_snapshots_job_fk';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          asin: string;
          authors: string[];
          categories: Json;
          created_by: string | null;
          dimensions: string | null;
          first_seen_at: string;
          format: string | null;
          has_aplus: boolean | null;
          image_url: string | null;
          is_independent: boolean | null;
          isbn13: string | null;
          language: string | null;
          last_seen_at: string;
          marketplace: string;
          page_count: number | null;
          pub_date: string | null;
          publisher: string | null;
          subtitle: string | null;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          asin: string;
          authors?: string[];
          categories?: Json;
          created_by?: string | null;
          dimensions?: string | null;
          first_seen_at?: string;
          format?: string | null;
          has_aplus?: boolean | null;
          image_url?: string | null;
          is_independent?: boolean | null;
          isbn13?: string | null;
          language?: string | null;
          last_seen_at?: string;
          marketplace?: string;
          page_count?: number | null;
          pub_date?: string | null;
          publisher?: string | null;
          subtitle?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          asin?: string;
          authors?: string[];
          categories?: Json;
          created_by?: string | null;
          dimensions?: string | null;
          first_seen_at?: string;
          format?: string | null;
          has_aplus?: boolean | null;
          image_url?: string | null;
          is_independent?: boolean | null;
          isbn13?: string | null;
          language?: string | null;
          last_seen_at?: string;
          marketplace?: string;
          page_count?: number | null;
          pub_date?: string | null;
          publisher?: string | null;
          subtitle?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          plan: string;
          settings: Json;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          plan?: string;
          settings?: Json;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          plan?: string;
          settings?: Json;
        };
        Relationships: [];
      };
      research_sessions: {
        Row: {
          alias: string;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          options: Json;
          seed: string;
          stats: Json;
          user_id: string;
        };
        Insert: {
          alias?: string;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          options?: Json;
          seed: string;
          stats?: Json;
          user_id: string;
        };
        Update: {
          alias?: string;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          options?: Json;
          seed?: string;
          stats?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'research_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reverse_asin_results: {
        Row: {
          checked_at: string;
          found: boolean;
          id: number;
          keyword: string;
          organic_position: number | null;
          page: number | null;
          position: number | null;
          run_id: string;
          total_results_est: number | null;
          user_id: string;
        };
        Insert: {
          checked_at?: string;
          found: boolean;
          id?: never;
          keyword: string;
          organic_position?: number | null;
          page?: number | null;
          position?: number | null;
          run_id: string;
          total_results_est?: number | null;
          user_id: string;
        };
        Update: {
          checked_at?: string;
          found?: boolean;
          id?: never;
          keyword?: string;
          organic_position?: number | null;
          page?: number | null;
          position?: number | null;
          run_id?: string;
          total_results_est?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reverse_asin_results_run_id_fkey';
            columns: ['run_id'];
            isOneToOne: false;
            referencedRelation: 'reverse_asin_runs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reverse_asin_results_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reverse_asin_runs: {
        Row: {
          asin: string;
          candidates: Json;
          created_at: string;
          id: string;
          job_id: string | null;
          user_id: string;
        };
        Insert: {
          asin: string;
          candidates?: Json;
          created_at?: string;
          id?: string;
          job_id?: string | null;
          user_id: string;
        };
        Update: {
          asin?: string;
          candidates?: Json;
          created_at?: string;
          id?: string;
          job_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reverse_asin_runs_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reverse_asin_runs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      serp_items: {
        Row: {
          asin: string;
          author: string | null;
          format: string | null;
          id: number;
          image_url: string | null;
          is_sponsored: boolean;
          organic_position: number | null;
          position: number;
          price_cents: number | null;
          pub_date: string | null;
          rating: number | null;
          reviews_count: number | null;
          serp_snapshot_id: string;
          title: string | null;
          user_id: string;
        };
        Insert: {
          asin: string;
          author?: string | null;
          format?: string | null;
          id?: never;
          image_url?: string | null;
          is_sponsored?: boolean;
          organic_position?: number | null;
          position: number;
          price_cents?: number | null;
          pub_date?: string | null;
          rating?: number | null;
          reviews_count?: number | null;
          serp_snapshot_id: string;
          title?: string | null;
          user_id: string;
        };
        Update: {
          asin?: string;
          author?: string | null;
          format?: string | null;
          id?: never;
          image_url?: string | null;
          is_sponsored?: boolean;
          organic_position?: number | null;
          position?: number;
          price_cents?: number | null;
          pub_date?: string | null;
          rating?: number | null;
          reviews_count?: number | null;
          serp_snapshot_id?: string;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'serp_items_serp_snapshot_id_fkey';
            columns: ['serp_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'serp_snapshots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'serp_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      serp_snapshots: {
        Row: {
          alias: string;
          captured_at: string;
          id: string;
          job_id: string | null;
          keyword_id: string;
          organic_count: number | null;
          page: number;
          source: string;
          sponsored_count: number | null;
          total_results_est: number | null;
          total_results_text: string | null;
          user_id: string;
        };
        Insert: {
          alias?: string;
          captured_at?: string;
          id?: string;
          job_id?: string | null;
          keyword_id: string;
          organic_count?: number | null;
          page?: number;
          source: string;
          sponsored_count?: number | null;
          total_results_est?: number | null;
          total_results_text?: string | null;
          user_id: string;
        };
        Update: {
          alias?: string;
          captured_at?: string;
          id?: string;
          job_id?: string | null;
          keyword_id?: string;
          organic_count?: number | null;
          page?: number;
          source?: string;
          sponsored_count?: number | null;
          total_results_est?: number | null;
          total_results_text?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'serp_snapshots_job_fk';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'serp_snapshots_keyword_id_fkey';
            columns: ['keyword_id'];
            isOneToOne: false;
            referencedRelation: 'keywords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'serp_snapshots_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tracked_asins: {
        Row: {
          active: boolean;
          asin: string;
          created_at: string;
          id: string;
          is_mine: boolean;
          label: string | null;
          last_run_at: string | null;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          asin: string;
          created_at?: string;
          id?: string;
          is_mine?: boolean;
          label?: string | null;
          last_run_at?: string | null;
          user_id: string;
        };
        Update: {
          active?: boolean;
          asin?: string;
          created_at?: string;
          id?: string;
          is_mine?: boolean;
          label?: string | null;
          last_run_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tracked_asins_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tracked_keywords: {
        Row: {
          active: boolean;
          alias: string;
          created_at: string;
          id: string;
          keyword_id: string;
          last_run_at: string | null;
          pages: number;
          user_id: string;
          watch_asins: string[];
        };
        Insert: {
          active?: boolean;
          alias?: string;
          created_at?: string;
          id?: string;
          keyword_id: string;
          last_run_at?: string | null;
          pages?: number;
          user_id: string;
          watch_asins?: string[];
        };
        Update: {
          active?: boolean;
          alias?: string;
          created_at?: string;
          id?: string;
          keyword_id?: string;
          last_run_at?: string | null;
          pages?: number;
          user_id?: string;
          watch_asins?: string[];
        };
        Relationships: [
          {
            foreignKeyName: 'tracked_keywords_keyword_id_fkey';
            columns: ['keyword_id'];
            isOneToOne: false;
            referencedRelation: 'keywords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tracked_keywords_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_jobs: {
        Args: { p_limit?: number; p_user_id: string; p_worker: string };
        Returns: JobRow[];
        SetofOptions: {
          from: '*';
          to: 'jobs';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      requeue_stale_jobs: { Args: { p_user_id: string }; Returns: number };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
    };
    Enums: {
      job_status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Update'];
export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T];

export const Constants = {
  public: {
    Enums: {
      job_status: ['pending', 'running', 'done', 'failed', 'cancelled'],
    },
  },
} as const;
