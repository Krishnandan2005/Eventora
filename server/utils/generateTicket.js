import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export const generateTicketPDF = async (booking) => {
    const pdfDoc = await PDFDocument.create();

    // Landscape ticket
    const page = pdfDoc.addPage([842, 595]);
    const { width, height } = page.getSize();

    // Fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Colors
    const navy = rgb(0.03, 0.05, 0.15);
    const blue = rgb(0.18, 0.30, 0.95);
    const green = rgb(0.05, 0.60, 0.30);
    const darkText = rgb(0.08, 0.10, 0.18);
    const grayText = rgb(0.40, 0.42, 0.48);
    const lightBg = rgb(0.95, 0.96, 1);
    const white = rgb(1, 1, 1);

    // =========================================================
    // OUTER TICKET
    // =========================================================

    page.drawRectangle({
        x: 20,
        y: 20,
        width: width - 40,
        height: height - 40,
        color: white,
        borderColor: navy,
        borderWidth: 2,
    });

    // =========================================================
    // LEFT SIDE HEADER
    // =========================================================

    page.drawRectangle({
        x: 22,
        y: height - 255,
        width: 550,
        height: 233,
        color: navy,
    });

    // =========================================================
    // EVENT IMAGE
    // =========================================================

    try {
        if (booking.eventId.imageUrl) {
            const response = await fetch(booking.eventId.imageUrl);

            if (response.ok) {
                const imageBytes = await response.arrayBuffer();
                const contentType =
                    response.headers.get("content-type") || "";

                let eventImage;

                if (contentType.includes("png")) {
                    eventImage = await pdfDoc.embedPng(imageBytes);
                } else {
                    eventImage = await pdfDoc.embedJpg(imageBytes);
                }

                page.drawImage(eventImage, {
                    x: 280,
                    y: height - 255,
                    width: 292,
                    height: 233,
                    opacity: 0.75,
                });
            }
        }
    } catch (error) {
        console.error("Event image error:", error.message);
    }

    // Dark overlay on image
    page.drawRectangle({
        x: 280,
        y: height - 255,
        width: 292,
        height: 233,
        color: navy,
        opacity: 0.35,
    });

    // =========================================================
    // BRAND
    // =========================================================

    page.drawText("EVENT HUB", {
        x: 48,
        y: height - 70,
        size: 25,
        font: boldFont,
        color: white,
    });

    page.drawText("Your Event, Your Experience", {
        x: 49,
        y: height - 91,
        size: 9,
        font: regularFont,
        color: rgb(0.75, 0.78, 0.90),
    });

    // =========================================================
    // CONFIRMED BADGE
    // =========================================================

    page.drawRectangle({
        x: 450,
        y: height - 85,
        width: 105,
        height: 30,
        color: green,
    });

    page.drawText(" CONFIRMED", {
        x: 464,
        y: height - 75,
        size: 10,
        font: boldFont,
        color: white,
    });

    // =========================================================
    // EVENT TITLE
    // =========================================================

    page.drawText("EVENT", {
        x: 48,
        y: height - 125,
        size: 9,
        font: boldFont,
        color: rgb(0.35, 0.45, 1),
    });

    const wrapText = (text, font, size, maxWidth) => {
        const words = String(text).split(" ");
        const lines = [];
        let line = "";

        for (const word of words) {
            const test = line
                ? `${line} ${word}`
                : word;

            if (font.widthOfTextAtSize(test, size) <= maxWidth) {
                line = test;
            } else {
                if (line) lines.push(line);
                line = word;
            }
        }

        if (line) lines.push(line);

        return lines;
    };

    const titleLines = wrapText(
        booking.eventId.title,
        boldFont,
        23,
        390
    );

    let titleY = height - 158;

    titleLines.slice(0, 2).forEach((line) => {
        page.drawText(line, {
            x: 48,
            y: titleY,
            size: 23,
            font: boldFont,
            color: white,
        });

        titleY -= 27;
    });

    // =========================================================
    // DATE + LOCATION ON HEADER
    // =========================================================

    page.drawText("DATE", {
        x: 48,
        y: height - 220,
        size: 7,
        font: boldFont,
        color: rgb(0.65, 0.70, 0.90),
    });

    page.drawText(String(booking.eventId.date), {
        x: 48,
        y: height - 238,
        size: 11,
        font: boldFont,
        color: white,
    });

    page.drawText("LOCATION", {
        x: 190,
        y: height - 220,
        size: 7,
        font: boldFont,
        color: rgb(0.65, 0.70, 0.90),
    });

    page.drawText(String(booking.eventId.location), {
        x: 190,
        y: height - 238,
        size: 11,
        font: boldFont,
        color: white,
        maxWidth: 300,
    });

    // =========================================================
    // TICKET DETAILS
    // =========================================================

    page.drawText("TICKET DETAILS", {
        x: 48,
        y: 315,
        size: 10,
        font: boldFont,
        color: blue,
    });

    page.drawLine({
        start: { x: 48, y: 304 },
        end: { x: 545, y: 304 },
        thickness: 1,
        color: rgb(0.85, 0.86, 0.90),
    });

    // Helper
    const detail = (label, value, x, y) => {
        page.drawText(label.toUpperCase(), {
            x,
            y,
            size: 7,
            font: boldFont,
            color: grayText,
        });

        page.drawText(String(value), {
            x,
            y: y - 18,
            size: 11,
            font: boldFont,
            color: darkText,
            maxWidth: 200,
        });
    };

    detail(
        "ATTENDEE",
        booking.userId.name,
        48,
        280
    );

    detail(
        "DATE",
        booking.eventId.date,
        300,
        280
    );

    detail(
        "LOCATION",
        booking.eventId.location,
        48,
        225
    );

    detail(
        "CATEGORY",
        booking.eventId.category,
        300,
        225
    );

    detail(
        "TICKET PRICE",
        `INR ${booking.amount}`,
        48,
        170
    );

    // Email
    page.drawText("EMAIL", {
        x: 300,
        y: 170,
        size: 7,
        font: boldFont,
        color: grayText,
    });

    page.drawText(String(booking.userId.email), {
        x: 300,
        y: 152,
        size: 10,
        font: regularFont,
        color: darkText,
        maxWidth: 220,
    });

    // =========================================================
    // DIVIDER
    // =========================================================

    page.drawLine({
        start: { x: 575, y: 45 },
        end: { x: 575, y: height - 45 },
        thickness: 1,
        color: rgb(0.75, 0.76, 0.80),
        dashArray: [6, 5],
    });

    // =========================================================
    // QR CODE
    // =========================================================

    const qrData = JSON.stringify({
        bookingId: booking._id.toString(),
        eventId: booking.eventId._id.toString(),
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 500,
        margin: 1,
        errorCorrectionLevel: "H",
    });

    const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);

    page.drawText("SCAN TO VERIFY", {
        x: 640,
        y: 505,
        size: 13,
        font: boldFont,
        color: blue,
    });

    page.drawText(
        "Present this QR code",
        {
            x: 647,
            y: 482,
            size: 9,
            font: regularFont,
            color: grayText,
        }
    );

    page.drawText(
        "at the event entrance.",
        {
            x: 647,
            y: 468,
            size: 9,
            font: regularFont,
            color: grayText,
        }
    );

    page.drawImage(qrImage, {
        x: 620,
        y: 250,
        width: 185,
        height: 185,
    });

    // =========================================================
    // BOOKING ID
    // =========================================================

    page.drawText("BOOKING ID", {
        x: 650,
        y: 215,
        size: 8,
        font: boldFont,
        color: grayText,
    });

    page.drawText(
        booking._id.toString().slice(-16).toUpperCase(),
        {
            x: 625,
            y: 195,
            size: 10,
            font: boldFont,
            color: darkText,
        }
    );

    // =========================================================
    // FOOTER
    // =========================================================

    page.drawLine({
        start: { x: 48, y: 105 },
        end: { x: 545, y: 105 },
        thickness: 1,
        color: rgb(0.88, 0.89, 0.92),
    });

    page.drawText(
        "This ticket is valid only for the event mentioned above.",
        {
            x: 48,
            y: 82,
            size: 8,
            font: regularFont,
            color: grayText,
        }
    );

    page.drawText(
        "Thank you for choosing Event Hub.",
        {
            x: 48,
            y: 62,
            size: 9,
            font: boldFont,
            color: darkText,
        }
    );

    // Right footer
    page.drawText(
        "Keep this ticket safe and do not share it.",
        {
            x: 620,
            y: 75,
            size: 8,
            font: regularFont,
            color: grayText,
        }
    );

    // =========================================================
    // RETURN BUFFER
    // =========================================================

    const pdfBytes = await pdfDoc.save();

    return Buffer.from(pdfBytes);
};