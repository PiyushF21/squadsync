import { createClient } from '@supabase/supabase-js';

// Replace these with your actual URL and Key from the Supabase Dashboard
const supabaseUrl = 'https://pwpvewcdvxtyattcgoro.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cHZld2Nkdnh0eWF0dGNnb3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODMyNzIsImV4cCI6MjA4ODk1OTI3Mn0.tr1pCNPbG4oLODEzpUWctV6MtXqVZb4ftE5J76EJJIA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);