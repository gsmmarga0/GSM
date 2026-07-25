// Define standard CORS headers required by browsers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use the modern Deno.serve instead of the old import
Deno.serve(async (req) => {
  // 1. Handle CORS Preflight requests perfectly
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, customerName, jobNo, amount } = await req.json();
    const apiKey = Deno.env.get('JUVLON_API_KEY');

    if (!apiKey) {
      throw new Error("Missing Juvlon API Key in Supabase Secrets");
    }

    const cleanPhone = phone.replace('+91', '');
    const messageText = `Hello ${customerName}, your repair for Job No: ${jobNo} is complete. Your bill amount is Rs.${amount}. Thank you for choosing GSM Solutions!`;

    const payload = {
      apiKey: apiKey,
      requests: [
        {
          mobile: cleanPhone,
          message: messageText
        }
      ]
    };

    const response = await fetch('https://api2.juvlon.com/v4/sendSMS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(`Juvlon API failed: ${JSON.stringify(result)}`);
    }

    // Return success WITH CORS headers
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    // Return error WITH CORS headers
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
