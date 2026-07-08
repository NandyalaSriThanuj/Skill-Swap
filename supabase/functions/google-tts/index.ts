import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ttsApiKey = Deno.env.get('GOOGLE_TTS_API_KEY')
    
    // Optional: Verify user authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { text, language } = await req.json()

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text parameter" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    let languageCode = 'en-US'
    let name = 'en-US-Journey-F'

    if (language === 'Hindi') {
      languageCode = 'hi-IN'
      name = 'hi-IN-Neural2-D'
    } else if (language === 'Telugu') {
      languageCode = 'te-IN'
      name = 'te-IN-Standard-A'
    }

    // Helper to use free proxy
    const getFreeTTS = async (textChunk: string, langChunk: string) => {
      let tl = 'en'
      if (langChunk === 'Hindi') tl = 'hi'
      if (langChunk === 'Telugu') tl = 'te'
      const safeText = textChunk.substring(0, 200);
      const freeUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${tl}&q=${encodeURIComponent(safeText)}`
      const gtxResponse = await fetch(freeUrl)
      if (!gtxResponse.ok) throw new Error("Free TTS proxy failed");
      const arrayBuffer = await gtxResponse.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
      return btoa(binary)
    };

    // If no API key is set, use the free Google Translate proxy immediately
    if (!ttsApiKey || ttsApiKey === 'your_actual_google_cloud_api_key') {
      try {
        const base64Audio = await getFreeTTS(text, language);
        return new Response(JSON.stringify({ audioContent: base64Audio }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }
    }

    const requestBody = {
      input: { text },
      voice: { languageCode, name },
      audioConfig: { audioEncoding: 'MP3' }
    }

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.warn("Google Cloud TTS failed (likely billing/disabled). Falling back to free proxy.");
      try {
        // Fallback to free proxy!
        const base64Audio = await getFreeTTS(text, language);
        return new Response(JSON.stringify({ audioContent: base64Audio }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      } catch (e: any) {
        return new Response(JSON.stringify({ error: "Failed to synthesize speech via both paid and free TTS." }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }
    }

    const data = await response.json();

    return new Response(JSON.stringify({
      audioContent: data.audioContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
