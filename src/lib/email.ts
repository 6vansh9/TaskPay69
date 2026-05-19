import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_REPLACE_ME'
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = 'TaskPay <noreply@taskpay.in>'

export async function sendHiredEmail(opts: {
  freelancerEmail: string
  freelancerName: string
  clientName: string
  jobTitle: string
  contractId: string
  agreedRate: number
}) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to: opts.freelancerEmail,
    subject: `🎉 You've been hired for "${opts.jobTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#14a800;margin-bottom:8px">Congratulations, ${opts.freelancerName}!</h2>
        <p style="color:#444;line-height:1.6">
          <strong>${opts.clientName}</strong> has hired you for <strong>${opts.jobTitle}</strong>.<br>
          Agreed rate: <strong>₹${opts.agreedRate.toLocaleString()}</strong>
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/contracts/${opts.contractId}"
           style="display:inline-block;margin-top:20px;background:#14a800;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">
          View Contract →
        </a>
        <p style="margin-top:32px;color:#888;font-size:12px">TaskPay — Freelance Marketplace</p>
      </div>
    `,
  })
}

export async function sendProposalReceivedEmail(opts: {
  clientEmail: string
  clientName: string
  freelancerName: string
  jobTitle: string
  jobId: string
}) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to: opts.clientEmail,
    subject: `New proposal on "${opts.jobTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1d1d1d">New proposal received</h2>
        <p style="color:#444;line-height:1.6">
          <strong>${opts.freelancerName}</strong> submitted a proposal for <strong>${opts.jobTitle}</strong>.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs/${opts.jobId}/proposals"
           style="display:inline-block;margin-top:20px;background:#14a800;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">
          Review Proposals →
        </a>
        <p style="margin-top:32px;color:#888;font-size:12px">TaskPay — Freelance Marketplace</p>
      </div>
    `,
  })
}

export async function sendDisputeEmail(opts: {
  partyEmail: string
  partyName: string
  raisedByName: string
  jobTitle: string
  contractId: string
  reason: string
}) {
  if (!resend) return
  resend.emails.send({
    from: FROM,
    to: opts.partyEmail,
    subject: `Dispute raised on contract: ${opts.jobTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#d97706">⚠️ A dispute has been raised</h2>
        <p style="color:#444;line-height:1.6">
          <strong>${opts.raisedByName}</strong> has raised a dispute on the contract for
          <strong>${opts.jobTitle}</strong>.
        </p>
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#92400e;font-size:14px"><strong>Reason:</strong> ${opts.reason}</p>
        </div>
        <p style="color:#444;line-height:1.6">
          The contract is now on hold. Our team will review and resolve within 48–72 hours.
          You may also try to resolve this directly via the contract chat.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/contracts/${opts.contractId}"
           style="display:inline-block;margin-top:20px;background:#14a800;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">
          View Contract →
        </a>
        <p style="margin-top:32px;color:#888;font-size:12px">TaskPay — Freelance Marketplace</p>
      </div>
    `,
  }).catch(() => {})
}

export async function sendDisputeResolvedEmail(opts: {
  partyEmail: string
  partyName: string
  jobTitle: string
  contractId: string
  resolution: string
  winner: 'client' | 'freelancer'
  isWinner: boolean
}) {
  if (!resend) return
  resend.emails.send({
    from: FROM,
    to: opts.partyEmail,
    subject: `Dispute resolved — ${opts.jobTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#14a800">Dispute Resolved</h2>
        <p style="color:#444;line-height:1.6">
          The dispute on <strong>${opts.jobTitle}</strong> has been reviewed and resolved by our admin team.
        </p>
        <div style="background:${opts.isWinner ? '#f0faea' : '#fff7ed'};border:1px solid ${opts.isWinner ? '#14a800' : '#f59e0b'};border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#1d1d1d;font-weight:600">${opts.isWinner ? '✓ Decision in your favour' : 'Decision against you'}</p>
          <p style="margin:8px 0 0;color:#444;font-size:14px">${opts.resolution}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/contracts/${opts.contractId}"
           style="display:inline-block;margin-top:20px;background:#14a800;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">
          View Contract →
        </a>
        <p style="margin-top:32px;color:#888;font-size:12px">TaskPay — Freelance Marketplace</p>
      </div>
    `,
  }).catch(() => {})
}

export async function sendWithdrawalPaidEmail(opts: {
  freelancerEmail: string
  freelancerName: string
  amount: number
  method: string
}) {
  if (!resend) return
  resend.emails.send({
    from: FROM,
    to: opts.freelancerEmail,
    subject: `Payment of ₹${opts.amount.toLocaleString()} sent to your ${opts.method}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#14a800">💰 Payout Processed</h2>
        <p style="color:#444;line-height:1.6">
          Hi ${opts.freelancerName}, your payout of <strong>₹${opts.amount.toLocaleString()}</strong>
          has been sent to your <strong>${opts.method}</strong>. It typically arrives within 1 business day.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/payouts"
           style="display:inline-block;margin-top:20px;background:#14a800;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">
          View Payouts →
        </a>
        <p style="margin-top:32px;color:#888;font-size:12px">TaskPay — Freelance Marketplace</p>
      </div>
    `,
  }).catch(() => {})
}

export async function sendContractCreatedEmail(opts: {
  clientEmail: string
  clientName: string
  freelancerEmail: string
  freelancerName: string
  jobTitle: string
  contractId: string
}) {
  if (!resend) return
  await Promise.all([
    resend.emails.send({
      from: FROM,
      to: opts.clientEmail,
      subject: `Contract started: ${opts.jobTitle}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h2>Your contract is active</h2>
        <p>You hired <strong>${opts.freelancerName}</strong> for <strong>${opts.jobTitle}</strong>.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/contracts/${opts.contractId}" style="display:inline-block;margin-top:20px;background:#14a800;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">View Contract →</a>
      </div>`,
    }),
  ])
}
