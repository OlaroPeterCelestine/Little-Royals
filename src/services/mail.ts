import { apiRequest } from '@/services/http'

export type MailMessage = {
  id: string
  folder: string
  status: string
  from: string
  to: string
  cc?: string
  subject: string
  bodyHtml?: string
  bodyText?: string
  error?: string
  senderEmail?: string
  sentAt?: string
  createdAt: string
}

export type MailStatus = {
  smtpConfigured: boolean
  from: string
  fromName: string
  host: string
  port: number
  mode: 'smtp' | 'local-store' | string
}

export async function getMailStatus(): Promise<MailStatus> {
  const { data } = await apiRequest<MailStatus>('/api/v1/mail/status', {
    bustCache: true,
  })
  return data
}

export async function listMail(folder = 'sent'): Promise<MailMessage[]> {
  const { data } = await apiRequest<MailMessage[]>(
    `/api/v1/mail?folder=${encodeURIComponent(folder)}`,
    { bustCache: true },
  )
  return Array.isArray(data) ? data : []
}

export async function sendMail(payload: {
  to: string
  cc?: string
  subject: string
  bodyHtml?: string
  bodyText?: string
}): Promise<MailMessage> {
  const { data } = await apiRequest<MailMessage>('/api/v1/mail/send', {
    method: 'POST',
    body: payload,
  })
  return data
}

export async function saveMailDraft(payload: {
  to: string
  cc?: string
  subject: string
  bodyHtml?: string
}): Promise<MailMessage> {
  const { data } = await apiRequest<MailMessage>('/api/v1/mail/drafts', {
    method: 'POST',
    body: payload,
  })
  return data
}

export async function deleteMail(id: string): Promise<void> {
  await apiRequest(`/api/v1/mail/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
