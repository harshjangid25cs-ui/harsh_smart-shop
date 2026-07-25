import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CODRequest {
  phone: string;
  name: string;
  address: string;
  pincode: string;
  product_id: string;
  product_name: string;
  amount: number; // in paise
  device_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body: CODRequest = await req.json();
    
    // Phone regex check
    if (!/^[6-9]\d{9}$/.test(body.phone)) {
       return new Response(JSON.stringify({ error: "Invalid Indian phone number" }), {
           status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
       });
    }

    // === GATE 1: Pincode Serviceability ===
    // Mock check here
    if (["999999", "000000"].includes(body.pincode)) {
      return new Response(
        JSON.stringify({ error: "COD not available for this pincode" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // === GATE 2: Order Creation (Pending State) ===
    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert({
        customer_phone: body.phone,
        customer_name: body.name,
        full_address: body.address,
        pincode: body.pincode,
        product_id: body.product_id,
        product_name: body.product_name,
        cod_amount: body.amount, // stored in paise
        status: "pending",
        verification_method: "SMS" // Fallback if Truecaller is not used
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // === GATE 3: OTP Generation & Dispatch (SMS Fallback) ===
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    await sendSMSOTP(body.phone, otp, order.id);
    
    // Hash OTP
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Cache OTP temporarily
    await supabase.from("otp_verifications").insert({
      phone: body.phone,
      order_id: order.id,
      otp_hash: otpHash,
      expires_at: new Date(Date.now() + 10*60*1000).toISOString(), // 10 min
      ip_address: req.headers.get("x-forwarded-for") || "unknown"
    });

    return new Response(JSON.stringify({
      order_id: order.id,
      requires_verification: true,
      message: "OTP sent via SMS"
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});

async function sendSMSOTP(phone: string, otp: string, orderId: string) {
  // In production, integrate an SMS gateway (e.g., MSG91, Twilio, Gupshup)
  console.log(`[SMS OTP DISPATCH] Generated OTP: ${otp} for phone: +91${phone} (Order: ${orderId})`);
}
