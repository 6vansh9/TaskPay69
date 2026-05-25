import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_SMTP_PASSWORD,
  },
})

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    await transporter.sendMail({
      from: '"TaskPay" <taskpaystudents@gmail.com>',
      to,
      subject,
      html,
    })
    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Email error:', msg)
    return { success: false, error: msg }
  }
}

const ADMIN = process.env.ADMIN_EMAIL ?? 'vansh0145@gmail.com'
const APP   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taskpay69.vercel.app'

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

// ── Shared layout wrapper ─────────────────────────────────────────────────────
function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a">
    <tr>
      <td align="center" style="padding:40px 16px 48px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px">
              <a href="${APP}" style="text-decoration:none;display:inline-block">
                <span style="font-size:28px;font-weight:800;letter-spacing:-0.5px;color:#14a800">Task</span><span style="font-size:28px;font-weight:800;letter-spacing:-0.5px;color:#f0f0f0">Pay</span>
              </a>
              <div style="width:36px;height:3px;background:#14a800;border-radius:2px;margin:8px auto 0"></div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#111111;border:1px solid #1f1f1f;border-radius:16px;padding:36px 32px;color:#f0f0f0">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px">
              <p style="margin:0;color:#444444;font-size:12px;line-height:1.7">
                TaskPay &mdash; India&apos;s Freelance Marketplace<br>
                <a href="${APP}" style="color:#14a800;text-decoration:none">${APP}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Reusable parts ────────────────────────────────────────────────────────────

function cta(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
    <tr>
      <td style="border-radius:50px;background:#14a800">
        <a href="${href}" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.2px">${label}</a>
      </td>
    </tr>
  </table>`
}

function divider(): string {
  return `<div style="height:1px;background:#1f1f1f;margin:24px 0"></div>`
}

function stat(label: string, value: string, highlight = false): string {
  return `<tr>
    <td style="padding:11px 16px;font-size:13px;color:#888888;border-bottom:1px solid #1a1a1a">${label}</td>
    <td style="padding:11px 16px;font-size:14px;font-weight:${highlight ? '700' : '500'};color:${highlight ? '#14a800' : '#f0f0f0'};text-align:right;border-bottom:1px solid #1a1a1a">${value}</td>
  </tr>`
}

function statsTable(rows: { label: string; value: string; highlight?: boolean }[]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#161616;border:1px solid #1f1f1f;border-radius:10px;overflow:hidden;margin:20px 0">
    ${rows.map(r => stat(r.label, r.value, r.highlight)).join('')}
  </table>`
}

function badge(text: string): string {
  return `<span style="display:inline-block;background:rgba(20,168,0,0.12);color:#14a800;border:1px solid rgba(20,168,0,0.25);border-radius:50px;padding:3px 12px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase">${text}</span>`
}

// ── 1. Welcome email ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  recipientEmail: string
  recipientName: string
  role: 'freelancer' | 'client'
}) {
  const isFreelancer = opts.role === 'freelancer'
  const html = layout(`
    <p style="margin:0 0 6px;font-size:13px;color:#888888">Hey ${opts.recipientName},</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#f0f0f0;line-height:1.3">Welcome to TaskPay! 🎉</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#b0b0b0;line-height:1.7">
      ${isFreelancer
        ? 'Your freelancer profile is live. Start browsing open jobs, submit proposals, and get paid securely through escrow.'
        : 'Your client account is ready. Post your first job, review proposals from verified freelancers, and hire with confidence.'
      }
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
      ${isFreelancer ? `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1f1f1f">
          <span style="color:#14a800;font-size:16px;margin-right:10px">✓</span>
          <span style="font-size:14px;color:#c0c0c0">Browse 100s of open jobs</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1f1f1f">
          <span style="color:#14a800;font-size:16px;margin-right:10px">✓</span>
          <span style="font-size:14px;color:#c0c0c0">Get paid securely through escrow</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0">
          <span style="color:#14a800;font-size:16px;margin-right:10px">✓</span>
          <span style="font-size:14px;color:#c0c0c0">Build your reputation with verified reviews</span>
        </td>
      </tr>
      ` : `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1f1f1f">
          <span style="color:#14a800;font-size:16px;margin-right:10px">✓</span>
          <span style="font-size:14px;color:#c0c0c0">Post jobs and receive proposals instantly</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1f1f1f">
          <span style="color:#14a800;font-size:16px;margin-right:10px">✓</span>
          <span style="font-size:14px;color:#c0c0c0">Funds held safely in escrow until you approve</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0">
          <span style="color:#14a800;font-size:16px;margin-right:10px">✓</span>
          <span style="font-size:14px;color:#c0c0c0">Milestone tracking and dispute resolution included</span>
        </td>
      </tr>
      `}
    </table>

    ${cta(isFreelancer ? 'Browse Jobs →' : 'Post Your First Job →', isFreelancer ? `${APP}/jobs` : `${APP}/jobs/post`)}

    ${divider()}
    <p style="margin:0;font-size:12px;color:#555555;line-height:1.6">
      Questions? Reply to this email or visit our <a href="${APP}/help" style="color:#14a800;text-decoration:none">Help Centre</a>.
    </p>
  `)

  await sendEmail({ to: opts.recipientEmail, subject: `Welcome to TaskPay, ${opts.recipientName}! 🎉`, html })
}

