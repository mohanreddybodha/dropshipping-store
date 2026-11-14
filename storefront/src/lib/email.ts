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
        <td style="padding: 16px 8px 16px 0; vertical-align: middle;">
          <div style="font-weight: 700; color: #0f172a; font-size: 15px; line-height: 1.4;">${escapeHtml(item.title)}</div>
          ${
            item.size || item.color
              ? `<div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                  ${item.size ? `Size: <strong>${escapeHtml(item.size)}</strong>` : ""}
                  ${item.size && item.color ? " &bull; " : ""}
                  ${item.color ? `Color: <strong>${escapeHtml(item.color)}</strong>` : ""}
                </div>`
              : ""
          }
        </td>
        <td style="padding: 16px 12px; text-align: center; color: #334155; font-size: 14px; font-weight: 700; vertical-align: middle;">
          ${item.quantity}
        </td>
        <td style="padding: 16px 0 16px 12px; text-align: right; color: #0f172a; font-size: 15px; font-weight: 800; vertical-align: middle;">
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
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 20px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 680px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
              <!-- Brand Header with Vastire Emblem Icon -->
              <tr>
                <td style="background-color: #064e3b; padding: 24px 36px; text-align: left;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="vertical-align: middle; width: 50px;">
                        <img src="https://vastire.com/brand-emblem.png" width="46" height="37" alt="Vastire" style="display: block; width: 46px; height: auto; border: 0;" />
                      </td>
                      <td style="vertical-align: middle; padding-left: 14px;">
                        <span style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1; display: block;">Vastire</span>
                        <span style="color: #a7f3d0; font-size: 13px; font-weight: 500; margin-top: 2px; display: block;">Curated Home, Kitchen &amp; Workspace Essentials</span>
                      </td>
                      <td style="vertical-align: middle; text-align: right;">
                        <span style="background-color: #047857; color: #ffffff; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                          Order Confirmed
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Email Body -->
              <tr>
                <td style="padding: 36px;">
                  <h2 style="margin: 0 0 10px 0; font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: -0.3px;">
                    Thank you for your order, ${escapeHtml(customerName)}!
                  </h2>
                  <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                    We have received your payment and dispatched your order to our domestic US fulfillment warehouse. Your package will ship via tracked ground courier within 3&ndash;5 business days.
                  </p>

                  <!-- 2-Column Responsive Order Information Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
                    <tr>
                      <td style="padding: 18px 24px; width: 50%; vertical-align: top; border-right: 1px solid #e2e8f0;">
                        <div style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">Order Reference</div>
                        <div style="font-size: 16px; color: #0f172a; font-weight: 800;">${orderNumber}</div>
                        <div style="font-size: 13px; color: #059669; font-weight: 700; margin-top: 6px;">&#10003; 3&ndash;5 Day Domestic Delivery</div>
                      </td>
                      <td style="padding: 18px 24px; width: 50%; vertical-align: top;">
                        <div style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">Shipping Destination</div>
                        <div style="font-size: 14px; color: #0f172a; font-weight: 600; line-height: 1.4;">
                          ${escapeHtml(shippingAddress)}<br />
                          ${escapeHtml(shippingCity)}, ${escapeHtml(shippingProvince)} ${escapeHtml(shippingZip)}
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Order Items Table -->
                  <h3 style="margin: 0 0 14px 0; font-size: 16px; color: #0f172a; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                    Items Ordered
                  </h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <thead>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <th align="left" style="padding: 8px 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700;">Item</th>
                        <th align="center" style="padding: 8px 12px; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; width: 60px;">Qty</th>
                        <th align="right" style="padding: 8px 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; width: 100px;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2" style="padding: 16px 0 6px 0; font-size: 14px; color: #64748b; text-align: right;">Subtotal:</td>
                        <td style="padding: 16px 0 6px 0; font-size: 15px; color: #0f172a; font-weight: 700; text-align: right;">$${Number(totalRetail).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 4px 0 10px 0; font-size: 14px; color: #64748b; text-align: right;">Domestic Tracked Delivery:</td>
                        <td style="padding: 4px 0 10px 0; font-size: 14px; color: #059669; font-weight: 800; text-align: right;">FREE</td>
                      </tr>
                      <tr style="border-top: 2px solid #e2e8f0;">
                        <td colspan="2" style="padding: 14px 0; font-size: 16px; font-weight: 800; color: #0f172a; text-align: right;">Total Paid:</td>
                        <td style="padding: 14px 0; font-size: 20px; font-weight: 800; color: #059669; text-align: right;">$${Number(totalRetail).toFixed(2)} USD</td>
                      </tr>
                    </tfoot>
                  </table>

                  <!-- Primary CTA Button -->
                  <div style="text-align: center; margin: 32px 0 20px 0;">
                    <a href="https://vastire.com/orders" style="display: inline-block; background-color: #059669; color: #ffffff; font-weight: 800; font-size: 15px; padding: 15px 36px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25);">
                      Track Order on Vastire &rarr;
                    </a>
                  </div>

                  <p style="margin: 20px 0 0 0; color: #64748b; font-size: 13px; text-align: center; line-height: 1.6;">
                    Have questions or need to modify your delivery? Reply directly to this email or visit our <a href="https://vastire.com/orders" style="color: #059669; font-weight: 600; text-decoration: underline;">Support &amp; Tracking Center</a>.
                  </p>
                </td>
              </tr>

              <!-- Footer with Clean Neutral Branding -->
              <tr>
                <td style="background-color: #f8fafc; padding: 20px 36px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                  Vastire &bull; Domestic US Fulfillment &bull; <a href="https://vastire.com" style="color: #64748b; text-decoration: none;">vastire.com</a>
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
      (it) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">
          ${escapeHtml(it.title)}
          ${it.color || it.size ? `<div style="font-size: 12px; color: #64748b; font-weight: normal;">${it.color ? `Color: ${escapeHtml(it.color)}` : ''} ${it.size ? `Size: ${escapeHtml(it.size)}` : ''}</div>` : ''}
        </td>
        <td style="padding: 10px 8px; text-align: center; color: #475569; font-weight: 700;">${it.quantity}</td>
        <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 700;">$${Number(it.price * it.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const adminHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Alert: ${orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; color: #0f172a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 20px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 680px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
              <!-- Admin Header with Instant Navigation Link -->
              <tr>
                <td style="background-color: #064e3b; padding: 22px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align: middle;">
                        <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; color: #a7f3d0; margin-bottom: 4px;">
                          &#128722; Instant Order Alert
                        </div>
                        <h2 style="margin: 0; font-size: 20px; color: #ffffff; font-weight: 800;">
                          New Paid Order #${orderNumber}
                        </h2>
                      </td>
                      <td style="vertical-align: middle; text-align: right;">
                        <!-- Instant Admin Action Link -->
                        <a href="https://vastire.com/admin/orders" style="display: inline-block; background-color: #ffffff; color: #064e3b; font-weight: 800; font-size: 13px; padding: 10px 18px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                          Open in Admin &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Profit & Financial Breakdown Banner -->
              <tr>
                <td style="padding: 24px 32px 12px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                    <tr>
                      <td style="width: 33%; text-align: left;">
                        <div style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: 700;">Customer Paid</div>
                        <div style="font-size: 20px; color: #065f46; font-weight: 800; margin-top: 2px;">$${totalRetail.toFixed(2)}</div>
                      </td>
                      <td style="width: 33%; text-align: center; border-left: 1px solid #a7f3d0; border-right: 1px solid #a7f3d0;">
                        <div style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: 700;">Supplier Cost</div>
                        <div style="font-size: 20px; color: #065f46; font-weight: 800; margin-top: 2px;">$${totalWholesale.toFixed(2)}</div>
                      </td>
                      <td style="width: 33%; text-align: right;">
                        <div style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: 700;">Net Profit</div>
                        <div style="font-size: 20px; color: #059669; font-weight: 800; margin-top: 2px;">+$${netProfit.toFixed(2)}</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Customer & Shipping Details (2-Column) -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 16px 20px; width: 50%; vertical-align: top; border-right: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Customer Details</div>
                        <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${escapeHtml(customerName)}</div>
                        <div style="font-size: 13px; color: #059669; margin-top: 2px;"><a href="mailto:${customerEmail}" style="color: #059669; text-decoration: none;">${customerEmail}</a></div>
                        ${customerPhone ? `<div style="font-size: 13px; color: #64748b; margin-top: 2px;">${escapeHtml(customerPhone)}</div>` : ''}
                      </td>
                      <td style="padding: 16px 20px; width: 50%; vertical-align: top;">
                        <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Shipping Destination</div>
                        <div style="font-size: 13px; color: #0f172a; line-height: 1.4; font-weight: 600;">
                          ${escapeHtml(shippingAddress)}<br />
                          ${escapeHtml(shippingCity)}, ${escapeHtml(shippingProvince)} ${escapeHtml(shippingZip)}
                        </div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 6px;">PayPal Ref: <code>${escapeHtml(paypalOrderId)}</code></div>
                      </td>
                    </tr>
                  </table>

                  <!-- Line Items -->
                  <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #0f172a; font-weight: 800;">
                    Ordered Items (${items.length})
                  </h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <thead>
                      <tr style="border-bottom: 2px solid #e2e8f0;">
                        <th align="left" style="padding: 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b;">Item Title</th>
                        <th align="center" style="padding: 6px 8px; font-size: 11px; text-transform: uppercase; color: #64748b; width: 50px;">Qty</th>
                        <th align="right" style="padding: 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; width: 90px;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsList}
                    </tbody>
                  </table>

                  <!-- Large Action Button -->
                  <div style="text-align: center; padding: 16px 0 8px 0; border-top: 1px solid #e2e8f0;">
                    <a href="https://vastire.com/admin/orders" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-weight: 800; font-size: 14px; padding: 14px 32px; text-decoration: none; border-radius: 8px;">
                      Open Vastire Admin Orders Dashboard &rarr;
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                  Automated Internal Notification &bull; Vastire Administration
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
