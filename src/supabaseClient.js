import { createClient } from '@supabase/supabase-js'


export const supabase = createClient(
  'https://abfvhfspsocxlmvclnzf.supabase.co',  // ← cole o seu
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZnZoZnNwc29jeGxtdmNsbnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNTExNTksImV4cCI6MjA5NTkyNzE1OX0.2lRfsMJfhimu_K0C1lWV-k4SdrBHUQwjtS-jbU3-Yy8'                           // ← cole o seu
)
