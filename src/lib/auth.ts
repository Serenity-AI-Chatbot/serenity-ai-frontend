import { supabase } from "./supabase"

export async function getUserName(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.user_metadata?.full_name || "there"
}

