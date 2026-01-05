import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslationRequest {
  words: string[];
  targetLanguage: string; // uz, ru, etc.
}

interface TranslatedWord {
  original: string;
  translation: string;
  examples: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { words, targetLanguage = 'uz' } = await req.json() as TranslationRequest;
    
    if (!words || words.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No words provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Translating ${words.length} words to ${targetLanguage}`);

    // Batch words into larger chunks (50) for efficiency - saves API calls
    const batchSize = 50;
    const results: TranslatedWord[] = [];

    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      
      const languageName = targetLanguage === 'uz' ? "O'zbek" : 
                          targetLanguage === 'ru' ? 'Русский' : 'English';
      
      // Minimal prompt to save tokens
      const prompt = `Translate to ${languageName}. Return JSON array only:
[{"original":"word","translation":"tarjima","examples":["Sentence - Tarjima"]}]

Words: ${batch.join(', ')}`;

      console.log(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(words.length / batchSize)}`);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite', // Fastest & cheapest model
          messages: [
            { role: 'system', content: `Translator. JSON only. 1 short example per word.` },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        if (response.status === 402) {
          throw new Error('Payment required');
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      console.log('Raw response:', content);

      // Parse the JSON response
      try {
        // Extract JSON from the response (handle markdown code blocks)
        let jsonStr = content;
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         content.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          jsonStr = jsonMatch[1] || jsonMatch[0];
        }
        
        const batchResults = JSON.parse(jsonStr);
        results.push(...batchResults);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        // Fallback: create basic translations for this batch
        batch.forEach(word => {
          results.push({
            original: word,
            translation: word, // fallback to original
            examples: [`This is ${word}.`, `I need ${word}.`]
          });
        });
      }

      // Small delay between batches to avoid rate limits
      if (i + batchSize < words.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Successfully translated ${results.length} words`);

    return new Response(
      JSON.stringify({ translations: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in translate-words function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
