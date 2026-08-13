/* Public project credentials only. Never place a database password or secret key here. */
const FOOD_FLOW_SUPABASE_URL = "https://dtqfejprdxatsunhrpsy.supabase.co";
const FOOD_FLOW_SUPABASE_KEY = "sb_publishable_skd2aiIzIxgwPSWVYduT4w_ebLd3fUs";

window.foodFlowSupabase = window.supabase.createClient(
  FOOD_FLOW_SUPABASE_URL,
  FOOD_FLOW_SUPABASE_KEY
);
