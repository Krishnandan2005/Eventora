import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export const generateTicketPDF = async (booking) => {
    // QR code data
    const qrData = JSON.stringify({
        bookingId: booking._id.toString(),
        eventId: booking.eventId._id.toString(),
    });

    // Generate QR code as base64 PNG
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);

    // Create PDF
    const pdfDoc = await PDFDocument.create();

    const page = pdfDoc.addPage([595, 842]);

    const { width, height } = page.getSize();

    // Fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Header
    page.drawText("EVENT HUB", {
        x: 0,
        y: height - 70,
        size: 28,
        font: boldFont,
        color: rgb(0.05, 0.15, 0.3),
    });

    page.drawText("EVENT TICKET", {
        x: 0,
        y: height - 100,
        size: 15,
        font: regularFont,
    });

    // Divider
    page.drawLine({
        start: { x: 50, y: height - 120 },
        end: { x: width - 50, y: height - 120 },
        thickness: 1,
    });

    // Event title
    page.drawText(booking.eventId.title, {
        x: 50,
        y: height - 165,
        size: 22,
        font: boldFont,
        maxWidth: width - 100,
    });

    // Details
    let y = height - 220;

    const details = [
        ["Attendee", booking.userId.name],
        ["Email", booking.userId.email],
        ["Date", booking.eventId.date],
        ["Location", booking.eventId.location],
        ["Category", booking.eventId.category],
        ["Ticket Price", `INR ${booking.amount}`],
        ["Booking ID", booking._id.toString()],
    ];

    for (const [label, value] of details) {
        page.drawText(`${label}:`, {
            x: 60,
            y,
            size: 12,
            font: boldFont,
        });

        page.drawText(String(value), {
            x: 170,
            y,
            size: 12,
            font: regularFont,
            maxWidth: width - 230,
        });

        y -= 32;
    }

    // QR code
    const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);

    page.drawText("Scan to verify ticket", {
        x: 195,
        y: 320,
        size: 14,
        font: boldFont,
    });

    page.drawImage(qrImage, {
        x: 190,
        y: 120,
        width: 210,
        height: 180,
    });

    // Confirmation
    page.drawText("BOOKING CONFIRMED", {
        x: 185,
        y: 90,
        size: 16,
        font: boldFont,
        color: rgb(0, 0.5, 0),
    });

    page.drawText(
        "Please present this QR code at the event entrance.",
        {
            x: 145,
            y: 60,
            size: 10,
            font: regularFont,
        }
    );

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    return Buffer.from(pdfBytes);
};