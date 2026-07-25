import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // 1. Handle CORS Preflight requests from your browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    // 2. Parse the data coming from your HTML file
    const { phone, customerName, jobNo, amount } = await req.json()
    const apiKey = Deno.env.get('JUVLON_API_KEY')

    if (!apiKey) {
      throw new Error("Missing Juvlon API Key in Supabase Secrets");
    }

    // 3. Format phone number (remove +91) and draft the message
    const cleanPhone = phone.replace('+91', '');
    const messageText = `Hello ${customerName}, your repair for Job No: ${jobNo} is complete. Your bill amount is Rs.${amount}. Thank you for choosing GSM Solutions!`;

    // 4. Build the JSON Payload required by Juvlon's sendSMS API
    const payload = {
      apiKey: apiKey,
      requests: [
        {
          mobile: cleanPhone,
          message: messageText
        }
      ]
    };

    // 5. Send POST request to Juvlon API
    const response = await fetch('https://api2.juvlon.com/sendSMS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    // 6. Check if Juvlon rejected the message
    if (!response.ok) {
        throw new Error(`Juvlon API failed: ${JSON.stringify(result)}`);
    }

    // 7. Return success back to your HTML
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    })
  } catch (error) {
    // Return error if anything breaks
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
