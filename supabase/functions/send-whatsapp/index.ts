import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mobile, customerName, jobNo, amount } = await req.json()

    const META_TOKEN = Deno.env.get('META_TOKEN')
    const PHONE_NUMBER_ID = Deno.env.get('PHONE_NUMBER_ID')
    const TEMPLATE_NAME = Deno.env.get('TEMPLATE_NAME')

    if (!META_TOKEN || !PHONE_NUMBER_ID || !TEMPLATE_NAME) {
      throw new Error("Missing Meta credentials in server configuration.")
    }

    const formattedMobile = mobile.replace('+', '').trim()

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
              { type: "text", text: customerName },
              { type: "text", text: String(jobNo) },
              { type: "text", text: String(amount) }
            ]
          }
        ]
      }
    }

    const metaResponse = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const metaData = await metaResponse.json()

    if (!metaResponse.ok) {
      console.error("Meta API Error:", metaData)
      throw new Error(`Meta API failed: ${metaData.error?.message || 'Unknown error'}`)
    }

    return new Response(JSON.stringify({ success: true, data: metaData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
