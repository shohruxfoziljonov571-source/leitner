import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

    // Batch words into chunks of 20 for efficiency
    const batchSize = 20;
    const results: TranslatedWord[] = [];

    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      
      const languageName = targetLanguage === 'uz' ? "O'zbek" : 
                          targetLanguage === 'ru' ? 'Русский' : 'English';
      
      const prompt = `Translate these English words to ${languageName} and provide 2 example sentences for each.

Words: ${batch.join(', ')}

Return ONLY a valid JSON array in this exact format, no other text:
[
  {
    "original": "word",
    "translation": "tarjima",
    "examples": ["Example sentence 1 in English - Tarjimasi", "Example sentence 2 in English - Tarjimasi"]
  }
]

Important:
- translation should be a single word or short phrase in ${languageName}
- examples should show the word in context, with ${languageName} translation after dash
- Keep examples simple and practical (A1-B1 level)`;

      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(words.length / batchSize)}`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `You are a professional translator specializing in English to ${languageName} translations. Always respond with valid JSON only.` 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
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
