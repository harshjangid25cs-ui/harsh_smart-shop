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

    const amountInRupees = (amount / 100).toFixed(2);

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
          <div style="font-family: sans-serif; max-w: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #333; text-align: center;">Verify Your Order</h2>
            <p style="color: #555; font-size: 16px;">Please use the following 6-digit code to verify your Cash on Delivery order of ₹${amountInRupees}.</p>
            <div style="background-color: #f4f4f5; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111;">${otp}</span>
            </div>
            <p style="color: #777; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
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
