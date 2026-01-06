import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, lang } = await req.json();
    
    if (!word) {
      return new Response(
        JSON.stringify({ error: 'Word is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching image for word: "${word}" (lang: ${lang})`);

    // Try multiple image sources in order of preference
    let imageUrl: string | null = null;

    // 1. Try Pixabay (free API with generous limits)
    try {
      const pixabayUrl = `https://pixabay.com/api/?key=46902024-c73c07ea57c3ea94dfc89c67f&q=${encodeURIComponent(word)}&image_type=photo&per_page=3&safesearch=true`;
      const pixabayResponse = await fetch(pixabayUrl);
      
      if (pixabayResponse.ok) {
        const pixabayData = await pixabayResponse.json();
        if (pixabayData.hits && pixabayData.hits.length > 0) {
          // Get a random image from top 3 results
          const randomIndex = Math.floor(Math.random() * Math.min(3, pixabayData.hits.length));
          imageUrl = pixabayData.hits[randomIndex].webformatURL;
          console.log(`Found image from Pixabay: ${imageUrl}`);
        }
      }
    } catch (e) {
      console.log('Pixabay search failed:', e);
    }

    // 2. Fallback to Unsplash Source (no API key needed)
    if (!imageUrl) {
      try {
        // Unsplash Source provides random images based on keywords
        const unsplashUrl = `https://source.unsplash.com/featured/400x300/?${encodeURIComponent(word)}`;
        
        // Make a HEAD request to get the final redirected URL
        const unsplashResponse = await fetch(unsplashUrl, { 
          method: 'HEAD',
          redirect: 'follow' 
        });
        
        if (unsplashResponse.ok) {
          imageUrl = unsplashResponse.url;
          console.log(`Found image from Unsplash: ${imageUrl}`);
        }
      } catch (e) {
        console.log('Unsplash search failed:', e);
      }
    }

    // 3. Final fallback - use Lorem Picsum with seed
    if (!imageUrl) {
      // Use word as seed for consistent but random image
      const seed = word.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      imageUrl = `https://picsum.photos/seed/${seed}/400/300`;
      console.log(`Using fallback image: ${imageUrl}`);
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        source: imageUrl.includes('pixabay') ? 'pixabay' : 
                imageUrl.includes('unsplash') ? 'unsplash' : 'picsum'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error searching for image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to search for image', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
