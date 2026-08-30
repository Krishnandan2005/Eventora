import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

// 1 mm = 2.83465 points
const MM = 2.83465;

// A5 LANDSCAPE
const PAGE_WIDTH = 210 * MM;
const PAGE_HEIGHT = 148 * MM;

// TICKET SIZE
const TICKET_WIDTH = 85.6 * MM;
const TICKET_HEIGHT = 140 * MM;

// GAP BETWEEN FRONT AND BACK
const GAP = 5 * MM;

// Center both tickets on A5
const TOTAL_WIDTH = TICKET_WIDTH * 2 + GAP;

const START_X = (PAGE_WIDTH - TOTAL_WIDTH) / 2;

const FRONT_X = START_X;
const BACK_X = START_X + TICKET_WIDTH + GAP;

const TICKET_Y = (PAGE_HEIGHT - TICKET_HEIGHT) / 2;

// ======================================================
// COLORS
// ======================================================

const COLORS = {
    white: rgb(1, 1, 1),
    black: rgb(0.04, 0.05, 0.12),
    dark: rgb(0.03, 0.02, 0.16),

    purple: rgb(0.31, 0.10, 0.85),
    purpleDark: rgb(0.12, 0.05, 0.35),
    purpleLight: rgb(0.45, 0.20, 1),

    pink: rgb(0.95, 0.05, 0.55),
    orange: rgb(1, 0.55, 0.05),

    green: rgb(0.02, 0.75, 0.35),
    blue: rgb(0.10, 0.35, 0.95),

    lightBg: rgb(0.98, 0.97, 1),
    lightPurple: rgb(0.94, 0.90, 1),

    gray: rgb(0.40, 0.40, 0.48),
    lightGray: rgb(0.86, 0.85, 0.92),

    cutLine: rgb(0.72, 0.72, 0.78),
};

// ======================================================
// SAFE TEXT
// ======================================================

const safeText = (value) => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/[^\x20-\x7E]/g, "")
        .trim();
};

// ======================================================
// FORMAT DATE
// ======================================================

const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return safeText(dateValue);
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).toUpperCase();
};

// ======================================================
// FORMAT PRICE
// ======================================================

const formatPrice = (price) => {
    if (price === undefined || price === null || price === "") {
        return "FREE";
    }

    const number = Number(price);

    if (Number.isNaN(number)) {
        return safeText(price);
    }

    return `INR ${number}`;
};

// ======================================================
// FETCH EVENT IMAGE
// ======================================================

const fetchImage = async (imageUrl) => {
    if (!imageUrl) {
        return null;
    }

    try {
        const response = await fetch(imageUrl);

        if (!response.ok) {
            console.error(
                "Unable to fetch event image:",
                response.status,
                response.statusText
            );

            return null;
        }

        const arrayBuffer = await response.arrayBuffer();

        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error("Event image fetch failed:", error.message);

        return null;
    }
};

// ======================================================
// DRAW GRADIENT-LIKE BACKGROUND
// ======================================================

const drawPurpleBackground = (page, x, y, width, height) => {
    page.drawRectangle({
        x,
        y,
        width,
        height,
        color: COLORS.purpleDark,
    });

    page.drawRectangle({
        x: x + width * 0.25,
        y,
        width: width * 0.75,
        height,
        color: COLORS.purple,
        opacity: 0.45,
    });

    page.drawRectangle({
        x: x + width * 0.60,
        y,
        width: width * 0.40,
        height,
        color: COLORS.purpleLight,
        opacity: 0.18,
    });
};

// ======================================================
// DRAW ROUNDED RECTANGLE
// ======================================================

const roundedRect = (
    page,
    x,
    y,
    width,
    height,
    color,
    radius = 4,
    borderColor = undefined,
    borderWidth = 0
) => {
    page.drawRectangle({
        x: x + radius,
        y,
        width: width - radius * 2,
        height,
        color,
        borderColor,
        borderWidth,
    });

    page.drawRectangle({
        x,
        y: y + radius,
        width,
        height: height - radius * 2,
        color,
        borderColor,
        borderWidth,
    });

    page.drawCircle({ x: x + radius, y: y + radius, size: radius, color });
    page.drawCircle({ x: x + width - radius, y: y + radius, size: radius, color });
    page.drawCircle({ x: x + radius, y: y + height - radius, size: radius, color });
    page.drawCircle({ x: x + width - radius, y: y + height - radius, size: radius, color });
};

