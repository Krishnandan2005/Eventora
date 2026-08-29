import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export const generateTicketPDF = async (booking) => {
    const pdfDoc = await PDFDocument.create();

    // Landscape ticket
    const page = pdfDoc.addPage([842, 595]);
    const { width, height } = page.getSize();

    // =========================================================
    // FONTS
    // =========================================================

    const regularFont = await pdfDoc.embedFont(
        StandardFonts.Helvetica
    );

    const boldFont = await pdfDoc.embedFont(
        StandardFonts.HelveticaBold
    );

    // =========================================================
    // COLORS
    // =========================================================

    const navy = rgb(0.025, 0.035, 0.13);
    const deepPurple = rgb(0.24, 0.08, 0.65);
    const purple = rgb(0.38, 0.18, 0.95);
    const lightPurple = rgb(0.95, 0.93, 1);
    const white = rgb(1, 1, 1);
    const black = rgb(0.04, 0.05, 0.10);
    const darkGray = rgb(0.25, 0.27, 0.34);
    const gray = rgb(0.50, 0.52, 0.58);
    const borderGray = rgb(0.86, 0.86, 0.90);
    const green = rgb(0.02, 0.62, 0.34);

    // =========================================================
    // OUTER BORDER
    // =========================================================

    page.drawRectangle({
        x: 15,
        y: 15,
        width: width - 30,
        height: height - 30,
        color: white,
        borderColor: navy,
        borderWidth: 2,
    });

    // =========================================================
    // LEFT CONTENT WIDTH
    // =========================================================

    const leftWidth = 555;

    // =========================================================
    // HEADER / EVENT IMAGE AREA
    // =========================================================

    page.drawRectangle({
        x: 17,
        y: height - 255,
        width: leftWidth,
        height: 238,
        color: navy,
    });

    // =========================================================
    // EVENT IMAGE
    // =========================================================

    try {
        const imageUrl = booking.eventId.imageUrl;

        if (imageUrl) {
            const response = await fetch(imageUrl);

            if (!response.ok) {
                throw new Error(
                    `Image request failed: ${response.status}`
                );
            }

            const imageBuffer = await response.arrayBuffer();

            const contentType =
                response.headers.get("content-type") || "";

            let eventImage;

            if (contentType.includes("png")) {
                eventImage = await pdfDoc.embedPng(imageBuffer);
            } else if (
                contentType.includes("jpeg") ||
                contentType.includes("jpg")
            ) {
                eventImage = await pdfDoc.embedJpg(imageBuffer);
            } else {
                throw new Error(
                    `Unsupported image type: ${contentType}`
                );
            }

            // Image area
            const imageX = 270;
            const imageY = height - 255;
            const imageWidth = 300;
            const imageHeight = 238;

            // Fit image while preserving aspect ratio
            const imageDims = eventImage.scale(1);

            const imageScale = Math.max(
                imageWidth / imageDims.width,
                imageHeight / imageDims.height
            );

            const scaledWidth =
                imageDims.width * imageScale;

            const scaledHeight =
                imageDims.height * imageScale;

            const imageDrawX =
                imageX +
                (imageWidth - scaledWidth) / 2;

            const imageDrawY =
                imageY +
                (imageHeight - scaledHeight) / 2;

            page.drawImage(eventImage, {
                x: imageDrawX,
                y: imageDrawY,
                width: scaledWidth,
                height: scaledHeight,
            });

            // Dark transparent overlay
            page.drawRectangle({
                x: imageX,
                y: imageY,
                width: imageWidth,
                height: imageHeight,
                color: navy,
                opacity: 0.40,
            });
        }
    } catch (error) {
        console.error(
            "Event image could not be loaded:",
            error.message
        );
    }

    // =========================================================
    // BRAND
    // =========================================================

    // Logo circle
    page.drawCircle({
        x: 52,
        y: height - 58,
        size: 21,
        color: deepPurple,
    });

    page.drawText("E", {
        x: 44,
        y: height - 66,
        size: 17,
        font: boldFont,
        color: white,
    });

    page.drawText("EVENTORA", {
        x: 82,
        y: height - 64,
        size: 25,
        font: boldFont,
        color: white,
    });

    page.drawText(
        "Your Event, Your Experience",
        {
            x: 83,
            y: height - 84,
            size: 9,
            font: regularFont,
            color: rgb(0.72, 0.74, 0.86),
        }
    );

    // =========================================================
    // CONFIRMED BADGE
    // =========================================================

    page.drawRectangle({
        x: 430,
        y: height - 88,
        width: 120,
        height: 32,
        color: green,
    });

    page.drawText("CONFIRMED", {
        x: 447,
        y: height - 77,
        size: 10,
        font: boldFont,
        color: white,
    });

    // =========================================================
    // EVENT LABEL
    // =========================================================

    page.drawText("EVENT", {
        x: 45,
        y: height - 125,
        size: 10,
        font: boldFont,
        color: rgb(0.55, 0.25, 1),
    });

    // =========================================================
    // EVENT TITLE
    // =========================================================

    const wrapText = (
        text,
        font,
        fontSize,
        maxWidth
    ) => {
        const words = String(text).split(" ");
        const lines = [];

        let current = "";

        for (const word of words) {
            const test = current
                ? `${current} ${word}`
                : word;

            const testWidth =
                font.widthOfTextAtSize(
                    test,
                    fontSize
                );

            if (testWidth <= maxWidth) {
                current = test;
            } else {
                if (current) {
                    lines.push(current);
                }

                current = word;
            }
        }

        if (current) {
            lines.push(current);
        }

        return lines;
    };

    const titleLines = wrapText(
        booking.eventId.title,
        boldFont,
        26,
        400
    );

    let titleY = height - 164;

    titleLines.slice(0, 2).forEach((line) => {
        page.drawText(line, {
            x: 45,
            y: titleY,
            size: 26,
            font: boldFont,
            color: white,
        });

        titleY -= 31;
    });

    // =========================================================
    // DATE
    // =========================================================

    page.drawText("DATE", {
        x: 45,
        y: height - 220,
        size: 8,
        font: boldFont,
        color: rgb(0.70, 0.72, 0.85),
    });

    page.drawText(
        formatDate(booking.eventId.date),
        {
            x: 45,
            y: height - 238,
            size: 12,
            font: boldFont,
            color: white,
        }
    );

    // =========================================================
    // LOCATION
    // =========================================================

    page.drawText("LOCATION", {
        x: 190,
        y: height - 220,
        size: 8,
        font: boldFont,
        color: rgb(0.70, 0.72, 0.85),
    });

    page.drawText(
        String(booking.eventId.location),
        {
            x: 190,
            y: height - 238,
            size: 11,
            font: boldFont,
            color: white,
            maxWidth: 330,
        }
    );

    // =========================================================
    // TICKET DETAILS TITLE
    // =========================================================

    page.drawText("TICKET DETAILS", {
        x: 45,
        y: 315,
        size: 11,
        font: boldFont,
        color: purple,
    });

    page.drawLine({
        start: {
            x: 45,
            y: 304,
        },
        end: {
            x: 540,
            y: 304,
        },
        thickness: 1,
        color: borderGray,
    });

    // =========================================================
    // DETAIL HELPER
    // =========================================================

    const drawDetail = (
        label,
        value,
        x,
        y,
        valueSize = 11
    ) => {
        page.drawText(
            String(label).toUpperCase(),
            {
                x,
                y,
                size: 7,
                font: boldFont,
                color: gray,
            }
        );

        page.drawText(
            String(value),
            {
                x,
                y: y - 18,
                size: valueSize,
                font: boldFont,
                color: black,
                maxWidth: 210,
            }
        );
    };

    // =========================================================
    // DETAILS
    // =========================================================

    drawDetail(
        "Attendee",
        booking.userId.name,
        45,
        280
    );

    drawDetail(
        "Date",
        formatDate(booking.eventId.date),
        300,
        280
    );

    page.drawLine({
        start: {
            x: 285,
            y: 255,
        },
        end: {
            x: 285,
            y: 295,
        },
        thickness: 1,
        color: borderGray,
    });

    drawDetail(
        "Location",
        booking.eventId.location,
        45,
        230
    );

    drawDetail(
        "Category",
        booking.eventId.category,
        300,
        230
    );

    page.drawLine({
        start: {
            x: 285,
            y: 205,
        },
        end: {
            x: 285,
            y: 245,
        },
        thickness: 1,
        color: borderGray,
    });

    drawDetail(
        "Ticket Price",
        `INR ${booking.amount}`,
        45,
        180,
        14
    );

    drawDetail(
        "Email",
        booking.userId.email,
        300,
        180,
        9
    );

    // =========================================================
    // FOOTER INFORMATION BOX
    // =========================================================

    page.drawRectangle({
        x: 45,
        y: 45,
        width: 495,
        height: 65,
        color: lightPurple,
        borderColor: rgb(0.82, 0.77, 0.98),
        borderWidth: 1,
    });

    page.drawText("i", {
        x: 62,
        y: 77,
        size: 17,
        font: boldFont,
        color: purple,
    });

    page.drawText(
        "This ticket is valid only for the event mentioned above.",
        {
            x: 82,
            y: 82,
            size: 8,
            font: regularFont,
            color: darkGray,
        }
    );

    page.drawText(
        "Thank you for choosing Eventora.",
        {
            x: 82,
            y: 62,
            size: 10,
            font: boldFont,
            color: purple,
        }
    );

    // =========================================================
    // QR SIDE
    // =========================================================

    // Vertical perforated divider
    page.drawLine({
        start: {
            x: 570,
            y: 45,
        },
        end: {
            x: 570,
            y: height - 45,
        },
        thickness: 1,
        color: rgb(0.72, 0.72, 0.78),
        dashArray: [6, 5],
    });

    // =========================================================
    // QR HEADING
    // =========================================================

    page.drawText("SCAN TO VERIFY", {
        x: 640,
        y: 485,
        size: 14,
        font: boldFont,
        color: purple,
    });

    page.drawText(
        "Present this QR code",
        {
            x: 652,
            y: 460,
            size: 9,
            font: regularFont,
            color: darkGray,
        }
    );

    page.drawText(
        "at the event entrance.",
        {
            x: 648,
            y: 445,
            size: 9,
            font: regularFont,
            color: darkGray,
        }
    );

    page.drawLine({
        start: {
            x: 620,
            y: 425,
        },
        end: {
            x: 790,
            y: 425,
        },
        thickness: 1,
        color: rgb(0.85, 0.82, 0.95),
    });

    // =========================================================
    // QR CODE
    // =========================================================

    const qrData = JSON.stringify({
        bookingId: booking._id.toString(),
        eventId: booking.eventId._id.toString(),
    });

    const qrDataUrl = await QRCode.toDataURL(
        qrData,
        {
            width: 600,
            margin: 1,
            errorCorrectionLevel: "H",
        }
    );

    const qrImage = await pdfDoc.embedPng(
        qrDataUrl
    );

    // White QR background
    page.drawRectangle({
        x: 615,
        y: 210,
        width: 185,
        height: 195,
        color: white,
        borderColor: rgb(0.92, 0.92, 0.95),
        borderWidth: 1,
    });

    page.drawImage(qrImage, {
        x: 625,
        y: 220,
        width: 165,
        height: 165,
    });

    // =========================================================
    // BOOKING ID
    // =========================================================

    page.drawText("BOOKING ID", {
        x: 660,
        y: 185,
        size: 8,
        font: boldFont,
        color: gray,
    });

    page.drawText(
        booking._id
            .toString()
            .slice(-16)
            .toUpperCase(),
        {
            x: 635,
            y: 165,
            size: 10,
            font: boldFont,
            color: purple,
        }
    );

    page.drawLine({
        start: {
            x: 620,
            y: 135,
        },
        end: {
            x: 790,
            y: 135,
        },
        thickness: 1,
        color: rgb(0.86, 0.83, 0.94),
        dashArray: [5, 4],
    });

    // =========================================================
    // SECURITY MESSAGE
    // =========================================================

    page.drawCircle({
        x: 645,
        y: 92,
        size: 17,
        color: lightPurple,
    });

    page.drawText("S", {
        x: 639,
        y: 86,
        size: 10,
        font: boldFont,
        color: purple,
    });

    page.drawText(
        "Keep this ticket safe",
        {
            x: 675,
            y: 97,
            size: 9,
            font: boldFont,
            color: darkGray,
        }
    );

    page.drawText(
        "and do not share it.",
        {
            x: 675,
            y: 81,
            size: 9,
            font: regularFont,
            color: gray,
        }
    );

    // =========================================================
    // SAVE
    // =========================================================

    const pdfBytes = await pdfDoc.save();

    return Buffer.from(pdfBytes);
};


// =============================================================
// DATE FORMATTER
// =============================================================

function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return String(dateString);
    }

    return date
        .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        .toUpperCase();
}