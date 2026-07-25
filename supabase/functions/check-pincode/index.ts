import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const { pincode } = await req.json();
    
    // Validate Indian pincode (6 digits)
    if (!/^\d{6}$/.test(pincode)) {
       return new Response(JSON.stringify({ error: "Invalid pincode format" }), {
           status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
       });
    }

    // Simulate API delay
    await new Promise(r => setTimeout(r, 600));
    
    // RTO Risk areas mock
    const highRisk = ["110001", "400001"].includes(pincode);
    const unserviceable = ["999999", "000000"].includes(pincode);
    
    return new Response(JSON.stringify({
      cod_available: !unserviceable,
      city: "Mumbai",
      state: "Maharashtra",
      estimated_days: 3,
      rto_risk: highRisk
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
