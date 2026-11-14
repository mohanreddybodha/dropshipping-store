import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
export const isResendConfigured = Boolean(resendApiKey);

const resend = isResendConfigured ? new Resend(resendApiKey) : null;

export interface OrderEmailItem {
  title: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

export interface SendOrderConfirmationParams {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingZip: string;
  totalRetail: number;
  items: OrderEmailItem[];
}

export interface SendAdminOrderAlertParams {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingZip: string;
  totalRetail: number;
  totalWholesale?: number;
  netProfit?: number;
  paypalOrderId: string;
  items: OrderEmailItem[];
}

/**
 * Sends a responsive, branded HTML order confirmation email to the buyer upon successful payment capture.
 * Sets reply_to: "support@vastire.com" so customer replies reach the store support team.
 */
export async function sendOrderConfirmationEmail(params: SendOrderConfirmationParams): Promise<boolean> {
  if (!resend || !isResendConfigured) {
    console.warn("[Email Service] RESEND_API_KEY is not configured; skipped customer confirmation email.");
    return false;
  }

  const {
    orderNumber,
    customerEmail,
    customerName,
    shippingAddress,
    shippingCity,
    shippingProvince,
    shippingZip,
    totalRetail,
    items,
  } = params;

  if (!customerEmail || !customerEmail.includes("@")) {
    return false;
  }

  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 0;">
          <div style="font-weight: 600; color: #0f172a; font-size: 14px;">${escapeHtml(item.title)}</div>
          ${
            item.size || item.color
              ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                  ${item.size ? `Size: ${escapeHtml(item.size)}` : ""}
                  ${item.size && item.color ? " • " : ""}
                  ${item.color ? `Color: ${escapeHtml(item.color)}` : ""}
                </div>`
              : ""
          }
        </td>
        <td style="padding: 12px 8px; text-align: center; color: #334155; font-size: 13px; font-weight: 600;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 0; text-align: right; color: #0f172a; font-size: 14px; font-weight: 700;">
          $${Number(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>`
    )
    .join("");

  const emailHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="background-color: #064e3b; padding: 24px 32px; text-align: left;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Vastire</h1>
                  <p style="margin: 4px 0 0 0; color: #a7f3d0; font-size: 13px;">Curated Home, Kitchen & Workspace Essentials</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 32px;">
                  <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 12px; font-weight: 700; padding: 4px 10px; rounded: 8px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px;">
                    Order Confirmed
                  </div>

                  <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #0f172a; font-weight: 800;">
                    Thank you for your order, ${escapeHtml(customerName)}!
                  </h2>
                  <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                    We have received your payment and dispatched your order to our domestic US fulfillment team. Your package will ship via tracked ground courier (USPS / UPS / FedEx) within 3–5 business days.
                  </p>

                  <!-- Order Metadata Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 6px 12px; font-size: 13px; color: #64748b;">Order Reference:</td>
                      <td style="padding: 6px 12px; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${orderNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 12px; font-size: 13px; color: #64748b;">Shipping SLA:</td>
                      <td style="padding: 6px 12px; font-size: 13px; color: #059669; font-weight: 700; text-align: right;">Est. 3–5 Business Days (Free)</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 12px; font-size: 13px; color: #64748b;">Deliver To:</td>
                      <td style="padding: 6px 12px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">
                        ${escapeHtml(shippingAddress)}, ${escapeHtml(shippingCity)}, ${shippingProvince} ${shippingZip}
                      </td>
                    </tr>
                  </table>

                  <!-- Items Table -->
                  <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; font-weight: 700;">Items Ordered</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <thead>
                      <tr style="border-bottom: 2px solid #e2e8f0;">
                        <th align="left" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Product</th>
                        <th align="center" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; width: 60px;">Qty</th>
                        <th align="right" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; width: 80px;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2" style="padding-top: 16px; font-size: 14px; font-weight: 600; color: #475569;">Domestic Ground Shipping</td>
                        <td style="padding-top: 16px; font-size: 14px; font-weight: 700; color: #059669; text-align: right;">Free</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 8px; font-size: 16px; font-weight: 800; color: #0f172a;">Total Paid</td>
                        <td style="padding-top: 8px; font-size: 18px; font-weight: 900; color: #0f172a; text-align: right;">$${totalRetail.toFixed(2)} USD</td>
                      </tr>
                    </tfoot>
                  </table>

                  <!-- Action Button -->
                  <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="https://vastire.com/orders" style="display: inline-block; background-color: #059669; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);">
                      Track Order on Vastire
                    </a>
                  </div>

                  <p style="margin: 24px 0 0 0; color: #64748b; font-size: 12px; text-align: center; line-height: 1.5;">
                    Need help or want to modify your order? Simply reply directly to this email or visit our <a href="https://vastire.com/orders" style="color: #059669; text-decoration: underline;">Support & Tracking Page</a>.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                  © ${new Date().getFullYear()} Vastire Inc. • Domestic US Fulfillment • All Rights Reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL || "Vastire Orders <orders@vastire.com>";
    const replyTo = "Vastire Support <support@vastire.com>";
    const adminEmail = (
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.ADMIN_EMAIL ||
      process.env.SUPPORT_EMAIL ||
      ""
    ).trim();

    const result = await resend.emails.send({
      from: fromAddress,
      to: customerEmail,
      ...(adminEmail && adminEmail.includes("@") ? { bcc: [adminEmail] } : {}),
      replyTo,
      subject: `Order Confirmed: ${orderNumber} - Vastire`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email Service] Resend dispatch failed:", result.error);
      return false;
    }

    console.info(`[Email Service] Confirmation email dispatched successfully to ${customerEmail} (ID: ${result.data?.id})`);
    return true;
  } catch (err: any) {
    console.error("[Email Service] Resend exception:", err?.message || err);
    return false;
  }
}

