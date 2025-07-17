import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      fuel_sales: {
        Row: {
          id: number;
          date: string;
          rate_per_liter: number;
          dispenser_open: number;
          dispenser_close: number;
          units_sold: number;
          total_sale: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          date: string;
          rate_per_liter: number;
          dispenser_open: number;
          dispenser_close: number;
          units_sold: number;
          total_sale: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          date?: string;
          rate_per_liter?: number;
          dispenser_open?: number;
          dispenser_close?: number;
          units_sold?: number;
          total_sale?: number;
          created_at?: string;
        };
      };
    };
  };
};