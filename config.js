// =====================================================================
// BULLSEYE — the only file you edit by hand.
//
// 1) In Supabase open your project, then Project Settings -> API.
// 2) Copy the "Project URL" and paste it between the quotes below.
// 3) Copy the "anon" / "public" key (the long one) and paste it below.
//
// The anon key is meant to be public. It is safe here because the
// database rules (setup.sql) decide what visitors can do.
// NEVER paste the "service_role" key anywhere in this site.
// =====================================================================
window.BULLSEYE_CONFIG = {
  SUPABASE_URL: "PASTE_PROJECT_URL_HERE",
  SUPABASE_ANON_KEY: "PASTE_ANON_KEY_HERE",

  // Product categories shown on the site and in the admin page.
  CATEGORIES: ["Men", "Women", "Unisex", "Accessories"]
};
