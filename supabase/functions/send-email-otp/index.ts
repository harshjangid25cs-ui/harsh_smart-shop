import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { order_id, email, amount } = await req.json();

    if (!email || !order_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

    // 2. Hash OTP (salted with order_id)
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + order_id);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 3. Store in DB
    const { error: dbError } = await supabase.from("otp_verifications").insert({
      order_id,
      email,
      otp_hash: otpHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      ip_address: req.headers.get("x-forwarded-for") || "unknown"
    });

    if (dbError) throw dbError;

    // 4. Send Email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");

    const amountInRupees = Math.round((amount || 0) / 100).toLocaleString('en-IN');

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Your Store <onboarding@resend.dev>",
        to: email,
        subject: "Your Order Verification Code",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-w: 520px; margin: 0 auto; padding: 28px; border: 1px solid #eaeaea; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="background-color: #111; color: #fff; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">SECURE COD VERIFICATION</span>
            </div>
            <h2 style="color: #111; text-align: center; font-size: 22px; margin-top: 10px;">Verify Your COD Order</h2>
            <p style="color: #444; font-size: 15px; line-height: 1.6; text-align: center;">Please use the following 6-digit verification code to confirm your Cash on Delivery order of <strong>₹${amountInRupees}</strong>.</p>
            <div style="background-color: #f5f6f8; border: 1px dashed #cccccc; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0;">
              <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #000;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 13px; text-align: center; margin-top: 20px;">This one-time passcode will expire in 10 minutes. Zero advance payment required.</p>
          </div>
        `
      })
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      if (emailResponse.status === 429) {
        throw new Error("Rate limit exceeded for sending emails.");
      }
      throw new Error(`Resend API Error: ${emailResult.message || JSON.stringify(emailResult)}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      expires_in: '10 minutes',
      message: 'OTP sent successfully'
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("Error sending email OTP:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
