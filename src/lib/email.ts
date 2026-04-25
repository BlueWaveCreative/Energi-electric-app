import nodemailer from 'nodemailer'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://blue-shores-pm.vercel.app'

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const FROM = process.env.SMTP_FROM ?? 'noreply@blueshoresnc.com'

export async function sendPortalShareEmail({
  to,
  customerName,
  portalToken,
}: {
  to: string
  customerName: string
  portalToken: string
}) {
  const portalUrl = `${BASE_URL}/portal/${portalToken}`
  const transporter = createTransporter()

  return transporter.sendMail({
    from: FROM,
    to,
    subject: 'Your Blue Shores Electric Project Portal',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #32373C;">
          <h1 style="font-size: 22px; color: #32373C;">Hi ${customerName},</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            Blue Shores Electric has set up a portal for you to view your project status and invoices.
          </p>
          <a href="${portalUrl}" style="display: inline-block; background-color: #045815; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 16px 0;">
            View My Portal
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 24px;">
            Bookmark this link — you can use it anytime to check on your project and view invoices.
          </p>
          <p style="font-size: 14px; color: #666;">
            Questions? Call us at <a href="tel:9106192000" style="color: #045815;">(910) 619-2000</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">Blue Shores Electric · Wilmington, NC</p>
        </body>
      </html>
    `,
  })
}

export async function sendInvoiceNotificationEmail({
  to,
  customerName,
  portalToken,
  invoiceTitle,
  invoiceNumber,
  totalAmount,
  dueDate,
}: {
  to: string
  customerName: string
  portalToken: string
  invoiceTitle: string
  invoiceNumber: number
  totalAmount: number
  dueDate: string | null
}) {
  const portalUrl = `${BASE_URL}/portal/${portalToken}`
  const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)
  const formattedDue = dueDate
    ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const transporter = createTransporter()

  return transporter.sendMail({
    from: FROM,
    to,
    subject: `Invoice #${invoiceNumber} from Blue Shores Electric`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #32373C;">
          <h1 style="font-size: 22px; color: #32373C;">Hi ${customerName},</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            You have a new invoice from Blue Shores Electric.
          </p>
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #666;">Invoice #${invoiceNumber}</p>
            <p style="margin: 0 0 8px; font-size: 18px; font-weight: bold; color: #32373C;">${invoiceTitle}</p>
            <p style="margin: 0 0 8px; font-size: 24px; font-weight: bold; color: #045815;">${formattedTotal}</p>
            ${formattedDue ? `<p style="margin: 0; font-size: 14px; color: #666;">Due: ${formattedDue}</p>` : ''}
          </div>
          <a href="${portalUrl}" style="display: inline-block; background-color: #045815; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 16px 0;">
            View Invoice
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 24px;">
            Questions? Call us at <a href="tel:9106192000" style="color: #045815;">(910) 619-2000</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">Blue Shores Electric · Wilmington, NC</p>
        </body>
      </html>
    `,
  })
}
