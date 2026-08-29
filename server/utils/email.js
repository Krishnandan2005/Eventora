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
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 30px 20px;
          background-color: #f8f7ff;
          color: #222;
        ">

          <!-- HEADER -->
          <div style="
            background: linear-gradient(135deg, #3214a8, #6d28d9);
            padding: 25px;
            border-radius: 12px 12px 0 0;
            text-align: center;
            color: white;
          ">

            <h1 style="
              margin: 0;
              font-size: 28px;
              letter-spacing: 1px;
            ">
              EVENTORA
            </h1>

            <p style="
              margin: 8px 0 0;
              font-size: 14px;
              opacity: 0.9;
            ">
              Your Event, Your Experience
            </p>

          </div>


          <!-- CONTENT -->
          <div style="
            background: white;
            padding: 30px;
            border-radius: 0 0 12px 12px;
          ">

            <h2 style="
              margin-top: 0;
              color: #3214a8;
            ">
              Booking Confirmed!
            </h2>


            <p style="
              font-size: 16px;
              margin-bottom: 10px;
            ">
              Hi <strong>${userName}</strong>,
            </p>


            <p style="
              font-size: 15px;
              line-height: 1.6;
              color: #555;
            ">
              Your booking for
              <strong>${eventTitle}</strong>
              has been successfully confirmed.
            </p>


            <!-- TICKET MESSAGE -->
            <div style="
              margin: 25px 0;
              padding: 18px;
              background: #f3efff;
              border-left: 4px solid #6d28d9;
              border-radius: 6px;
            ">

              <p style="
                margin: 0;
                color: #444;
                font-size: 14px;
                line-height: 1.6;
              ">
                Your <strong>Eventora ticket</strong> is attached
                to this email as a PDF.
              </p>

            </div>


            <p style="
              font-size: 14px;
              line-height: 1.6;
              color: #666;
            ">
              Your PDF contains the
              <strong>front and back of your ticket</strong>
              on a single page.
            </p>


            <p style="
              font-size: 14px;
              line-height: 1.6;
              color: #666;
            ">
              Please keep your ticket safe and present the
              <strong>QR code</strong> at the event entrance.
            </p>


            <!-- IMPORTANT -->
            <div style="
              margin-top: 25px;
              padding: 15px;
              background: #f8f7ff;
              border-radius: 8px;
              text-align: center;
            ">

              <p style="
                margin: 0;
                font-size: 13px;
                color: #666;
              ">
                Ticket format
              </p>

              <p style="
                margin: 5px 0 0;
                font-size: 14px;
                font-weight: bold;
                color: #3214a8;
              ">
                A5 Landscape • Front + Back
              </p>

            </div>


            <p style="
              margin-top: 30px;
              font-size: 14px;
              color: #777;
            ">
              Thank you for choosing
              <strong style="color: #3214a8;">
                Eventora
              </strong>.
            </p>

          </div>


          <!-- FOOTER -->
          <p style="
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #999;
          ">
            This is an automated email. Please do not reply.
          </p>

        </div>
      `,

      // ==================================================
      // PDF ATTACHMENT
      // ==================================================

      attachments: [
        {
          filename: "Eventora-Ticket.pdf",
          content: ticketBuffer,
          contentType: "application/pdf",
        },
      ],
    };


    await transporter.sendMail(mailOptions);

    console.log(
      "Booking ticket email sent successfully to",
      userEmail
    );

  } catch (error) {

    console.error(
      "Error sending booking ticket email:",
      error
    );

    throw error;
  }
};


// ======================================================
// OTP EMAIL
// ======================================================

const sendOTPEmail = async (
  userEmail,
  otp,
  type
) => {

  try {

    const isAccountVerification =
      type === "account_verification";


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
        <div style="
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: 0 auto;
          padding: 30px 20px;
          text-align: center;
          background-color: #f8f7ff;
        ">


          <!-- HEADER -->

          <div style="
            background: linear-gradient(135deg, #3214a8, #6d28d9);
            padding: 20px;
            border-radius: 12px 12px 0 0;
            color: white;
          ">

            <h1 style="
              margin: 0;
              font-size: 26px;
            ">
              EVENTORA
            </h1>

            <p style="
              margin: 5px 0 0;
              font-size: 13px;
            ">
              Your Event, Your Experience
            </p>

          </div>


          <!-- OTP CONTENT -->

          <div style="
            background: white;
            padding: 30px 20px;
            border-radius: 0 0 12px 12px;
          ">

            <h2 style="
              color: #3214a8;
              margin-top: 0;
            ">
              ${title}
            </h2>


            <p style="
              color: #555;
              font-size: 15px;
              line-height: 1.6;
            ">
              ${msg}
            </p>


            <!-- OTP -->

            <div style="
              display: inline-block;
              margin: 25px auto;
              padding: 15px 25px;
              background: #f3efff;
              border: 2px solid #6d28d9;
              border-radius: 10px;
              font-size: 28px;
              font-weight: bold;
              letter-spacing: 7px;
              color: #3214a8;
            ">
              ${otp}
            </div>


            <p style="
              color: #999;
              font-size: 12px;
              line-height: 1.5;
            ">
              This code expires in 5 minutes.
              If you didn't request this, please ignore this email.
            </p>

          </div>

        </div>
      `,
    };


    await transporter.sendMail(mailOptions);


    console.log(
      `OTP sent to ${userEmail} for ${type}`
    );

  } catch (error) {

    console.error(
      "Error sending OTP email:",
      error
    );

    // OTP behavior remains unchanged.
    // Email failure does not crash the request.
  }
};


// ======================================================
// EXPORTS
// ======================================================

export {
  sendBookingEmail,
  sendOTPEmail,
};