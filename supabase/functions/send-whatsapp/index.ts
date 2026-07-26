import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("--- NEW REQUEST STARTED ---");
    
    // 2. Parse the body from the frontend
    const body = await req.json();
    console.log("Data received from frontend:", body);

    // 3. Load your Secrets
    const META_TOKEN = Deno.env.get('META_TOKEN');
    const PHONE_NUMBER_ID = Deno.env.get('PHONE_NUMBER_ID');
    const TEMPLATE_NAME = Deno.env.get('TEMPLATE_NAME');

    if (!META_TOKEN || !PHONE_NUMBER_ID || !TEMPLATE_NAME) {
      throw new Error("Missing Meta secrets in Supabase Dashboard.");
    }

    // 4. Clean up the phone number
    const formattedMobile = body.mobile.replace('+', '').trim();
    console.log("Sending to mobile:", formattedMobile);

    // 5. Build the Meta Payload
    const payload = {
      messaging_product: "whatsapp",
      to: formattedMobile,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: "en" }, 
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: String(body.customerName) },
              { type: "text", text: String(body.jobNo) },
              { type: "text", text: String(body.amount) }
            ]
          }
        ]
      }
    };
    
    console.log("Payload ready, sending to Meta...");

    // 6. Send to Meta
    const metaResponse = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const metaData = await metaResponse.json();
    console.log("Meta API Response:", metaData);

    if (!metaResponse.ok) {
      throw new Error(`Meta API Rejected: ${JSON.stringify(metaData)}`);
    }

    console.log("SUCCESS! Message sent.");
    return new Response(JSON.stringify({ success: true, data: metaData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("CRITICAL ERROR:", error.message || error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
