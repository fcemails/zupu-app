import nodemailer from 'nodemailer'
import { logWarn } from './logger'

const SMTP_HOST = process.env.EMAIL_SMTP_HOST
const SMTP_PORT = process.env.EMAIL_SMTP_PORT ? Number(process.env.EMAIL_SMTP_PORT) : 587
const SMTP_USER = process.env.EMAIL_SMTP_USER
const SMTP_PASS = process.env.EMAIL_SMTP_PASS
const EMAIL_FROM = process.env.EMAIL_FROM || `no-reply@${process.env.EMAIL_DOMAIN ?? 'localhost'}`

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
} else {
  logWarn('Email is not fully configured. Invitations will not be sent by email.', {
    smtpHost: SMTP_HOST,
    smtpUser: SMTP_USER ? 'configured' : 'missing',
    smtpPass: SMTP_PASS ? 'configured' : 'missing',
  })
}

export async function sendInvitationEmail(to: string, subject: string, html: string) {
  if (!transporter) {
    throw new Error('SMTP transporter is not configured')
  }

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  })
}
