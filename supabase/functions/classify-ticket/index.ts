import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ClassifyRequest {
  subject: string;
  body: string;
  requesterEmail: string;
}

interface ClassifyResponse {
  category: string;
  priority: string;
  confidence: number;
  rationale: string;
  language: string;
  abuseDetected: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { subject, body, requesterEmail }: ClassifyRequest = await req.json();

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const prompt = `You are a support ticket classifier. Analyze the following ticket and provide classification.

Subject: ${subject}
Body: ${body}

Provide your response as JSON with the following fields:
- category: one of [billing, bug, feature_request, abuse_report, other]
- priority: one of [low, medium, high, urgent]
- confidence: number between 0 and 1
- rationale: brief explanation of your classification
- language: detected language code (e.g., en, es, fr)
- abuseDetected: boolean indicating if this contains abusive content or spam

Consider:
- Billing: payment issues, invoices, refunds
- Bug: system errors, unexpected behavior
- Feature Request: suggestions for improvements
- Abuse Report: spam, harassment, policy violations
- Priority: urgent for system down, high for major issues, medium for standard, low for questions
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful support ticket classifier. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const classification: ClassifyResponse = JSON.parse(result.choices[0].message.content);

    return new Response(
      JSON.stringify(classification),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});