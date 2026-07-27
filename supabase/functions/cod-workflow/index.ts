import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CODRequest {
  phone: string;
  name: string;
  address: string;
  pincode: string;
  email: string;
  product_id: string;
  product_name: string;
  amount: number;
  device_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body: CODRequest = await req.json();
    
    // === VALIDATION ===
    if (!/^[6-9]\d{9}$/.test(body.phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid Indian phone number." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.name || body.name.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Name must be at least 3 characters." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.address || body.address.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Please provide a complete address." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === BLOCKED PINCODES ===
    if (["999999", "000000"].includes(body.pincode)) {
      return new Response(
        JSON.stringify({ error: "COD not available for this pincode." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === CREATE ORDER (Directly Confirmed) ===
    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert({
        customer_phone: body.phone,
        customer_name: body.name,
        customer_email: body.email || null,
        full_address: body.address,
        pincode: body.pincode,
        product_id: body.product_id,
        product_name: body.product_name,
        cod_amount: body.amount,
        status: "confirmed", // ✅ Directly confirmed, no OTP
        verification_method: "None",
        device_fingerprint: body.device_id?.substring(0, 255)
      })
      .select()
      .single();

    if (insertError) {
      console.error("Order insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create order: " + insertError.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order || !order.id) {
      return new Response(
        JSON.stringify({ error: "Order creation failed." }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Order confirmed:", order.id);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        message: "Order placed successfully"
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("COD Workflow Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unexpected error occurred." }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});