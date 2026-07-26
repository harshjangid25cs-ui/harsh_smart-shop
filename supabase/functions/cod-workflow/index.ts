import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CODRequest {
  phone: string;
  name: string;
  address: string;
  pincode: string;
  email?: string;
  items?: Array<{
    product_id: string;
    name: string;
    quantity: number;
    price: number;
    image_url?: string;
  }>;
  total_amount?: number;
  amount?: number; // fallback for backwards compatibility
  product_id?: string;
  product_name?: string;
  device_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body: CODRequest = await req.json();
    
    // Phone regex check (Indian 10-digit format)
    if (!/^[6-9]\d{9}$/.test(body.phone)) {
       return new Response(JSON.stringify({ error: "Invalid Indian phone number" }), {
           status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
       });
    }

    // === GATE 1: Pincode Serviceability ===
    if (["999999", "000000"].includes(body.pincode)) {
      return new Response(
        JSON.stringify({ error: "COD not available for this pincode" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Determine final payment amount and normalized items structure
    const finalAmount = body.total_amount ?? body.amount ?? 0;
    const itemsJson = body.items || (body.product_id ? [{
      product_id: body.product_id,
      name: body.product_name || 'Product',
      quantity: 1,
      price: finalAmount
    }] : []);

    const verificationMethod = body.email ? "Email" : "SMS";
    const fingerprint = (body.device_id || req.headers.get("user-agent") || "").substring(0, 255);

    // === GATE 2: Order Creation (Pending State) ===
    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert({
        customer_phone: body.phone,
        customer_name: body.name,
        customer_email: body.email || null,
        email: body.email || null,
        full_address: body.address,
        pincode: body.pincode,
        product_id: body.product_id || null,
        product_name: body.product_name || null,
        items: itemsJson, // Store complete multi-product breakdown
        cod_amount: finalAmount, // total value stored in paise
        status: "pending",
        verification_method: verificationMethod,
        device_fingerprint: fingerprint
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // === GATE 3: OTP Generation & Dispatch ===
    if (!body.email) {
      // SMS OTP Fallback Workflow
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
    }

    // For Email OTP requests, send-email-otp edge function is triggered by frontend after order creation
    return new Response(JSON.stringify({
      order_id: order.id,
      requires_verification: true,
      message: "Order initiated. Ready for email verification."
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});

async function sendSMSOTP(phone: string, otp: string, orderId: string) {
  console.log(`[SMS OTP DISPATCH] Generated OTP: ${otp} for phone: +91${phone} (Order: ${orderId})`);
}
