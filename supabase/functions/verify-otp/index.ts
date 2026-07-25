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
    const { order_id, otp, phone } = await req.json();
    
    // 1. Verify OTP Hash
    const { data: cacheRecord, error: fetchError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("order_id", order_id)
      .eq("phone", phone)
      .single();
      
    if (fetchError || !cacheRecord) {
      return new Response(JSON.stringify({ error: "OTP expired or invalid" }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (new Date(cacheRecord.expires_at) < new Date()) {
       return new Response(JSON.stringify({ error: "OTP expired" }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const hashedInput = await hashOTP(otp);
    if (hashedInput !== cacheRecord.otp_hash) {
      await supabase.from("otp_verifications").update({
        attempts: cacheRecord.attempts + 1
      }).eq("id", cacheRecord.id);

      return new Response(JSON.stringify({ error: "Invalid OTP" }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 2. Mark order as verified
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        status: "confirmed", 
        phone_verified: true,
      })
      .eq("id", order_id);

    if (updateError) throw updateError;
    
    // Clear OTP Cache
    await supabase.from("otp_verifications").update({ verified: true }).eq("id", cacheRecord.id);

    return new Response(JSON.stringify({ verified: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});

async function hashOTP(otp: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
