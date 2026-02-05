
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sdssnqkyejlzoaqxyauw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkc3NucWt5ZWpsem9hcXh5YXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTMyMTMsImV4cCI6MjA4NTg2OTIxM30.-U6bVaJy6D8445o-my2qBGXNsd3S7pKoK05e3WbDhHI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
