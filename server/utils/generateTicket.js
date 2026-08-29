import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import os from "os";

export const generateTicketPDF = async (booking) => {
    const fileName = `EventHub-Ticket-${booking._id}.pdf`;
    const filePath = path.join(os.tmpdir(), fileName);

    const doc = new PDFDocument({
        size: "A4",
        margin: 50,
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // QR Code
    const qrData = JSON.stringify({
        bookingId: booking._id.toString(),
        eventId: booking.eventId._id.toString(),
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData);

    // Header
    doc
        .fontSize(28)
        .font("Helvetica-Bold")
        .text("EVENT HUB", { align: "center" });

    doc
        .moveDown(0.5)
        .fontSize(16)
        .font("Helvetica")
        .text("EVENT TICKET", { align: "center" });

    doc.moveDown(1);

    // Divider
    doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

    doc.moveDown(1);

    // Event details
    doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(booking.eventId.title, { align: "center" });

    doc.moveDown(1);

    doc.fontSize(14).font("Helvetica");

    doc.text(`Attendee: ${booking.userId.name}`);
    doc.moveDown(0.5);

    doc.text(`Email: ${booking.userId.email}`);
    doc.moveDown(0.5);

    doc.text(`Date: ${booking.eventId.date}`);
    doc.moveDown(0.5);

    doc.text(`Location: ${booking.eventId.location}`);
    doc.moveDown(0.5);

    doc.text(`Category: ${booking.eventId.category}`);
    doc.moveDown(0.5);

    doc.text(`Ticket Price: ₹${booking.amount}`);
    doc.moveDown(0.5);

    doc.text(`Booking ID: ${booking._id}`);
    doc.moveDown(1.5);

    // QR Code
    doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Scan to verify ticket", { align: "center" });

    doc.moveDown(0.5);

    doc.image(qrCodeDataUrl, {
        fit: [180, 180],
        align: "center",
    });

    doc.moveDown(1);

    // Status
    doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("✓ BOOKING CONFIRMED", { align: "center" });

    doc.moveDown(1);

    doc
        .fontSize(11)
        .font("Helvetica")
        .text(
            "Please carry this ticket and present the QR code at the event entrance.",
            { align: "center" }
        );

    doc.moveDown(0.5);

    doc
        .fontSize(10)
        .text("Thank you for choosing Event Hub!", { align: "center" });

    doc.end();

    // Wait until PDF is completely written
    await new Promise((resolve, reject) => {
        stream.on("finish", resolve);
        stream.on("error", reject);
    });

    return filePath;
};