// ======================================================
// TEXT HELPER
// ======================================================

const drawText = (
    page,
    text,
    x,
    y,
    size,
    font,
    color = COLORS.black,
    options = {}
) => {
    const value = safeText(text);

    if (!value) return;

    page.drawText(value, { x, y, size, font, color, ...options });
};

const drawCenteredText = (page, text, centerX, y, size, font, color) => {
    const value = safeText(text);
    if (!value) return;
    const width = font.widthOfTextAtSize(value, size);
    drawText(page, value, centerX - width / 2, y, size, font, color);
};

// ======================================================
// WRAP TEXT
// ======================================================

const wrapText = (text, font, size, maxWidth) => {
    const words = safeText(text).split(/\s+/);

    const lines = [];
    let currentLine = "";

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, size);

        if (width <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) lines.push(currentLine);

    return lines;
};

// ======================================================
// SMALL CHECKMARK ICON (used instead of plain "OK" text)
// ======================================================

const drawCheckmark = (page, centerX, centerY, size, color) => {
    // A simple two-stroke check, scaled to `size`
    page.drawLine({
        start: { x: centerX - size * 0.5, y: centerY },
        end: { x: centerX - size * 0.12, y: centerY - size * 0.4 },
        thickness: size * 0.22,
        color,
        lineCap: "Round",
    });

    page.drawLine({
        start: { x: centerX - size * 0.12, y: centerY - size * 0.4 },
        end: { x: centerX + size * 0.55, y: centerY + size * 0.45 },
        thickness: size * 0.22,
        color,
        lineCap: "Round",
    });
};

// ======================================================
// EVENT IMAGE
// ======================================================

const drawEventImage = async (page, imageBytes, x, y, width, height, pdfDoc) => {
    if (!imageBytes) {
        page.drawRectangle({ x, y, width, height, color: COLORS.purpleDark });
        return;
    }

    try {
        let image;

        if (imageBytes[0] === 0xff && imageBytes[1] === 0xd8) {
            image = await pdfDoc.embedJpg(imageBytes);
        } else {
            image = await pdfDoc.embedPng(imageBytes);
        }

        const imageRatio = image.width / image.height;
        const boxRatio = width / height;

        let drawWidth, drawHeight, drawX, drawY;

        if (imageRatio > boxRatio) {
            drawHeight = height;
            drawWidth = height * imageRatio;
            drawX = x - (drawWidth - width) / 2;
            drawY = y;
        } else {
            drawWidth = width;
            drawHeight = width / imageRatio;
            drawX = x;
            drawY = y - (drawHeight - height) / 2;
        }

        page.drawImage(image, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });

        // Darker overlay at the bottom for legible white title text,
        // lighter towards the top so the image itself still reads clearly.
        page.drawRectangle({
            x,
            y,
            width,
            height,
            color: COLORS.dark,
            opacity: 0.34,
        });

        page.drawRectangle({
            x,
            y,
            width,
            height: height * 0.55,
            color: COLORS.dark,
            opacity: 0.28,
        });
    } catch (error) {
        console.error("Could not embed event image:", error.message);
        page.drawRectangle({ x, y, width, height, color: COLORS.purpleDark });
    }
};

// ======================================================
// DECORATIVE WAVE / DIVIDER STRIP
// ======================================================

const drawWave = (page, x, y, width, height) => {
    const points = 32;

    for (let i = 0; i < points; i++) {
        const px = x + (width / points) * i;
        const wave = Math.sin(i * 0.55) * height * 0.35;

        page.drawRectangle({
            x: px,
            y: y + wave,
            width: width / points + 1,
            height: height * 0.45,
            color: i < points / 2 ? COLORS.pink : COLORS.orange,
            opacity: 0.9,
        });
    }
};

