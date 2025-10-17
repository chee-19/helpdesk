import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DraftReplyRequest {
  subject: string;
  body: string;
  category: string;
  kbArticles?: Array<{ title: string; body: string }>;
  language: string;
}

interface DraftReplyResponse {
  reply: string;
  confidence: number;
  kbArticlesUsed: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { subject, body, category, kbArticles = [], language }: DraftReplyRequest = await req.json();

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    let kbContext = "";
    const usedArticles: string[] = [];

    if (kbArticles.length > 0) {
      kbContext = "\n\nRelevant knowledge base articles:\n";
      kbArticles.forEach((article, idx) => {
        kbContext += `\n[Article ${idx + 1}]: ${article.title}\n${article.body}\n`;
        usedArticles.push(article.title);
      });
      kbContext += "\nPlease reference these articles when applicable in your reply.";
    }

    const prompt = `You are a professional customer support agent. Draft a helpful, empathetic reply to this ${category} ticket.

Subject: ${subject}
Message: ${body}
${kbContext}

Guidelines:
- Be professional, friendly, and empathetic
- Provide actionable solutions when possible
- Reference KB articles naturally if they help
- Keep the tone appropriate for the category
- If language is not English (detected: ${language}), reply in that language

Provide your response as JSON with:
- reply: the draft reply text
- confidence: number 0-1 indicating how confident you are this addresses their issue
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
          { role: "system", content: "You are a helpful customer support agent. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const parsed = JSON.parse(result.choices[0].message.content);

    const draftResponse: DraftReplyResponse = {
      reply: parsed.reply,
      confidence: parsed.confidence,
      kbArticlesUsed: usedArticles,
    };

    return new Response(
      JSON.stringify(draftResponse),
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