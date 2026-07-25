import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Runs every 2 hours via Supabase Cron (configured in Supabase dashboard)
// Pre-emptively cancels high-risk orders before shipping
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  try {
    // Identify suspicious patterns: Unconfirmed for 2h OR High Risk Score
    const twoHoursAgo = new Date(Date.now() - 2*60*60*1000).toISOString();
    
    const { data: suspiciousOrders, error } = await supabase
      .from("orders")
      .select("id, customer_phone")
      .eq("status", "otp_verified")
      .or(`verified_at.lt.${twoHoursAgo},risk_score.gt.70`);
      
    if (error) throw error;
      
    for (const order of suspiciousOrders || []) {
      // Move to fake_order status instead of deleting (for analytics)
      await supabase
        .from("orders")
        .update({ status: "fake_order" })
        .eq("id", order.id);
        
      // Mark as fake_order / unverified cancellation
      await sendCancellationNotice(order.customer_phone, order.id);
    }
    
    return new Response(`Processed ${suspiciousOrders?.length || 0} suspicious orders`, { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

async function sendCancellationNotice(phone: string, orderId: string) {
  console.log(`[RTO GUARD] Order ${orderId} for phone ${phone} marked suspicious / cancelled.`);
}
