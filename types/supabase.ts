export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// This matches your Supabase public schema as defined in the SQL we created.
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }

      inventory_locations: {
        Row: {
          id: string
          name: string
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }

      acquisition_sources: {
        Row: {
          id: string
          name: string
          source_type: Database["public"]["Enums"]["acquisition_source_type"]
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          source_type?: Database["public"]["Enums"]["acquisition_source_type"]
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          source_type?: Database["public"]["Enums"]["acquisition_source_type"]
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }

      listing_platforms: {
        Row: {
          id: string
          name: string
          slug: string
          default_fee_percent: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          default_fee_percent?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          default_fee_percent?: number | null
          created_at?: string | null
        }
        Relationships: []
      }

      tags: {
        Row: {
          id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: []
      }

      items: {
        Row: {
          id: string
          owner_id: string
          title: string
          status: Database["public"]["Enums"]["item_status"]
          category: string | null
          brand_or_maker: string | null
          style_or_era: string | null
          material: string | null
          color: string | null
          dimensions_guess: string | null
          condition_summary: string | null
          estimated_low_price: number | null
          estimated_high_price: number | null
          suggested_list_price: number | null
          ai_status: Database["public"]["Enums"]["ai_status"]
          ai_error: string | null
          category_id: string | null
          location_id: string | null
          condition_grade: Database["public"]["Enums"]["item_condition_grade"] | null
          is_restored: boolean
          is_deleted: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          status?: Database["public"]["Enums"]["item_status"]
          category?: string | null
          brand_or_maker?: string | null
          style_or_era?: string | null
          material?: string | null
          color?: string | null
          dimensions_guess?: string | null
          condition_summary?: string | null
          estimated_low_price?: number | null
          estimated_high_price?: number | null
          suggested_list_price?: number | null
          ai_status?: Database["public"]["Enums"]["ai_status"]
          ai_error?: string | null
          category_id?: string | null
          location_id?: string | null
          condition_grade?: Database["public"]["Enums"]["item_condition_grade"] | null
          is_restored?: boolean
          is_deleted?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          status?: Database["public"]["Enums"]["item_status"]
          category?: string | null
          brand_or_maker?: string | null
          style_or_era?: string | null
          material?: string | null
          color?: string | null
          dimensions_guess?: string | null
          condition_summary?: string | null
          estimated_low_price?: number | null
          estimated_high_price?: number | null
          suggested_list_price?: number | null
          ai_status?: Database["public"]["Enums"]["ai_status"]
          ai_error?: string | null
          category_id?: string | null
          location_id?: string | null
          condition_grade?: Database["public"]["Enums"]["item_condition_grade"] | null
          is_restored?: boolean
          is_deleted?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          }
        ]
      }

      item_images: {
        Row: {
          id: string
          item_id: string
          url: string
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          url: string
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          url?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "items"
            referencedColumns: ["id"]
          }
        ]
      }

      purchases: {
        Row: {
          id: string
          item_id: string
          purchase_price: number | null
          additional_costs: number | null
          source: string | null
          source_id: string | null
          purchase_date: string | null // date
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          purchase_price?: number | null
          additional_costs?: number | null
          source?: string | null
          source_id?: string | null
          purchase_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          purchase_price?: number | null
          additional_costs?: number | null
          source?: string | null
          source_id?: string | null
          purchase_date?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_source_id_fkey"
            columns: ["source_id"]
            referencedRelation: "acquisition_sources"
            referencedColumns: ["id"]
          }
        ]
      }

      listings: {
        Row: {
          id: string
          item_id: string
          platform_id: string | null
          status: Database["public"]["Enums"]["listing_status"]
          listing_url: string | null
          listing_price: number | null
          shipping_price: number | null
          fees_estimate: number | null
          date_listed: string | null // date
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          platform_id?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          listing_url?: string | null
          listing_price?: number | null
          shipping_price?: number | null
          fees_estimate?: number | null
          date_listed?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          platform_id?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          listing_url?: string | null
          listing_price?: number | null
          shipping_price?: number | null
          fees_estimate?: number | null
          date_listed?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_platform_id_fkey"
            columns: ["platform_id"]
            referencedRelation: "listing_platforms"
            referencedColumns: ["id"]
          }
        ]
      }

      sales: {
        Row: {
          id: string
          item_id: string
          sale_price: number | null
          shipping_cost: number | null
          platform_fees: number | null
          other_fees: number | null
          sale_date: string | null // date
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          sale_price?: number | null
          shipping_cost?: number | null
          platform_fees?: number | null
          other_fees?: number | null
          sale_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          sale_price?: number | null
          shipping_cost?: number | null
          platform_fees?: number | null
          other_fees?: number | null
          sale_date?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "items"
            referencedColumns: ["id"]
          }
        ]
      }

      item_tags: {
        Row: {
          item_id: string
          tag_id: string
          created_at: string | null
        }
        Insert: {
          item_id: string
          tag_id: string
          created_at?: string | null
        }
        Update: {
          item_id?: string
          tag_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_tags_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_usage: {
        Row: {
          id: string
          user_id: string
          item_id: string | null
          listing_id: string | null
          endpoint: string | null
          model: string | null
          prompt_tokens: number | null
          completion_tokens: number | null
          total_cost_usd: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          item_id?: string | null
          listing_id?: string | null
          endpoint?: string | null
          model?: string | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          total_cost_usd?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string | null
          listing_id?: string | null
          endpoint?: string | null
          model?: string | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          total_cost_usd?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }

        Row: {
          item_id: string
          tag_id: string
          created_at: string | null
        }
        Insert: {
          item_id: string
          tag_id: string
          created_at?: string | null
        }
        Update: {
          item_id?: string
          tag_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_tags_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags"
            referencedColumns: ["id"]
          }
        ]
      }
    }

    Views: {
      [key: string]: never
    }

    Functions: {
      [key: string]: never
    }

    Enums: {
      item_status: "new" | "identified" | "listed" | "sold"
      ai_status: "idle" | "pending" | "complete" | "error"
      item_condition_grade:
        | "mint"
        | "excellent"
        | "very_good"
        | "good"
        | "fair"
        | "poor"
      acquisition_source_type:
        | "thrift_store"
        | "estate_sale"
        | "flea_market"
        | "online_marketplace"
        | "auction_house"
        | "other"
      listing_status: "draft" | "live" | "ended"
    }

    CompositeTypes: {
      [key: string]: never
    }
  }
}
