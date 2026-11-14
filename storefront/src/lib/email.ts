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
 * Sends a responsive, enterprise-grade HTML order confirmation email to the buyer upon successful payment capture.
 * Designed to Amazon / Flipkart commercial standards: pure typography wordmark (zero dark-mode edge artifacts),
 * clean order metadata grid, and formal customer service notification disclaimers.
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
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 16px 8px 16px 0; vertical-align: top;">
          <div style="font-weight: 700; color: #0f172a; font-size: 15px; line-height: 1.4;">${escapeHtml(item.title)}</div>
          ${
            item.size || item.color
              ? `<div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                  ${item.color ? `Color: <span style="color: #334155; font-weight: 600;">${escapeHtml(item.color)}</span>` : ""}
                  ${item.size && item.color ? " &bull; " : ""}
                  ${item.size ? `Size: <span style="color: #334155; font-weight: 600;">${escapeHtml(item.size)}</span>` : ""}
                </div>`
              : ""
          }
        </td>
        <td style="padding: 16px 12px; text-align: center; color: #334155; font-size: 14px; font-weight: 600; vertical-align: top; white-space: nowrap;">
          ${item.quantity}
        </td>
        <td style="padding: 16px 0 16px 12px; text-align: right; color: #0f172a; font-size: 15px; font-weight: 700; vertical-align: top; white-space: nowrap;">
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
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>Order Confirmation: #${orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 24px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
              
              <!-- Clean Enterprise Typography Header -->
              <tr>
                <td style="background-color: #ffffff; padding: 24px 32px; border-bottom: 1px solid #e2e8f0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align: middle;">
                        <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #064e3b; text-decoration: none; display: inline-block;">
                          VASTIRE
                        </span>
                      </td>
                      <td style="vertical-align: middle; text-align: right;">
                        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #047857; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 6px 12px; border-radius: 4px; display: inline-block;">
                          Order Confirmed
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main Content Body -->
              <tr>
                <td style="padding: 32px 32px 24px 32px;">
                  <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                    Thank you for your order, ${escapeHtml(customerName)}.
                  </h1>
                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                    We are processing your items for domestic shipment. Once your package has been handed over to the carrier, we will send an email update with your official courier tracking number.
                  </p>

                  <!-- Delivery & Order Reference Card (Amazon-style clean data grid) -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin-bottom: 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; line-height: 1.5;">
                      <tr>
                        <td style="padding-bottom: 8px; color: #64748b; font-weight: 600; width: 38%;">Order Number:</td>
                        <td style="padding-bottom: 8px; color: #0f172a; font-weight: 700; text-align: right;">${orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #64748b; font-weight: 600;">Estimated Delivery:</td>
                        <td style="padding-bottom: 8px; color: #047857; font-weight: 700; text-align: right;">3&ndash;5 Business Days</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #64748b; font-weight: 600;">Delivery Method:</td>
                        <td style="padding-bottom: 8px; color: #0f172a; font-weight: 600; text-align: right;">Tracked Ground (USPS / UPS / FedEx)</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600; vertical-align: top;">Shipping Address:</td>
                        <td style="color: #0f172a; font-weight: 600; text-align: right;">
                          ${escapeHtml(shippingAddress)}<br />
                          ${escapeHtml(shippingCity)}, ${escapeHtml(shippingProvince)} ${escapeHtml(shippingZip)}
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Order Summary Section -->
                  <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
                    Order Summary
                  </div>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <thead>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <th align="left" style="padding: 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Item</th>
                        <th align="center" style="padding: 8px 6px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; width: 50px;">Qty</th>
                        <th align="right" style="padding: 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; width: 80px;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2" style="padding: 14px 0 4px 0; font-size: 13px; color: #64748b; text-align: right;">Items Subtotal:</td>
                        <td style="padding: 14px 0 4px 0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">$${Number(totalRetail).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 4px 0 4px 0; font-size: 13px; color: #64748b; text-align: right;">Shipping &amp; Handling:</td>
                        <td style="padding: 4px 0 4px 0; font-size: 13px; color: #047857; font-weight: 700; text-align: right;">FREE</td>
                      </tr>
                      <tr style="border-top: 1px solid #e2e8f0;">
                        <td colspan="2" style="padding: 14px 0 4px 0; font-size: 15px; font-weight: 800; color: #0f172a; text-align: right;">Total Paid:</td>
                        <td style="padding: 14px 0 4px 0; font-size: 18px; font-weight: 800; color: #064e3b; text-align: right;">$${Number(totalRetail).toFixed(2)} USD</td>
                      </tr>
                    </tfoot>
                  </table>

                  <!-- Manage Order Action (Amazon-style clean CTA button) -->
                  <div style="margin: 28px 0 20px 0;">
                    <a href="https://vastire.com/orders" style="display: block; width: 100%; box-sizing: border-box; background-color: #064e3b; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 20px; text-decoration: none; border-radius: 6px; text-align: center; letter-spacing: 0.2px;">
                      View or Manage Order Details &rarr;
                    </a>
                  </div>

                  <!-- Professional Corporate Disclaimer (Amazon / Flipkart standard) -->
                  <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; line-height: 1.6; color: #64748b;">
                    <p style="margin: 0 0 10px 0;">
                      <strong>Please note:</strong> This message was sent from an automated notification address that cannot accept incoming email. Please do not reply directly to this message.
                    </p>
                    <p style="margin: 0;">
                      If you require assistance or wish to request modifications prior to dispatch, our Customer Support team is available at <a href="mailto:support@vastire.com" style="color: #047857; font-weight: 600; text-decoration: underline;">support@vastire.com</a>, or you may manage your order through your <a href="https://vastire.com/orders" style="color: #047857; font-weight: 600; text-decoration: underline;">Order Status Portal</a>.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer with Essential Links -->
              <tr>
                <td style="background-color: #f8fafc; padding: 18px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.6;">
                  Vastire &bull; Domestic US Order Fulfillment<br />
                  <a href="https://vastire.com" style="color: #64748b; text-decoration: none;">vastire.com</a> &bull;
                  <a href="https://vastire.com/terms" style="color: #64748b; text-decoration: none;">Terms of Service</a> &bull;
                  <a href="https://vastire.com/privacy" style="color: #64748b; text-decoration: none;">Privacy Policy</a>
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
      subject: `Order Confirmation: #${orderNumber} - Vastire`,
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
 * containing wholesale costs, net margins, customer contact, and instant admin dashboard access.
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
      (it) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #0f172a; font-size: 13px; font-weight: 600;">
          ${escapeHtml(it.title)}
          ${it.color || it.size ? `<div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">${it.color ? `Color: ${escapeHtml(it.color)}` : ''} ${it.size ? `Size: ${escapeHtml(it.size)}` : ''}</div>` : ''}
        </td>
        <td style="padding: 10px 6px; text-align: center; color: #475569; font-size: 13px; font-weight: 700; white-space: nowrap;">&times; ${it.quantity}</td>
        <td style="padding: 10px 0; text-align: right; color: #0f172a; font-size: 13px; font-weight: 700; white-space: nowrap;">$${Number(it.price * it.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const adminHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>[OPERATIONS ALERT] New Paid Order: #${orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 24px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
              
              <!-- Clean Enterprise Header -->
              <tr>
                <td style="background-color: #ffffff; padding: 20px 28px; border-bottom: 1px solid #e2e8f0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align: middle;">
                        <span style="font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.8px; color: #047857; display: block; margin-bottom: 2px;">
                          Merchant Operations &bull; Real-Time Capture
                        </span>
                        <div style="font-size: 18px; font-weight: 800; color: #0f172a;">
                          Order #${orderNumber}
                        </div>
                      </td>
                      <td style="vertical-align: middle; text-align: right;">
                        <a href="https://vastire.com/admin/orders" style="display: inline-block; background-color: #064e3b; color: #ffffff; font-weight: 700; font-size: 12px; padding: 9px 16px; text-decoration: none; border-radius: 6px; white-space: nowrap;">
                          Open in Dashboard &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Financial Settlement Ledger Card -->
              <tr>
                <td style="padding: 24px 28px 12px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
                    <tr>
                      <td style="width: 33%; text-align: left;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Gross Retail</div>
                        <div style="font-size: 18px; color: #0f172a; font-weight: 800; margin-top: 2px;">$${totalRetail.toFixed(2)}</div>
                      </td>
                      <td style="width: 33%; text-align: center; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Estimated COGS</div>
                        <div style="font-size: 18px; color: #475569; font-weight: 800; margin-top: 2px;">$${totalWholesale.toFixed(2)}</div>
                      </td>
                      <td style="width: 33%; text-align: right;">
                        <div style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: 700;">Projected Net Margin</div>
                        <div style="font-size: 18px; color: #047857; font-weight: 800; margin-top: 2px;">+$${netProfit.toFixed(2)}</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Customer & Shipping Destination -->
                  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.5;">
                    <div style="margin-bottom: 6px;">
                      <span style="color: #64748b; font-weight: 600;">Customer: </span>
                      <strong style="color: #0f172a;">${escapeHtml(customerName)}</strong>
                      <span style="color: #64748b;">(<a href="mailto:${customerEmail}" style="color: #047857; text-decoration: none;">${customerEmail}</a>)</span>
                    </div>
                    ${customerPhone ? `<div style="margin-bottom: 6px;"><span style="color: #64748b; font-weight: 600;">Phone: </span><span style="color: #0f172a;">${escapeHtml(customerPhone)}</span></div>` : ''}
                    <div style="margin-bottom: 6px;">
                      <span style="color: #64748b; font-weight: 600;">Destination: </span>
                      <span style="color: #0f172a; font-weight: 600;">${escapeHtml(shippingAddress)}, ${escapeHtml(shippingCity)}, ${shippingProvince} ${shippingZip}</span>
                    </div>
                    <div>
                      <span style="color: #64748b; font-weight: 600;">Payment Reference: </span>
                      <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #334155;">${escapeHtml(paypalOrderId)}</code>
                    </div>
                  </div>

                  <!-- Line Items -->
                  <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
                    Order Line Items (${items.length})
                  </div>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tbody>
                      ${itemsList}
                    </tbody>
                  </table>

                  <!-- Primary Action Button -->
                  <div style="text-align: center; margin: 18px 0 10px 0; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <a href="https://vastire.com/admin/orders" style="display: block; width: 100%; box-sizing: border-box; background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 14px; padding: 13px 20px; text-decoration: none; border-radius: 6px; text-align: center;">
                      View Order in Merchant Fulfillment Console &rarr;
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 14px 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                  Internal Operational Communication &bull; Vastire Store Administration
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
    const result = await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      subject: `[OPERATIONS ALERT] New Paid Order: #${orderNumber} - $${totalRetail.toFixed(2)}`,
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