// ======================================================
// FRONT TICKET
// ======================================================

const drawFrontTicket = async (page, pdfDoc, fonts, booking, event, imageBytes) => {
    const { regular, bold } = fonts;

    const x = FRONT_X;
    const y = TICKET_Y;

    // ------------------------------------------
    // OUTER CARD
    // ------------------------------------------

    roundedRect(page, x, y, TICKET_WIDTH, TICKET_HEIGHT, COLORS.white, 5, COLORS.purpleDark, 1);

    // ------------------------------------------
    // TOP PURPLE SECTION
    // ------------------------------------------

    const topHeight = 83 * MM;

    drawPurpleBackground(page, x, y + TICKET_HEIGHT - topHeight, TICKET_WIDTH, topHeight);

    // ------------------------------------------
    // BRAND ROW (logo + name) — from top: 4mm–18mm
    // ------------------------------------------

    page.drawCircle({
        x: x + 12 * MM,
        y: y + TICKET_HEIGHT - 12 * MM,
        size: 6 * MM,
        color: COLORS.purpleLight,
    });

    drawText(page, "E", x + 10.1 * MM, y + TICKET_HEIGHT - 14 * MM, 6 * MM, bold, COLORS.white);

    drawText(page, "EVENTORA", x + 21 * MM, y + TICKET_HEIGHT - 11 * MM, 6.2 * MM, bold, COLORS.white);

    drawText(
        page,
        "Your Event, Your Experience",
        x + 21 * MM,
        y + TICKET_HEIGHT - 16 * MM,
        2.5 * MM,
        regular,
        rgb(0.78, 0.75, 1)
    );

    // ------------------------------------------
    // BADGE ROW — EVENT (left) + CONFIRMED (right)
    // Both share the same row so nothing overlaps
    // the brand row above them. From top: 22mm–29mm
    // ------------------------------------------

    const badgeY = y + TICKET_HEIGHT - 29 * MM;
    const badgeH = 7 * MM;

    roundedRect(page, x + 7 * MM, badgeY, 18 * MM, badgeH, COLORS.purpleLight, 2);
    drawText(page, "EVENT", x + 10 * MM, badgeY + 2.5 * MM, 2.8 * MM, bold, COLORS.white);

    roundedRect(page, x + TICKET_WIDTH - 39 * MM, badgeY, 32 * MM, badgeH, COLORS.green, 2);
    drawText(
        page,
        "CONFIRMED",
        x + TICKET_WIDTH - 34.5 * MM,
        badgeY + 2.5 * MM,
        2.8 * MM,
        bold,
        COLORS.white
    );

    // ------------------------------------------
    // EVENT IMAGE — sits behind the title, from
    // top: 20mm–55mm (35mm tall)
    // ------------------------------------------

    const imageX = x + 4 * MM;
    const imageY = y + TICKET_HEIGHT - 55 * MM;
    const imageWidth = TICKET_WIDTH - 8 * MM;
    const imageHeight = 35 * MM;

    await drawEventImage(page, imageBytes, imageX, imageY, imageWidth, imageHeight, pdfDoc);

    // ------------------------------------------
    // EVENT TITLE — overlaid on the image, from
    // top: 33mm, up to 3 lines
    // ------------------------------------------

    const title = safeText(event?.title);
    const titleSize = 5.4 * MM;
    const titleLines = wrapText(title, bold, titleSize, TICKET_WIDTH - 14 * MM);

    let titleY = y + TICKET_HEIGHT - 33 * MM;

    for (const line of titleLines.slice(0, 3)) {
        drawText(page, line, x + 7 * MM, titleY, titleSize, bold, COLORS.white);
        titleY -= 6.6 * MM;
    }

    // ------------------------------------------
    // DIVIDER STRIP — decorative, sits cleanly
    // below the image (from top: ~58mm–62mm)
    // ------------------------------------------

    drawWave(page, x, y + TICKET_HEIGHT - 60 * MM, TICKET_WIDTH, 5 * MM);

    // ------------------------------------------
    // DATE + LOCATION — from top: 65mm–74mm,
    // safely above the details card below it
    // ------------------------------------------

    const date = formatDate(event?.date);
    const location = safeText(event?.location);

    const dividerTopY = y + TICKET_HEIGHT - 63 * MM;
    const dividerBottomY = y + TICKET_HEIGHT - 74 * MM;

    page.drawLine({
        start: { x: x + TICKET_WIDTH / 2, y: dividerTopY },
        end: { x: x + TICKET_WIDTH / 2, y: dividerBottomY },
        thickness: 0.5,
        color: rgb(0.65, 0.5, 1),
    });

    drawText(page, "DATE", x + 7 * MM, y + TICKET_HEIGHT - 65 * MM, 2.5 * MM, bold, rgb(0.75, 0.6, 1));
    drawText(page, date, x + 7 * MM, y + TICKET_HEIGHT - 70 * MM, 3.4 * MM, bold, COLORS.white);

    drawText(
        page,
        "LOCATION",
        x + TICKET_WIDTH / 2 + 7 * MM,
        y + TICKET_HEIGHT - 65 * MM,
        2.5 * MM,
        bold,
        rgb(0.75, 0.6, 1)
    );

    const locationLines = wrapText(location, bold, 3 * MM, TICKET_WIDTH / 2 - 10 * MM);
    let locationY = y + TICKET_HEIGHT - 70 * MM;

    for (const line of locationLines.slice(0, 2)) {
        drawText(page, line, x + TICKET_WIDTH / 2 + 7 * MM, locationY, 3 * MM, bold, COLORS.white);
        locationY -= 4 * MM;
    }

    // ------------------------------------------
    // TICKET DETAILS CARD (floats slightly over
    // the purple header, from-bottom: 7mm–65mm)
    // ------------------------------------------

    const detailsY = y + 7 * MM;
    const detailsHeight = 58 * MM;

    roundedRect(page, x, detailsY, TICKET_WIDTH, detailsHeight, COLORS.lightBg, 5, COLORS.lightGray, 0.5);

    drawText(page, "TICKET DETAILS", x + 7 * MM, detailsY + detailsHeight - 9 * MM, 4 * MM, bold, COLORS.purple);

    page.drawLine({
        start: { x: x + 7 * MM, y: detailsY + detailsHeight - 12 * MM },
        end: { x: x + TICKET_WIDTH - 7 * MM, y: detailsY + detailsHeight - 12 * MM },
        thickness: 0.7,
        color: COLORS.lightGray,
    });

    const boxX = x + 5 * MM;
    const boxY = detailsY + 16 * MM;
    const boxW = TICKET_WIDTH - 10 * MM;
    const boxH = 33 * MM;

    roundedRect(page, boxX, boxY, boxW, boxH, COLORS.white, 4, COLORS.lightGray, 0.6);

    const attendeeName = safeText(booking?.userId?.name) || "Guest";
    const email = safeText(booking?.userId?.email);
    const category = safeText(event?.category) || "General";
    const price = formatPrice(event?.ticketPrice);

    const leftX = boxX + 7 * MM;
    const rightX = boxX + boxW / 2 + 3 * MM;

    drawText(page, "ATTENDEE", leftX, boxY + 26 * MM, 2.1 * MM, bold, COLORS.gray);
    drawText(page, attendeeName, leftX, boxY + 21.5 * MM, 3.1 * MM, bold, COLORS.black);

    drawText(page, "DATE", leftX, boxY + 14 * MM, 2.1 * MM, bold, COLORS.gray);
    drawText(page, date, leftX, boxY + 9.5 * MM, 3.1 * MM, bold, COLORS.black);

    drawText(page, "LOCATION", rightX, boxY + 26 * MM, 2.1 * MM, bold, COLORS.gray);

    const locLines = wrapText(location, bold, 2.8 * MM, boxW / 2 - 8 * MM);
    let locY = boxY + 21.5 * MM;

    for (const line of locLines.slice(0, 2)) {
        drawText(page, line, rightX, locY, 2.8 * MM, bold, COLORS.black);
        locY -= 3.7 * MM;
    }

    drawText(page, "CATEGORY", rightX, boxY + 10 * MM, 2.1 * MM, bold, COLORS.gray);
    drawText(page, category, rightX, boxY + 5.5 * MM, 2.8 * MM, bold, COLORS.black);

    drawText(page, "TICKET PRICE", leftX, detailsY + 11 * MM, 2.1 * MM, bold, COLORS.gray);
    drawText(page, price, leftX, detailsY + 6.5 * MM, 3.2 * MM, bold, COLORS.purple);

    drawText(page, "EMAIL", rightX, detailsY + 11 * MM, 2.1 * MM, bold, COLORS.gray);

    const emailLines = wrapText(email, regular, 2.3 * MM, boxW / 2 - 8 * MM);
    let emailY = detailsY + 6.5 * MM;

    for (const line of emailLines.slice(0, 2)) {
        drawText(page, line, rightX, emailY, 2.3 * MM, regular, COLORS.black);
        emailY -= 3.2 * MM;
    }
};

