// Supabase Edge Function: send-receipt
// Triggered by database webhook after attendance/rsvp record insert
// when email_receipts is enabled on the parent object

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)
  const appUrl = Deno.env.get('APP_URL') || 'https://konta.app'

  try {
    const payload = await req.json()
    const record = payload.record

    if (!record) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Determine if this is attendance or RSVP
    const table = payload.table as string

    if (table === 'attendance_records') {
      const { data: event } = await supabase
        .from('attendance_objects')
        .select('*, workspaces(name)')
        .eq('id', record.event_id)
        .single()

      if (!event?.email_receipts) {
        return new Response(JSON.stringify({ skipped: 'email_receipts off' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const email = record.content?.email
      if (!email) {
        return new Response(JSON.stringify({ skipped: 'no email' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          type: record.status === 'excused' ? 'excuse_receipt' : 'receipt',
          to: email,
          data: {
            event_name: event.name,
            event_date: event.event_date,
            privacy_url: `${appUrl}/privacy`,
          },
        }),
      })
    } else if (table === 'rsvp_records') {
      const { data: rsvp } = await supabase
        .from('rsvp_objects')
        .select('*')
        .eq('id', record.rsvp_id)
        .single()

      if (!rsvp?.email_receipts) {
        return new Response(JSON.stringify({ skipped: 'email_receipts off' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const email = record.content?.email
      if (!email) {
        return new Response(JSON.stringify({ skipped: 'no email' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          type: 'receipt',
          to: email,
          data: {
            event_name: rsvp.name,
            event_date: rsvp.event_date,
            privacy_url: `${appUrl}/privacy`,
          },
        }),
      })
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
