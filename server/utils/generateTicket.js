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

const TOTAL_WIDTH = TICKET_WIDTH * 2 + GAP;
const START_X = (PAGE_WIDTH - TOTAL_WIDTH) / 2;

const FRONT_X = START_X;
const BACK_X = START_X + TICKET_WIDTH + GAP;

const TICKET_Y = (PAGE_HEIGHT - TICKET_HEIGHT) / 2;

// ======================================================
// BRAND COLORS — matches the Eventora web app
// (near-black navbar, white content, indigo/green accents)
// ======================================================

const COLORS = {
    white: rgb(1, 1, 1),
    black: rgb(0.04, 0.05, 0.12),
    navy: rgb(0.05, 0.06, 0.14), // header/footer bar, same family as the web navbar

    accent: rgb(0.42, 0.36, 0.95), // indigo — ticket icon, links, dividers
    accentPink: rgb(0.93, 0.28, 0.55),
    accentAmber: rgb(1, 0.66, 0.15),

    green: rgb(0.09, 0.72, 0.4), // CONFIRMED pill, matches dashboard green
    gray: rgb(0.42, 0.42, 0.5),
    lightGray: rgb(0.87, 0.86, 0.93),
    lightBg: rgb(0.97, 0.97, 0.99),

    cutLine: rgb(0.72, 0.72, 0.78),
};

// ======================================================
// SAFE TEXT
// ======================================================

const safeText = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[^\x20-\x7E]/g, "").trim();
};

const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return safeText(dateValue);
    return date
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase();
};

const formatPrice = (price) => {
    if (price === undefined || price === null || price === "") return "FREE";
    const number = Number(price);
    if (Number.isNaN(number)) return safeText(price);
    return `INR ${number}`;
};