// ======================================================
// BACK TICKET
// ======================================================

const drawBackTicket = async (page, pdfDoc, fonts, booking, event) => {
    const { regular, bold } = fonts;

    const x = BACK_X;
    const y = TICKET_Y;

    roundedRect(page, x, y, TICKET_WIDTH, TICKET_HEIGHT, COLORS.white, 5, COLORS.purpleDark, 1);

    page.drawRectangle({
        x,
        y: y + TICKET_HEIGHT - 3 * MM,
        width: TICKET_WIDTH,
        height: 3 * MM,
        color: COLORS.lightPurple,
    });

    // ------------------------------------------
    // CHECK BADGE + HEADER
    // ------------------------------------------

    page.drawCircle({
        x: x + TICKET_WIDTH / 2,
        y: y + TICKET_HEIGHT - 21 * MM,
        size: 8 * MM,
        color: COLORS.lightPurple,
    });

    drawCheckmark(page, x + TICKET_WIDTH / 2, y + TICKET_HEIGHT - 21 * MM, 5 * MM, COLORS.purple);

    drawCenteredText(
        page,
        "SCAN TO VERIFY",
        x + TICKET_WIDTH / 2,
        y + TICKET_HEIGHT - 34 * MM,
        5 * MM,
        bold,
        COLORS.purple
    );

    drawCenteredText(
        page,
        "Present this QR code at",
        x + TICKET_WIDTH / 2,
        y + TICKET_HEIGHT - 41 * MM,
        3 * MM,
        regular,
        COLORS.black
    );

    drawCenteredText(
        page,
        "the event entrance.",
        x + TICKET_WIDTH / 2,
        y + TICKET_HEIGHT - 46 * MM,
        3 * MM,
        regular,
        COLORS.black
    );

    page.drawLine({
        start: { x: x + 10 * MM, y: y + TICKET_HEIGHT - 52 * MM },
        end: { x: x + TICKET_WIDTH - 10 * MM, y: y + TICKET_HEIGHT - 52 * MM },
        thickness: 0.8,
        color: COLORS.lightPurple,
    });

    // ------------------------------------------
    // QR CODE — sized and positioned so the
    // booking ID below it never collides with it
    // ------------------------------------------

    const bookingId = booking?._id?.toString() || booking?.id?.toString() || "";

    const qrData = JSON.stringify({
        bookingId,
        eventId: event?._id?.toString() || "",
        eventTitle: safeText(event?.title),
        status: "confirmed",
    });

    try {
        const qrDataUrl = await QRCode.toDataURL(qrData, {
            width: 800,
            margin: 2,
            errorCorrectionLevel: "H",
        });

        const qrBase64 = qrDataUrl.split(",")[1];
        const qrBytes = Buffer.from(qrBase64, "base64");
        const qrImage = await pdfDoc.embedPng(qrBytes);

        const qrSize = 35 * MM;
        const qrX = x + (TICKET_WIDTH - qrSize) / 2;
        const qrY = y + 46 * MM;

        roundedRect(
            page,
            qrX - 4 * MM,
            qrY - 4 * MM,
            qrSize + 8 * MM,
            qrSize + 8 * MM,
            COLORS.white,
            4,
            COLORS.lightPurple,
            0.8
        );

        page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    } catch (error) {
        console.error("QR generation failed:", error.message);
    }

    // ------------------------------------------
    // BOOKING ID — below the QR card, clear of it
    // ------------------------------------------

    drawCenteredText(
        page,
        "BOOKING ID",
        x + TICKET_WIDTH / 2,
        y + 39 * MM,
        2.4 * MM,
        bold,
        COLORS.gray
    );

    drawCenteredText(
        page,
        bookingId.toUpperCase(),
        x + TICKET_WIDTH / 2,
        y + 33 * MM,
        3.4 * MM,
        bold,
        COLORS.purple
    );

    // ------------------------------------------
    // DECORATIVE DIVIDER + BRAND FOOTER
    // ------------------------------------------

    page.drawRectangle({
        x: x + 12 * MM,
        y: y + 27 * MM,
        width: TICKET_WIDTH - 24 * MM,
        height: 0.6 * MM,
        color: COLORS.lightPurple,
    });

    drawCenteredText(page, "EVENTORA", x + TICKET_WIDTH / 2, y + 22 * MM, 4 * MM, bold, COLORS.purple);

    drawCenteredText(
        page,
        "Your Event, Your Experience",
        x + TICKET_WIDTH / 2,
        y + 17 * MM,
        2.3 * MM,
        regular,
        COLORS.gray
    );

    // ------------------------------------------
    // SECURITY MESSAGE
    // ------------------------------------------

    roundedRect(page, x + 8 * MM, y + 3 * MM, TICKET_WIDTH - 16 * MM, 7 * MM, COLORS.lightPurple, 2);

    drawCenteredText(
        page,
        "Keep this ticket safe and do not share it.",
        x + TICKET_WIDTH / 2,
        y + 5.5 * MM,
        2.1 * MM,
        bold,
        COLORS.purpleDark
    );
};

