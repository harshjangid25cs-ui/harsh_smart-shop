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
    const { order_id, email, otp } = await req.json();

    if (!email || !order_id || !otp) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Fetch latest OTP record
    const { data: cacheRecord, error: fetchError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("order_id", order_id)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
      
    if (fetchError || !cacheRecord) {
      return new Response(JSON.stringify({ error: "OTP not found or invalid" }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 2. Check Expiry
    if (new Date(cacheRecord.expires_at) < new Date()) {
       return new Response(JSON.stringify({ error: "OTP expired. Please request a new one." }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 3. Check Attempts
    if (cacheRecord.attempts >= cacheRecord.max_attempts) {
      return new Response(JSON.stringify({ error: "Maximum verification attempts reached. Please request a new OTP." }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 4. Hash Input OTP and Compare
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + order_id); // Salt with order_id
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashedInput !== cacheRecord.otp_hash) {
      // Increment attempts
      const newAttempts = cacheRecord.attempts + 1;
      await supabase.from("otp_verifications").update({
        attempts: newAttempts
      }).eq("id", cacheRecord.id);

      const attemptsLeft = cacheRecord.max_attempts - newAttempts;
      
      return new Response(JSON.stringify({ 
        error: "Invalid OTP", 
        attempts_left: attemptsLeft 
      }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 5. Mark as verified
    await supabase.from("otp_verifications").update({ verified: true }).eq("id", cacheRecord.id);

    // 6. Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        status: "confirmed", 
        phone_verified: true, // Legacy field, setting true for simplicity
        verification_method: "email"
      })
      .eq("id", order_id);

    if (updateError) throw updateError;
    
    return new Response(JSON.stringify({ 
      success: true,
      message: "Order verified successfully"
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("OTP verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
