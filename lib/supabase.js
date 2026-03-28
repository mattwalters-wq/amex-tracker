import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.warn('Supabase URL not configured')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
