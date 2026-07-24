import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Receive invoice data from your HTML frontend
    const { phone, customerName, invoiceNo, totalAmount, paymentMode, itemsDesc } = await req.json()

    // 2. Load secure Meta credentials from Supabase secrets
    const waToken = Deno.env.get('WA_TOKEN')
    const phoneId = Deno.env.get('WA_PHONE_ID')

    if (!waToken || !phoneId) {
      throw new Error("Missing Meta API credentials in Edge Function environment.")
    }

    // 3. Format phone number (Meta requires country code without + or 00)
    // Assuming Indian numbers, we prepend 91 if the number is exactly 10 digits
    const formattedPhone = phone.length === 10 ? `91${phone}` : phone.replace(/\D/g, '');

    // 4. Build the payload matching your Meta template exactly
    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "digital_bill", // Must match your Meta template name
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: customerName },       // {{1}}
              { type: "text", text: invoiceNo },          // {{2}}
              { type: "text", text: String(totalAmount) },// {{3}}
              { type: "text", text: paymentMode },        // {{4}}
              { type: "text", text: itemsDesc }           // {{5}}
            ]
          }
        ]
      }
    }

    // 5. Send to Meta Graph API
    const waResponse = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const waData = await waResponse.json()

    if (!waResponse.ok) {
      console.error("Meta API Error:", waData)
      throw new Error(waData.error?.message || "Failed to send WhatsApp message")
    }

    return new Response(JSON.stringify({ success: true, data: waData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
