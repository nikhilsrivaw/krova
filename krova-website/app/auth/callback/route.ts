import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Register user in KROVA DB (idempotent)
      const fullName =
        data.user.user_metadata?.full_name ||
        data.user.email?.split("@")[0] ||
        "";
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/register`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supabase_user_id: data.user.id,
              email: data.user.email,
              full_name: fullName,
            }),
          }
        );
      } catch {
        // Non-fatal
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send to login with error flag
  return NextResponse.redirect(`${origin}/login?error=email_confirmation_failed`);
}
