import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hqoarweusnhrqjcoontu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhxb2Fyd2V1c25ocnFqY29vbnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTQyNzYsImV4cCI6MjA2Mjk3MDI3Nn0.rlDWQo6hSOD2dGciwSmIeedzkHPagl2-j9L3XARsu-w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
