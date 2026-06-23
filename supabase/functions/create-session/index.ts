import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Parse payload from database webhook
    const payload = await req.json()
    const { record, old_record } = payload

    // Verify if status changed to 'approved'
    if (record && record.status === 'approved' && (!old_record || old_record.status !== 'approved')) {
      const { id: swap_request_id, sender_id, receiver_id } = record

      // Generate a unique room/session ID
      const roomId = crypto.randomUUID()
      const sessionLink = `https://skillswap.app/session/${roomId}`
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expires in 24h

      // In our data model, learner is sender_id and mentor is receiver_id
      const learnerId = sender_id
      const mentorId = receiver_id

      // Insert learning session record
      const { data: session, error: sessionError } = await supabaseClient
        .from('learning_sessions')
        .insert({
          room_id: roomId,
          learner_id: learnerId,
          mentor_id: mentorId,
          swap_request_id: swap_request_id,
          session_link: sessionLink,
          status: 'active',
          expires_at: expiresAt
        })
        .select()
        .single()

      if (sessionError) {
        throw sessionError
      }

      // Note: Notifications are handled automatically in public.notifications
      // via the Postgres trigger trigger_on_session_created.

      return new Response(JSON.stringify({ success: true, session }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ success: true, message: 'Status is not approved or no state change detected' }), {
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
