import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, message } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  // ── Step 1: Save to Supabase (source of truth, never fails silently) ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error: dbError } = await supabase
      .from("waitlist")
      .upsert({ email, message: message || null }, { onConflict: "email" });

    if (dbError) {
      console.error("[request-access] DB error:", dbError.message);
    } else {
      console.info("[request-access] Saved to waitlist:", email);
    }
  } else {
    console.warn("[request-access] SUPABASE_SERVICE_ROLE_KEY not set — skipping DB save");
  }

  // ── Step 2: Send email notification (best-effort, won't block success) ──
  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL;

  if (resendKey && notifyEmail) {
    const body = [
      `New access request for HeyPoco`,
      ``,
      `From: ${email}`,
      message ? `Message: ${message}` : `Message: (none)`,
      ``,
      `Sent at: ${new Date().toISOString()}`,
    ].join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [notifyEmail],
        subject: `HeyPoco access request from ${email}`,
        text: body,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Log but don't fail — entry is already saved in DB
      console.error("[request-access] Resend error:", res.status, JSON.stringify(data));
    } else {
      console.info("[request-access] Email sent, id:", (data as Record<string, unknown>).id);
    }
  }

  return NextResponse.json({ ok: true });
}
