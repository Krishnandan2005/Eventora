import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    family: 4,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendBookingEmail = async (
    userEmail,
    userName,
    eventTitle,
    ticketBuffer
) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,

            subject: `Booking Confirmed: ${eventTitle}`,

            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Hi ${userName}!</h2>

                    <p>
                        Your booking for
                        <strong>${eventTitle}</strong>
                        has been successfully confirmed.
                    </p>

                    <p>
                        Your event ticket is attached to this email.
                    </p>

                    <p>
                        Please download the PDF ticket and present
                        the QR code at the event entrance.
                    </p>

                    <br>

                    <p>
                        Thank you for choosing <strong>Event Hub</strong>.
                    </p>
                </div>
            `,

            attachments: [
                {
                    filename: "EventHub-Ticket.pdf",
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
const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const title = type === 'account_verification' ? 'Verify your Eventora Account' : 'Eventora Booking Verification';
        const msg = type === 'account_verification'
            ? 'Please use the following OTP to verify your new Eventora account.'
            : 'Please use the following OTP to verify and confirm your event booking.';
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: title,
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2 style="color: #111;">${title}</h2>
                    <p style="color: #555; font-size: 16px;">${msg}</p>
                    <div style="margin: 20px auto; padding: 15px; font-size: 24px; font-weight: bold; background: #f4f4f4; width: max-content; letter-spacing: 5px;">
                        ${otp}
                    </div>
                    <p style="color: #999; font-size: 12px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${userEmail} for ${type}`);
    } catch (error) {
        console.error('Error sending OTP email:', error);
    }
};

export { sendBookingEmail, sendOTPEmail };