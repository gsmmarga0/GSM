import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Handle CORS preflight requests from the browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { phone, customerName, jobNo, amount } = await req.json()
    
    // Fetch the secure key from Supabase
    const juvlonKey = Deno.env.get('JUVLON_API_KEY')

    if (!juvlonKey) {
      throw new Error("Missing Juvlon API Key in Supabase Secrets")
    }

    // Strip the country code as Juvlon expects a standard 10-digit Indian mobile number
    const cleanPhone = phone.replace('+91', '')
    
    // Format the exact text message that the customer will receive
    const messageText = `Hello ${customerName}, your repair for Job No: ${jobNo} is complete. Your bill amount is Rs.${amount}. Thank you for choosing GSM Solutions!`;

    // Juvlon's standard API Payload Structure
    // (Juvlon accepts the apiKey directly inside the JSON body)
    const payload = {
      apiKey: juvlonKey,
      requests: [
        {
          mobile: cleanPhone,
          message: messageText
        }
      ]
    }

    // Send the request to Juvlon's v4 SMS endpoint
    const response = await fetch('https://api2.juvlon.com/v4/sendSMS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json()

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
