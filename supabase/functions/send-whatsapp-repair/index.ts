import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { phone, customerName, jobNo, amount } = await req.json()
    const waToken = Deno.env.get('WA_TOKEN')
    const phoneId = Deno.env.get('WA_PHONE_ID')

    const formattedPhone = phone.length === 10 ? `91${phone}` : phone.replace(/\D/g, '');

    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "repair_complete", // Matches the new template
        language: { code: "en_US" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: customerName },
            { type: "text", text: jobNo },
            { type: "text", text: String(amount) }
          ]
        }]
      }
    }

    const waResponse = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const waData = await waResponse.json()
    if (!waResponse.ok) throw new Error(waData.error?.message || "Failed to send")

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
