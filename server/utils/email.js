import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ======================================================
// BOOKING CONFIRMATION EMAIL
// ======================================================

const sendBookingEmail = async (
  userEmail,
  userName,
  eventTitle,
  ticketBuffer
) => {
  try {
    const mailOptions = {
      from: `"Eventora" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Booking Confirmed: ${eventTitle}`,

      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background-color:#f4f2ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f2ff; padding: 40px 16px;">
            <tr>
              <td align="center">
                
                <!-- Main Card -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(50, 20, 168, 0.12);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #3214a8 0%, #6d28d9 100%); padding: 36px 32px; text-align: center;">
                      <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 2px; color: #ffffff;">
                        EVENTORA
                      </h1>
                      <p style="margin: 8px 0 0; font-size: 13px; color: rgba(255,255,255,0.85); letter-spacing: 0.5px;">
                        Your Event, Your Experience
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 32px 32px;">
                      
                      <!-- Success Badge -->
                      <div style="text-align: center; margin-bottom: 28px;">
                        <div style="display: inline-block; background: #f0ebff; color: #3214a8; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 50px; letter-spacing: 0.3px;">
                          ✓ Booking Confirmed
                        </div>
                      </div>

                      <h2 style="margin: 0 0 20px; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
                        You're all set!
                      </h2>

                      <p style="margin: 0 0 8px; font-size: 16px; color: #333; line-height: 1.5; text-align: center;">
                        Hi <strong style="color: #3214a8;">${userName}</strong>,
                      </p>

                      <p style="margin: 0 0 28px; font-size: 15px; color: #555; line-height: 1.65; text-align: center;">
                        Your booking for<br>
                        <strong style="color: #1a1a2e; font-size: 16px;">${eventTitle}</strong><br>
                        has been successfully confirmed.
                      </p>

                      <!-- Ticket Info Card -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8f6ff; border-radius: 12px; border: 1px solid #e9e4ff; margin-bottom: 28px;">
                        <tr>
                          <td style="padding: 22px 24px;">
                            <p style="margin: 0 0 10px; font-size: 14px; color: #444; line-height: 1.6;">
                              🎟️ Your <strong>Eventora ticket</strong> is attached to this email as a PDF.
                            </p>
                            <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.6;">
                              The PDF contains the <strong>front and back</strong> of your ticket on a single page. Please keep it safe and present the <strong>QR code</strong> at the entrance.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Format Badge -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
                        <tr>
                          <td align="center">
                            <div style="display: inline-block; background: #ffffff; border: 1.5px solid #d4c9ff; border-radius: 10px; padding: 14px 28px; text-align: center;">
                              <p style="margin: 0 0 4px; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                                Ticket Format
                              </p>
                              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #3214a8;">
                                A5 Landscape • Front + Back
                              </p>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 0; font-size: 14px; color: #777; line-height: 1.6; text-align: center;">
                        Thank you for choosing<br>
                        <strong style="color: #3214a8; font-size: 15px;">Eventora</strong>
                      </p>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background: #faf9ff; padding: 20px 32px; text-align: center; border-top: 1px solid #eeeaf8;">
                      <p style="margin: 0; font-size: 12px; color: #999; line-height: 1.5;">
                        This is an automated email. Please do not reply.
                      </p>
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>

        </body>
        </html>
      `,

      attachments: [
        {
          filename: "Eventora-Ticket.pdf",
          content: ticketBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log("Booking ticket email sent successfully to", userEmail);
  } catch (error) {
    console.error("Error sending booking ticket email:", error);
    throw error;
  }
};

// ======================================================
// OTP EMAIL
// ======================================================

const sendOTPEmail = async (userEmail, otp, type) => {
  try {
    const isAccountVerification = type === "account_verification";

    const title = isAccountVerification
      ? "Verify your Eventora Account"
      : "Eventora Booking Verification";

    const msg = isAccountVerification
      ? "Please use the following OTP to verify your new Eventora account."
      : "Please use the following OTP to verify and confirm your event booking.";

    const mailOptions = {
      from: `"Eventora" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: title,

      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background-color:#f4f2ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f2ff; padding: 40px 16px;">
            <tr>
              <td align="center">
                
                <!-- Main Card -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(50, 20, 168, 0.12);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #3214a8 0%, #6d28d9 100%); padding: 32px 28px; text-align: center;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px; color: #ffffff;">
                        EVENTORA
                      </h1>
                      <p style="margin: 6px 0 0; font-size: 12px; color: rgba(255,255,255,0.85); letter-spacing: 0.4px;">
                        Your Event, Your Experience
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 36px 28px 32px; text-align: center;">
                      
                      <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #1a1a2e;">
                        ${title}
                      </h2>

                      <p style="margin: 0 0 28px; font-size: 15px; color: #555; line-height: 1.6;">
                        ${msg}
                      </p>

                      <!-- OTP Box -->
                      <div style="display: inline-block; background: linear-gradient(135deg, #f3efff 0%, #ebe4ff 100%); border: 2px solid #6d28d9; border-radius: 14px; padding: 18px 32px; margin-bottom: 28px;">
                        <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 10px; color: #3214a8; font-family: 'Courier New', monospace;">
                          ${otp}
                        </p>
                      </div>

                      <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.6;">
                        This code expires in <strong style="color: #666;">5 minutes</strong>.<br>
                        If you didn’t request this, you can safely ignore this email.
                      </p>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background: #faf9ff; padding: 18px 28px; text-align: center; border-top: 1px solid #eeeaf8;">
                      <p style="margin: 0; font-size: 12px; color: #999;">
                        This is an automated email from Eventora.
                      </p>
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>

        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${userEmail} for ${type}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    // OTP behavior remains unchanged.
    // Email failure does not crash the request.
  }
};

// ======================================================
// EXPORTS
// ======================================================

export { sendBookingEmail, sendOTPEmail };