// ── 2. Hired notification ─────────────────────────────────────────────────────

export async function sendHiredEmail(opts: {
  freelancerEmail: string
  freelancerName: string
  clientName: string
  jobTitle: string
  contractId: string
  agreedRate: number
}) {
  const html = layout(`
    <div style="margin-bottom:20px">${badge('New Contract')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f0f0;line-height:1.3">
      Congratulations, ${opts.freelancerName}! 🎉
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;line-height:1.7">
      <strong style="color:#f0f0f0">${opts.clientName}</strong> has hired you. Your contract is now active. Head over to review the details and get started.
    </p>

    ${statsTable([
      { label: 'Job', value: opts.jobTitle },
      { label: 'Client', value: opts.clientName },
      { label: 'Contract value', value: inr(opts.agreedRate), highlight: true },
    ])}

    <div style="background:rgba(20,168,0,0.06);border:1px solid rgba(20,168,0,0.2);border-radius:10px;padding:14px 16px;margin:0 0 4px">
      <p style="margin:0;font-size:13px;color:#a0a0a0;line-height:1.6">
        <span style="color:#14a800;font-weight:700">🔒 Escrow protected.</span> Payment is held securely and released only after you complete the work and the client approves.
      </p>
    </div>

    ${cta('View Contract →', `${APP}/contracts/${opts.contractId}`)}

    ${divider()}
    <p style="margin:0;font-size:12px;color:#555555">
      This notification was sent to ${opts.freelancerEmail}
    </p>
  `)

  await sendEmail({ to: opts.freelancerEmail, subject: `🎉 You've been hired for "${opts.jobTitle}"`, html })
}

// ── 3. Payment received ───────────────────────────────────────────────────────

export async function sendPaymentReceivedEmail(opts: {
  freelancerEmail: string
  freelancerName: string
  clientName: string
  jobTitle: string
  contractId: string
  totalAmount: number
  platformFee: number
  netAmount: number
}) {
  const html = layout(`
    <div style="margin-bottom:20px">${badge('Payment Approved')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f0f0;line-height:1.3">
      Payment is on its way, ${opts.freelancerName}! 💰
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;line-height:1.7">
      <strong style="color:#f0f0f0">${opts.clientName}</strong> has approved your work on <strong style="color:#f0f0f0">${opts.jobTitle}</strong> and released payment from escrow.
    </p>

    ${statsTable([
      { label: 'Contract total', value: inr(opts.totalAmount) },
      { label: 'Platform fee (10%)', value: '− ' + inr(opts.platformFee) },
      { label: 'You receive', value: inr(opts.netAmount), highlight: true },
    ])}

    <div style="background:rgba(20,168,0,0.06);border:1px solid rgba(20,168,0,0.2);border-radius:10px;padding:14px 16px;margin:0 0 4px">
      <p style="margin:0;font-size:13px;color:#a0a0a0;line-height:1.6">
        <span style="color:#14a800;font-weight:700">⏱ Transfer in progress.</span> Funds will arrive in your linked bank account within <strong style="color:#f0f0f0">2–3 business days</strong>.
      </p>
    </div>

    ${cta('View Payout Status →', `${APP}/payouts`)}

    ${divider()}
    <p style="margin:0;font-size:12px;color:#555555">
      This notification was sent to ${opts.freelancerEmail}
    </p>
  `)

  await sendEmail({ to: opts.freelancerEmail, subject: `💰 ${inr(opts.netAmount)} payment approved for "${opts.jobTitle}"`, html })
}

// ── 4. Review request ─────────────────────────────────────────────────────────

