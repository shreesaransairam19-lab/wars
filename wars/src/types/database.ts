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
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_path: string | null;
          bio: string | null;
          theme: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          theme?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          theme?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          priority: number;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          priority?: number;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string | null;
          priority?: number;
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: number;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          user_id: string;
          role_id: number;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Update: {
          user_id?: string;
          role_id?: number;
          assigned_by?: string | null;
          assigned_at?: string;
        };
      };
      series: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          content_type: string;
          cover_path: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          content_type: string;
          cover_path?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          content_type?: string;
          cover_path?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chapters: {
        Row: {
          id: string;
          series_id: string;
          title: string;
          slug: string;
          chapter_number: number;
          volume_number: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          series_id: string;
          title: string;
          slug: string;
          chapter_number: number;
          volume_number?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          series_id?: string;
          title?: string;
          slug?: string;
          chapter_number?: number;
          volume_number?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chapter_assets: {
        Row: {
          id: string;
          chapter_id: string;
          asset_type: string;
          storage_path: string;
          mime_type: string;
          byte_size: number;
          page_number: number | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          asset_type: string;
          storage_path: string;
          mime_type: string;
          byte_size: number;
          page_number?: number | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          chapter_id?: string;
          asset_type?: string;
          storage_path?: string;
          mime_type?: string;
          byte_size?: number;
          page_number?: number | null;
          order_index?: number;
          created_at?: string;
        };
      };
      reading_progress: {
        Row: {
          user_id: string;
          chapter_id: string;
          position: number;
          completed: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          chapter_id: string;
          position?: number;
          completed?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          chapter_id?: string;
          position?: number;
          completed?: boolean;
          updated_at?: string;
        };
      };
      bookmarks: {
        Row: {
          user_id: string;
          series_id: string;
          chapter_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          series_id: string;
          chapter_id?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          series_id?: string;
          chapter_id?: string | null;
          created_at?: string;
        };
      };
      ratings: {
        Row: {
          user_id: string;
          series_id: string;
          rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          series_id: string;
          rating: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          series_id?: string;
          rating?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          series_id: string;
          chapter_id: string | null;
          content: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          series_id: string;
          chapter_id?: string | null;
          content: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          series_id?: string;
          chapter_id?: string | null;
          content?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      review_replies: {
        Row: {
          id: string;
          review_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      chat_rooms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          room_type: string;
          visibility: string;
          parent_room_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          room_type?: string;
          visibility?: string;
          parent_room_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          room_type?: string;
          visibility?: string;
          parent_room_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      chat_room_members: {
        Row: {
          room_id: string;
          user_id: string;
          role: string;
          muted_until: string | null;
          joined_at: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
          role?: string;
          muted_until?: string | null;
          joined_at?: string;
        };
        Update: {
          room_id?: string;
          user_id?: string;
          role?: string;
          muted_until?: string | null;
          joined_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          message_type: string;
          reply_to: string | null;
          is_deleted: boolean;
          edited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id: string;
          content: string;
          message_type?: string;
          reply_to?: string | null;
          is_deleted?: boolean;
          edited_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: string;
          reply_to?: string | null;
          is_deleted?: boolean;
          edited_at?: string | null;
          created_at?: string;
        };
      };
      message_reactions: {
        Row: {
          message_id: string;
          user_id: string;
          reaction: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          reaction: string;
          created_at?: string;
        };
        Update: {
          message_id?: string;
          user_id?: string;
          reaction?: string;
          created_at?: string;
        };
      };
      moderation_actions: {
        Row: {
          id: string;
          actor_id: string;
          target_type: string;
          target_id: string;
          action: string;
          reason: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          target_type: string;
          target_id: string;
          action: string;
          reason?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          target_type?: string;
          target_id?: string;
          action?: string;
          reason?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          status: string;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          status?: string;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_type?: string;
          target_id?: string;
          reason?: string;
          status?: string;
          reviewed_by?: string | null;
          created_at?: string;
        };
      };
      feedback: {
        Row: {
          id: string;
          sender_id: string | null;
          name: string | null;
          content: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id?: string | null;
          name?: string | null;
          content: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string | null;
          name?: string | null;
          content?: string;
          status?: string;
          created_at?: string;
        };
      };
      ban_appeals: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          status: string;
          reviewed_by: string | null;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          status?: string;
          reviewed_by?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          status?: string;
          reviewed_by?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
      };
      xp_ledger: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          source_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: string;
          source_id?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: never;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: string;
          price_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          price_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          price_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Series = Database["public"]["Tables"]["series"]["Row"];
export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type ChapterAsset = Database["public"]["Tables"]["chapter_assets"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type ChatRoom = Database["public"]["Tables"]["chat_rooms"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Rating = Database["public"]["Tables"]["ratings"]["Row"];
export type ReadingProgress =
  Database["public"]["Tables"]["reading_progress"]["Row"];
export type XpLedger = Database["public"]["Tables"]["xp_ledger"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
export type ModerationAction =
  Database["public"]["Tables"]["moderation_actions"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
export type BanAppeal = Database["public"]["Tables"]["ban_appeals"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