// ======================================================
// CUT LINE BETWEEN THE TWO TICKET HALVES
// ======================================================

const drawCutLine = (page) => {
    const centerX = FRONT_X + TICKET_WIDTH + GAP / 2;
    const top = TICKET_Y + TICKET_HEIGHT + 4 * MM;
    const bottom = TICKET_Y - 4 * MM;

    const dashLength = 2 * MM;
    const gapLength = 1.5 * MM;
    let cursor = top;

    while (cursor > bottom) {
        const segmentEnd = Math.max(cursor - dashLength, bottom);

        page.drawLine({
            start: { x: centerX, y: cursor },
            end: { x: centerX, y: segmentEnd },
            thickness: 0.75,
            color: COLORS.cutLine,
        });

        cursor = segmentEnd - gapLength;
    }
};

// ======================================================
// MAIN FUNCTION
// ======================================================

export const generateTicketPDF = async (booking) => {
    try {
        const pdfDoc = await PDFDocument.create();

        const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const fonts = { regular, bold };

        const event = booking?.eventId;

        if (!event) {
            throw new Error("Event information is missing from booking");
        }

        const imageUrl = event.imageUrl || event.image || event.imageURL || "";

        console.log("Event image URL:", imageUrl);

        const imageBytes = await fetchImage(imageUrl);

        await drawFrontTicket(page, pdfDoc, fonts, booking, event, imageBytes);
        await drawBackTicket(page, pdfDoc, fonts, booking, event);
        drawCutLine(page);

        const pdfBytes = await pdfDoc.save();

        console.log("Eventora ticket PDF generated successfully");

        return Buffer.from(pdfBytes);
    } catch (error) {
        console.error("Ticket PDF generation failed:", error);
        throw error;
    }
};

export const generateTicketPNG = generateTicketPDF;