export async function sendReviewRequestEmail(opts: {
  recipientEmail: string
  recipientName: string
  otherPartyName: string
  jobTitle: string
  contractId: string
  role: 'freelancer' | 'client'
}) {
  const isFreelancer = opts.role === 'freelancer'
  const html = layout(`
    <div style="text-align:center;padding:8px 0 20px">
      <span style="font-size:48px;line-height:1">⭐</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f0f0;line-height:1.3;text-align:center">
      How did it go?
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;line-height:1.7;text-align:center">
      Your contract for <strong style="color:#f0f0f0">${opts.jobTitle}</strong> is complete.
      ${isFreelancer
        ? `Let <strong style="color:#f0f0f0">${opts.otherPartyName}</strong> know how the experience was.`
        : `Tell the community about <strong style="color:#f0f0f0">${opts.otherPartyName}</strong>'s work.`
      }
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
      <tr>
        <td align="center">
          <a href="${APP}/contracts/${opts.contractId}" style="text-decoration:none;font-size:36px;letter-spacing:4px;color:#14a800">★★★★★</a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top:6px">
          <span style="font-size:12px;color:#555555">Click to leave your rating</span>
        </td>
      </tr>
    </table>

    <div style="background:#161616;border:1px solid #1f1f1f;border-radius:10px;padding:16px;margin-bottom:4px">
      <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;text-align:center">
        Reviews help the TaskPay community make better decisions.<br>
        <strong style="color:#a0a0a0">You have 14 days</strong> to leave a review.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0">
      <tr>
        <td style="border-radius:50px;background:#14a800">
          <a href="${APP}/contracts/${opts.contractId}" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.2px">Leave a Review →</a>
        </td>
      </tr>
    </table>

    ${divider()}
    <p style="margin:0;font-size:12px;color:#555555">
      This notification was sent to ${opts.recipientEmail}
    </p>
  `)

  await sendEmail({ to: opts.recipientEmail, subject: `⭐ Leave a review for "${opts.jobTitle}"`, html })
}

// ── 5. Proposal received ──────────────────────────────────────────────────────

export async function sendProposalReceivedEmail(opts: {
  clientEmail: string
  clientName: string
  freelancerName: string
  jobTitle: string
  jobId: string
}) {
  const html = layout(`
    <div style="margin-bottom:20px">${badge('New Proposal')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f0f0;line-height:1.3">
      New proposal on your job
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;line-height:1.7">
      <strong style="color:#f0f0f0">${opts.freelancerName}</strong> submitted a proposal for <strong style="color:#f0f0f0">${opts.jobTitle}</strong>. Review their bid and cover letter now.
    </p>

    ${cta('Review Proposals →', `${APP}/jobs/${opts.jobId}/proposals`)}

    ${divider()}
    <p style="margin:0;font-size:12px;color:#555555">
      This notification was sent to ${opts.clientEmail}
    </p>
  `)

  await sendEmail({ to: opts.clientEmail, subject: `New proposal from ${opts.freelancerName} on "${opts.jobTitle}"`, html })
}

// ── 6. Dispute raised (party notice) ─────────────────────────────────────────

export async function sendDisputeEmail(opts: {
  partyEmail: string
  partyName: string
  raisedByName: string
  jobTitle: string
  contractId: string
  reason: string
}) {
  const html = layout(`
    <div style="margin-bottom:20px">${badge('Dispute Notice')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f0f0;line-height:1.3">
      A dispute has been raised
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;line-height:1.7">
      <strong style="color:#f0f0f0">${opts.raisedByName}</strong> has raised a dispute on the contract for <strong style="color:#f0f0f0">${opts.jobTitle}</strong>.
    </p>

    ${statsTable([
      { label: 'Job', value: opts.jobTitle },
      { label: 'Raised by', value: opts.raisedByName },
      { label: 'Reason', value: opts.reason },
    ])}

    <div style="background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:14px 16px;margin:0 0 4px">
      <p style="margin:0;font-size:13px;color:#a0a0a0;line-height:1.6">
        <span style="color:#f87171;font-weight:700">⏸ Contract on hold.</span> Our admin team will review and resolve the dispute within <strong style="color:#f0f0f0">48–72 hours</strong>.
      </p>
    </div>

    ${cta('View Contract →', `${APP}/contracts/${opts.contractId}`)}

    ${divider()}
    <p style="margin:0;font-size:12px;color:#555555">
      This notification was sent to ${opts.partyEmail}
    </p>
  `)

  await sendEmail({ to: opts.partyEmail, subject: `Dispute raised on "${opts.jobTitle}"`, html })
}

// ── 7. Dispute resolved ───────────────────────────────────────────────────────

export async function sendDisputeResolvedEmail(opts: {
  partyEmail: string
  partyName: string
  jobTitle: string
  contractId: string
  resolution: string
  winner: 'client' | 'freelancer'
  isWinner: boolean
}) {
  const winColor  = opts.isWinner ? '#14a800' : '#f87171'
  const winBg     = opts.isWinner ? 'rgba(20,168,0,0.06)' : 'rgba(248,113,113,0.06)'
  const winBorder = opts.isWinner ? 'rgba(20,168,0,0.2)' : 'rgba(248,113,113,0.2)'
  const winLabel  = opts.isWinner ? '✓ Decision in your favour' : 'Decision against you'

  const html = layout(`
    <div style="margin-bottom:20px">${badge('Dispute Resolved')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f0f0;line-height:1.3">
      Dispute resolved
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;line-height:1.7">
      Our admin team has reviewed and resolved the dispute on <strong style="color:#f0f0f0">${opts.jobTitle}</strong>.
    </p>

    <div style="background:${winBg};border:1px solid ${winBorder};border-radius:10px;padding:16px 18px;margin-bottom:4px">
      <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${winColor}">${winLabel}</p>
      <p style="margin:0;font-size:14px;color:#a0a0a0;line-height:1.6">${opts.resolution}</p>
    </div>

    ${cta('View Contract →', `${APP}/contracts/${opts.contractId}`)}

    ${divider()}
    <p style="margin:0;font-size:12px;color:#555555">
      This notification was sent to ${opts.partyEmail}
    </p>
  `)

  await sendEmail({ to: opts.partyEmail, subject: `Dispute resolved: "${opts.jobTitle}" ${opts.isWinner ? '(in your favour)' : ''}`, html })
}

// ── 8. Admin dispute alert ────────────────────────────────────────────────────

export async function sendAdminDisputeAlertEmail(opts: {
  jobTitle: string
  raisedByName: string
  raisedByRole: string
  reason: string
  amount: number
  contractId: string
  disputeId: string
}) {
  const html = layout(`
    <div style="margin-bottom:20px">${badge('Admin Alert')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f87171;line-height:1.3">
      ⚠️ New Dispute: Action Required
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;line-height:1.7">
      A dispute has been raised and requires immediate admin review.
    </p>

    ${statsTable([
      { label: 'Job', value: opts.jobTitle },
      { label: 'Raised by', value: `${opts.raisedByName} (${opts.raisedByRole})` },
      { label: 'Amount in dispute', value: inr(opts.amount), highlight: true },
      { label: 'Reason', value: opts.reason },
    ])}

    ${cta('Review Dispute →', `${APP}/admin/disputes`)}
  `)

  await sendEmail({ to: ADMIN, subject: `⚠️ Dispute raised on "${opts.jobTitle}" by ${opts.raisedByName}`, html })
}

// ── 9. Payout processed ───────────────────────────────────────────────────────

export async function sendWithdrawalPaidEmail(opts: {
  freelancerEmail: string
  freelancerName: string
  amount: number
  method: string
}) {
  const html = layout(`
    <div style="margin-bottom:20px">${badge('Payout Processed')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f0f0;line-height:1.3">
      Your payout is on the way! 💸
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;line-height:1.7">
      Your withdrawal has been processed and is being transferred to your <strong style="color:#f0f0f0">${opts.method}</strong>.
    </p>

    ${statsTable([
      { label: 'Amount transferred', value: inr(opts.amount), highlight: true },
      { label: 'Method', value: opts.method },
      { label: 'Estimated arrival', value: '1–2 business days' },
    ])}

    ${cta('View Payout History →', `${APP}/payouts`)}

    ${divider()}
    <p style="margin:0;font-size:12px;color:#555555">
      This notification was sent to ${opts.freelancerEmail}
    </p>
  `)

  await sendEmail({ to: opts.freelancerEmail, subject: `💸 Payout of ${inr(opts.amount)} processed`, html })
}

// ── 10. Contract created (both parties) ──────────────────────────────────────

export async function sendContractCreatedEmail(opts: {
  clientEmail: string
  clientName: string
  freelancerEmail: string
  freelancerName: string
  jobTitle: string
  contractId: string
}) {
  const html = layout(`
    <div style="margin-bottom:20px">${badge('Contract Started')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f0f0;line-height:1.3">
      Contract is active
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;line-height:1.7">
      A new contract has been created between <strong style="color:#f0f0f0">${opts.clientName}</strong> and <strong style="color:#f0f0f0">${opts.freelancerName}</strong> for the job <strong style="color:#f0f0f0">${opts.jobTitle}</strong>.
    </p>

    ${cta('View Contract →', `${APP}/contracts/${opts.contractId}`)}

    ${divider()}
    <p style="margin:0;font-size:12px;color:#555555">
      Parties: ${opts.clientEmail} &amp; ${opts.freelancerEmail}
    </p>
  `)

  await Promise.all([
    sendEmail({ to: opts.clientEmail,     subject: `Contract started: "${opts.jobTitle}"`, html }),
    sendEmail({ to: opts.freelancerEmail, subject: `Contract started: "${opts.jobTitle}"`, html }),
  ])
}