const fetchImage = async (imageUrl) => {
    if (!imageUrl) return null;
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            console.error("Unable to fetch event image:", response.status, response.statusText);
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
// SHAPE HELPERS
// ======================================================

const roundedRect = (page, x, y, width, height, color, radius = 4, borderColor = undefined, borderWidth = 0) => {
    page.drawRectangle({ x: x + radius, y, width: width - radius * 2, height, color, borderColor, borderWidth });
    page.drawRectangle({ x, y: y + radius, width, height: height - radius * 2, color, borderColor, borderWidth });
    page.drawCircle({ x: x + radius, y: y + radius, size: radius, color });
    page.drawCircle({ x: x + width - radius, y: y + radius, size: radius, color });
    page.drawCircle({ x: x + radius, y: y + height - radius, size: radius, color });
    page.drawCircle({ x: x + width - radius, y: y + height - radius, size: radius, color });
};

const drawText = (page, text, x, y, size, font, color = COLORS.black, options = {}) => {
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

const wrapText = (text, font, size, maxWidth) => {
    const words = safeText(text).split(/\s+/);
    const lines = [];
    let currentLine = "";
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
};

// Small filled dot used as a bullet in front of labels
const drawDot = (page, x, y, radius, color) => {
    page.drawCircle({ x, y, size: radius, color });
};

// A recognizable "ticket stub" glyph: rounded pill with two notches
// cut into the left/right edges and a perforation line — used as
// the Eventora logo mark instead of a plain letter badge.
const drawTicketIcon = (page, x, y, size, fillColor, cutColor) => {
    const w = size * 1.5;
    const h = size;

    roundedRect(page, x, y, w, h, fillColor, size * 0.28);

    drawDot(page, x, y + h / 2, size * 0.22, cutColor);
    drawDot(page, x + w, y + h / 2, size * 0.22, cutColor);

    const dashX = x + w * 0.6;
    for (let dy = h * 0.16; dy < h * 0.84; dy += h * 0.24) {
        page.drawRectangle({
            x: dashX - size * 0.035,
            y: y + dy,
            width: size * 0.07,
            height: size * 0.1,
            color: cutColor,
        });
    }
};

const drawCheckmark = (page, centerX, centerY, size, color) => {
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
// BRAND HEADER — reused on both the front and back so the
// two halves read as one consistent, professional design
// ======================================================

const drawBrandHeader = (page, fonts, x, y, rightLabel, rightLabelColor) => {
    const { bold } = fonts;
    const headerH = 12 * MM;
    const topY = y + TICKET_HEIGHT - headerH;

    page.drawRectangle({ x, y: topY, width: TICKET_WIDTH, height: headerH, color: COLORS.navy });

    drawTicketIcon(page, x + 6 * MM, topY + 3.7 * MM, 4.6 * MM, COLORS.accent, COLORS.navy);

    drawText(page, "EVENTORA", x + 17 * MM, topY + 4 * MM, 4.6 * MM, bold, COLORS.white);

    if (rightLabel) {
        const pillW = bold.widthOfTextAtSize(rightLabel, 2.7 * MM) + 8 * MM;
        const pillX = x + TICKET_WIDTH - pillW - 6 * MM;
        const pillY = topY + 3 * MM;

        roundedRect(page, pillX, pillY, pillW, 6 * MM, rightLabelColor, 3);
        drawCenteredText(page, rightLabel, pillX + pillW / 2, pillY + 2.1 * MM, 2.7 * MM, bold, COLORS.white);
    }

    return topY; // bottom edge of the header, in absolute PDF units
};

// ======================================================
// EVENT IMAGE
// ======================================================

const drawEventImage = async (page, imageBytes, x, y, width, height, pdfDoc) => {
    if (!imageBytes) {
        page.drawRectangle({ x, y, width, height, color: COLORS.navy });
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

        // Gentle full-image tint plus a stronger gradient-like darkening
        // toward the bottom, so the overlaid white title stays legible
        // without flattening the photo itself.
        page.drawRectangle({ x, y, width, height, color: COLORS.black, opacity: 0.12 });
        page.drawRectangle({ x, y, width, height: height * 0.5, color: COLORS.black, opacity: 0.45 });
    } catch (error) {
        console.error("Could not embed event image:", error.message);
        page.drawRectangle({ x, y, width, height, color: COLORS.navy });
    }
};

// ======================================================
// FRONT TICKET
// ======================================================

const drawFrontTicket = async (page, pdfDoc, fonts, booking, event, imageBytes) => {
    const { regular, bold } = fonts;
    const x = FRONT_X;
    const y = TICKET_Y;

    // Outer card — border matches the header color so the top corners
    // read as cleanly rounded rather than showing a seam.
    roundedRect(page, x, y, TICKET_WIDTH, TICKET_HEIGHT, COLORS.white, 5, COLORS.navy, 1);

    // ---- Header (0mm–12mm from top) ----
    drawBrandHeader(page, fonts, x, y, "CONFIRMED", COLORS.green);

    // ---- Event image (12mm–56mm from top) ----
    const imageX = x + 4 * MM;
    const imageY = y + TICKET_HEIGHT - 56 * MM;
    const imageWidth = TICKET_WIDTH - 8 * MM;
    const imageHeight = 44 * MM;

    await drawEventImage(page, imageBytes, imageX, imageY, imageWidth, imageHeight, pdfDoc);

    // EVENT category pill, overlaid top-left of the image
    const category = safeText(event?.category) || "General";
    const catPillW = bold.widthOfTextAtSize(category.toUpperCase(), 2.6 * MM) + 8 * MM;

    roundedRect(page, x + 7 * MM, y + TICKET_HEIGHT - 22 * MM, catPillW, 6.4 * MM, COLORS.accent, 3);
    drawText(
        page,
        category.toUpperCase(),
        x + 11 * MM,
        y + TICKET_HEIGHT - 19.8 * MM,
        2.6 * MM,
        bold,
        COLORS.white
    );

    // Event title, overlaid on the darkened lower portion of the image
    const title = safeText(event?.title);
    const titleSize = 5.2 * MM;
    const titleLines = wrapText(title, bold, titleSize, imageWidth - 4 * MM).slice(0, 2);

    let titleY =
        titleLines.length > 1 ? y + TICKET_HEIGHT - 45.5 * MM : y + TICKET_HEIGHT - 49 * MM;

    for (const line of titleLines) {
        drawText(page, line, x + 7 * MM, titleY, titleSize, bold, COLORS.white);
        titleY -= 6.5 * MM;
    }

    // ---- Two-tone accent strip (56mm–58mm from top) ----
    page.drawRectangle({
        x,
        y: y + TICKET_HEIGHT - 58 * MM,
        width: TICKET_WIDTH * 0.65,
        height: 2 * MM,
        color: COLORS.accent,
    });
    page.drawRectangle({
        x: x + TICKET_WIDTH * 0.65,
        y: y + TICKET_HEIGHT - 58 * MM,
        width: TICKET_WIDTH * 0.35,
        height: 2 * MM,
        color: COLORS.accentPink,
    });

    // ---- Date / Location row (62mm–71mm from top) ----
    const date = formatDate(event?.date);
    const location = safeText(event?.location);

    page.drawLine({
        start: { x: x + TICKET_WIDTH / 2, y: y + TICKET_HEIGHT - 60 * MM },
        end: { x: x + TICKET_WIDTH / 2, y: y + TICKET_HEIGHT - 72 * MM },
        thickness: 0.5,
        color: COLORS.lightGray,
    });

    drawDot(page, x + 8 * MM, y + TICKET_HEIGHT - 62.7 * MM, 0.7 * MM, COLORS.accent);
    drawText(page, "DATE", x + 10.5 * MM, y + TICKET_HEIGHT - 63.5 * MM, 2.4 * MM, bold, COLORS.gray);
    drawText(page, date, x + 7 * MM, y + TICKET_HEIGHT - 68.5 * MM, 3.4 * MM, bold, COLORS.black);

    drawDot(page, x + TICKET_WIDTH / 2 + 8 * MM, y + TICKET_HEIGHT - 62.7 * MM, 0.7 * MM, COLORS.accentPink);
    drawText(
        page,
        "LOCATION",
        x + TICKET_WIDTH / 2 + 10.5 * MM,
        y + TICKET_HEIGHT - 63.5 * MM,
        2.4 * MM,
        bold,
        COLORS.gray
    );

    const locationLines = wrapText(location, bold, 3 * MM, TICKET_WIDTH / 2 - 14 * MM).slice(0, 2);
    let locationY = y + TICKET_HEIGHT - 68.5 * MM;
    for (const line of locationLines) {
        drawText(page, line, x + TICKET_WIDTH / 2 + 7 * MM, locationY, 3 * MM, bold, COLORS.black);
        locationY -= 3.8 * MM;
    }

    // ---- "Ticket details" panel (78mm–134mm from top) ----
    const panelY = y + 6 * MM;
    const panelHeight = 56 * MM;

    roundedRect(page, x + 4 * MM, panelY, TICKET_WIDTH - 8 * MM, panelHeight, COLORS.lightBg, 5, COLORS.lightGray, 0.5);

    drawText(page, "TICKET DETAILS", x + 9 * MM, y + TICKET_HEIGHT - 84 * MM, 3.6 * MM, bold, COLORS.accent);

    page.drawLine({
        start: { x: x + 9 * MM, y: y + TICKET_HEIGHT - 87 * MM },
        end: { x: x + TICKET_WIDTH - 9 * MM, y: y + TICKET_HEIGHT - 87 * MM },
        thickness: 0.6,
        color: COLORS.lightGray,
    });

    const boxX = x + 7 * MM;
    const boxY = y + 17 * MM;
    const boxW = TICKET_WIDTH - 14 * MM;
    const boxH = 32 * MM;

    roundedRect(page, boxX, boxY, boxW, boxH, COLORS.white, 4, COLORS.lightGray, 0.6);

    const attendeeName = safeText(booking?.userId?.name) || "Guest";
    const email = safeText(booking?.userId?.email);
    const price = formatPrice(event?.ticketPrice);

    const leftX = boxX + 6 * MM;
    const rightX = boxX + boxW / 2 + 3 * MM;

    drawText(page, "ATTENDEE", leftX, boxY + boxH - 6 * MM, 2.1 * MM, bold, COLORS.gray);
    drawText(page, attendeeName, leftX, boxY + boxH - 10.5 * MM, 3.1 * MM, bold, COLORS.black);

    drawText(page, "DATE", leftX, boxY + boxH - 18 * MM, 2.1 * MM, bold, COLORS.gray);
    drawText(page, date, leftX, boxY + boxH - 22.5 * MM, 3.1 * MM, bold, COLORS.black);

    drawText(page, "LOCATION", rightX, boxY + boxH - 6 * MM, 2.1 * MM, bold, COLORS.gray);
    const locLines = wrapText(location, bold, 2.8 * MM, boxW / 2 - 8 * MM).slice(0, 2);
    let locY = boxY + boxH - 10.5 * MM;
    for (const line of locLines) {
        drawText(page, line, rightX, locY, 2.8 * MM, bold, COLORS.black);
        locY -= 3.6 * MM;
    }

    drawText(page, "CATEGORY", rightX, boxY + boxH - 22 * MM, 2.1 * MM, bold, COLORS.gray);
    drawText(page, category, rightX, boxY + boxH - 26.5 * MM, 2.8 * MM, bold, COLORS.black);

    // PRICE / EMAIL, below the box, still inside the panel
    drawDot(page, leftX, y + TICKET_HEIGHT - 128.5 * MM, 1 * MM, COLORS.green);
    drawText(page, "TICKET PRICE", leftX + 3 * MM, y + TICKET_HEIGHT - 127 * MM, 2.1 * MM, bold, COLORS.gray);
    drawText(page, price, leftX, y + TICKET_HEIGHT - 132 * MM, 3.4 * MM, bold, COLORS.accent);

    drawText(page, "EMAIL", rightX, y + TICKET_HEIGHT - 127 * MM, 2.1 * MM, bold, COLORS.gray);
    const emailLines = wrapText(email, regular, 2.3 * MM, boxW / 2 - 8 * MM).slice(0, 2);
    let emailY = y + TICKET_HEIGHT - 132 * MM;
    for (const line of emailLines) {
        drawText(page, line, rightX, emailY, 2.3 * MM, regular, COLORS.black);
        emailY -= 3.2 * MM;
    }

    // Footer micro-text
    drawCenteredText(page, "Please carry a valid photo ID to the venue", x + TICKET_WIDTH / 2, y + TICKET_HEIGHT - 137 * MM, 2 * MM, regular, COLORS.gray);
};

// ======================================================
// BACK TICKET
// ======================================================

const drawBackTicket = async (page, pdfDoc, fonts, booking, event) => {
    const { regular, bold } = fonts;
    const x = BACK_X;
    const y = TICKET_Y;

    roundedRect(page, x, y, TICKET_WIDTH, TICKET_HEIGHT, COLORS.white, 5, COLORS.navy, 1);

    // ---- Header, mirrors the front for a consistent bookend look ----
    drawBrandHeader(page, fonts, x, y, "E-TICKET", COLORS.accent);

    // ---- Verification badge + copy (16mm–52mm from top) ----
    page.drawCircle({
        x: x + TICKET_WIDTH / 2,
        y: y + TICKET_HEIGHT - 24 * MM,
        size: 8 * MM,
        color: COLORS.lightBg,
    });
    drawCheckmark(page, x + TICKET_WIDTH / 2, y + TICKET_HEIGHT - 24 * MM, 5 * MM, COLORS.green);

    drawCenteredText(page, "SCAN TO VERIFY", x + TICKET_WIDTH / 2, y + TICKET_HEIGHT - 38 * MM, 4.8 * MM, bold, COLORS.accent);
    drawCenteredText(page, "Present this QR code at", x + TICKET_WIDTH / 2, y + TICKET_HEIGHT - 44 * MM, 2.8 * MM, regular, COLORS.gray);
    drawCenteredText(page, "the event entrance.", x + TICKET_WIDTH / 2, y + TICKET_HEIGHT - 48.5 * MM, 2.8 * MM, regular, COLORS.gray);

    page.drawLine({
        start: { x: x + 10 * MM, y: y + TICKET_HEIGHT - 52 * MM },
        end: { x: x + TICKET_WIDTH - 10 * MM, y: y + TICKET_HEIGHT - 52 * MM },
        thickness: 0.8,
        color: COLORS.lightGray,
    });

    // ---- QR code (56mm–104mm from top) ----
    const bookingId = booking?._id?.toString() || booking?.id?.toString() || "";

    const qrData = JSON.stringify({
        bookingId,
        eventId: event?._id?.toString() || "",
        eventTitle: safeText(event?.title),
        status: "confirmed",
    });

    try {
        const qrDataUrl = await QRCode.toDataURL(qrData, { width: 800, margin: 1, errorCorrectionLevel: "H" });
        const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
        const qrImage = await pdfDoc.embedPng(qrBytes);

        const qrSize = 40 * MM;
        const qrX = x + (TICKET_WIDTH - qrSize) / 2;
        const qrY = y + TICKET_HEIGHT - 104 * MM;

        roundedRect(page, qrX - 4 * MM, qrY - 4 * MM, qrSize + 8 * MM, qrSize + 8 * MM, COLORS.white, 4, COLORS.lightGray, 0.8);
        page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    } catch (error) {
        console.error("QR generation failed:", error.message);
    }

    // ---- Booking ID, clear of the QR card below it ----
    drawCenteredText(page, "BOOKING ID", x + TICKET_WIDTH / 2, y + TICKET_HEIGHT - 109 * MM, 2.3 * MM, bold, COLORS.gray);
    drawCenteredText(page, bookingId.toUpperCase(), x + TICKET_WIDTH / 2, y + TICKET_HEIGHT - 114 * MM, 3.4 * MM, bold, COLORS.accent);

    page.drawLine({
        start: { x: x + 14 * MM, y: y + TICKET_HEIGHT - 120 * MM },
        end: { x: x + TICKET_WIDTH - 14 * MM, y: y + TICKET_HEIGHT - 120 * MM },
        thickness: 0.6,
        color: COLORS.lightGray,
    });

    // ---- Security note ----
    roundedRect(page, x + 8 * MM, y + TICKET_HEIGHT - 131 * MM, TICKET_WIDTH - 16 * MM, 7 * MM, COLORS.lightBg, 2, COLORS.lightGray, 0.5);
    drawCenteredText(
        page,
        "Keep this ticket safe and do not share it.",
        x + TICKET_WIDTH / 2,
        y + TICKET_HEIGHT - 127.5 * MM,
        2.1 * MM,
        bold,
        COLORS.gray
    );

    // ---- Footer micro-text ----
    drawCenteredText(page, "eventora.app", x + TICKET_WIDTH / 2, y + TICKET_HEIGHT - 137 * MM, 2 * MM, regular, COLORS.lightGray);
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