/**
 * Sends an internal, real-time alert email to the store owner / administrator
 * containing wholesale costs, net margins, customer contact, and PayPal reference.
 */
export async function sendAdminOrderAlertEmail(params: SendAdminOrderAlertParams): Promise<boolean> {
  if (!resend || !isResendConfigured) return false;

  const adminEmail = (
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    ""
  ).trim();

  if (!adminEmail || !adminEmail.includes("@")) {
    console.warn("[Email Service] No ADMIN_NOTIFICATION_EMAIL configured; skipped dedicated admin order alert.");
    return false;
  }

  const {
    orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    shippingCity,
    shippingProvince,
    shippingZip,
    totalRetail,
    totalWholesale = 0,
    netProfit = 0,
    paypalOrderId,
    items,
  } = params;

  const fromAddress = process.env.RESEND_FROM_EMAIL || "Vastire Orders <orders@vastire.com>";

  const itemsList = items
    .map(
      (it) => `<li style="margin-bottom: 6px;"><strong>${escapeHtml(it.title)}</strong> (Qty: ${it.quantity}) - $${Number(it.price * it.quantity).toFixed(2)}${it.size ? ` [Size: ${escapeHtml(it.size)}]` : ""}${it.color ? ` [Color: ${escapeHtml(it.color)}]` : ""}</li>`
    )
    .join("");

  const adminHtml = `
  <!DOCTYPE html>
  <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; padding: 24px;">
        <div style="background: #064e3b; color: #ffffff; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px; color: #ffffff;">🛒 New Paid Order Received</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #a7f3d0;">Order: <strong>${orderNumber}</strong> | PayPal Txn: ${paypalOrderId}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Customer:</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${escapeHtml(customerName)} (${escapeHtml(customerEmail)})</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Phone:</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${escapeHtml(customerPhone || "N/A")}</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Shipping Address:</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${escapeHtml(shippingAddress)}, ${escapeHtml(shippingCity)}, ${shippingProvince} ${shippingZip}</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Total Paid by Buyer:</td><td style="padding: 8px 0; font-weight: 700; color: #059669; text-align: right;">$${totalRetail.toFixed(2)} USD</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Est. Supplier Wholesale Cost:</td><td style="padding: 8px 0; text-align: right;">$${totalWholesale.toFixed(2)} USD</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 700;">Est. Net Profit:</td><td style="padding: 8px 0; font-weight: 800; color: #065f46; text-align: right;">$${netProfit.toFixed(2)} USD</td></tr>
        </table>

        <h3 style="font-size: 15px; margin: 16px 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Items (${items.length}):</h3>
        <ul style="padding-left: 20px; font-size: 13px; line-height: 1.6; color: #334155;">
          ${itemsList}
        </ul>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
          <a href="https://vastire.com/admin/orders" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">
            View in Admin Dashboard
          </a>
        </div>
      </div>
    </body>
  </html>
  `;

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      subject: `🛒 [NEW ORDER] $${totalRetail.toFixed(2)} - Order #${orderNumber} (${customerName})`,
      html: adminHtml,
    });

    if (result.error) {
      console.error("[Email Service] Admin notification failed:", result.error);
      return false;
    }
    console.info(`[Email Service] Admin alert sent to ${adminEmail} (ID: ${result.data?.id})`);
    return true;
  } catch (err: any) {
    console.error("[Email Service] Admin alert exception:", err?.message || err);
    return false;
  }
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
