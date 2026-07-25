import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 1. Define strict CORS headers to prevent browser blocks
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS Preflight perfectly
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, customerName, jobNo, amount } = await req.json()
    const apiKey = Deno.env.get('JUVLON_API_KEY')

    if (!apiKey) {
      throw new Error("Missing Juvlon API Key in Supabase Secrets")
    }

    const cleanPhone = phone.replace('+91', '')
    const messageText = `Hello ${customerName}, your repair for Job No: ${jobNo} is complete. Your bill amount is Rs.${amount}. Thank you for choosing GSM Solutions!`

    const payload = {
      apiKey: apiKey,
      requests: [
        {
          mobile: cleanPhone,
          message: messageText
        }
      ]
    }

    // Call Juvlon API
    const response = await fetch('https://api2.juvlon.com/sendSMS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    // 2. Safely read the response as raw text FIRST to prevent the HTML crash
    const responseText = await response.text()
    let result;
    
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      // If Juvlon sends an HTML error page, we catch it here gracefully!
      throw new Error(`Juvlon API returned an HTML page instead of JSON. The endpoint might be incorrect or blocked. Response preview: ${responseText.substring(0, 150)}...`)
    }

    if (!response.ok) {
      throw new Error(`Juvlon API Rejected Request: ${JSON.stringify(result)}`)
    }

    // Success Response with CORS
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Error Response with CORS (This stops the fake CORS error in your browser)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
