// Supabase Edge Function: send-email
// Called after attendance or RSVP submission to send email receipts
// Also used for workspace invitation notifications

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: EmailRequest) {
  const smtpHost = Deno.env.get('SMTP_HOST')
  const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587')
  const smtpUser = Deno.env.get('SMTP_USER')
  const smtpPass = Deno.env.get('SMTP_PASS')
  const smtpFrom = Deno.env.get('SMTP_FROM') || smtpUser

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('SMTP configuration missing')
    return { success: false, error: 'SMTP not configured' }
  }

  // Use fetch to a mail service or SMTP relay
  // For Deno edge functions, use a transactional email API or SMTP relay
  // This example uses a simple SMTP-over-HTTP approach

  const response = await fetch(`https://${smtpHost}/api/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${smtpUser}:${smtpPass}`)}`,
    },
    body: JSON.stringify({
      from: smtpFrom,
      to,
      subject,
      html,
    }),
  }).catch(() => null)

  return { success: !!response?.ok }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as {
      type: 'receipt' | 'excuse_receipt' | 'invite'
      to: string
      data: Record<string, any>
    }

    let subject = ''
    let html = ''

    if (body.type === 'receipt') {
      subject = `Check-in confirmed: ${body.data.event_name}`
      html = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111; margin-bottom: 8px;">
            ✓ Check-in confirmed
          </h2>
          <p style="color: #666; margin-bottom: 24px;">
            Your attendance at <strong>${body.data.event_name}</strong> has been recorded.
          </p>
          ${body.data.event_date ? `<p style="color: #888; font-size: 14px;">📅 ${body.data.event_date}</p>` : ''}
          <div style="border-top: 1px solid #eee; margin-top: 24px; padding-top: 16px;">
            <p style="color: #aaa; font-size: 12px;">
              Sent by Konta · <a href="${body.data.privacy_url || '#'}" style="color: #aaa;">Privacy policy</a>
            </p>
          </div>
        </div>
      `
    } else if (body.type === 'excuse_receipt') {
      subject = `Excuse submitted: ${body.data.event_name}`
      html = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111; margin-bottom: 8px;">
            Excuse submitted
          </h2>
          <p style="color: #666; margin-bottom: 24px;">
            Your excuse for <strong>${body.data.event_name}</strong> has been recorded.
          </p>
          <div style="border-top: 1px solid #eee; margin-top: 24px; padding-top: 16px;">
            <p style="color: #aaa; font-size: 12px;">
              Sent by Konta · <a href="${body.data.privacy_url || '#'}" style="color: #aaa;">Privacy policy</a>
            </p>
          </div>
        </div>
      `
    } else if (body.type === 'invite') {
      subject = `You've been invited to join ${body.data.workspace_name} on Konta`
      html = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111; margin-bottom: 8px;">
            You've been invited
          </h2>
          <p style="color: #666; margin-bottom: 24px;">
            <strong>${body.data.inviter_name}</strong> invited you to join
            <strong>${body.data.workspace_name}</strong> on Konta.
          </p>
          <a href="${body.data.app_url}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Accept invitation
          </a>
          <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 16px;">
            <p style="color: #aaa; font-size: 12px;">Sent by Konta</p>
          </div>
        </div>
      `
    }

    const result = await sendEmail({ to: body.to, subject, html })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: result.success ? 200 : 500 }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
