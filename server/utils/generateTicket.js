import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

// 1 mm = 2.83465 points
const MM = 2.83465;

// A5 LANDSCAPE
const PAGE_WIDTH = 210 * MM;
const PAGE_HEIGHT = 148 * MM;

//TICKET SIZE
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
};

// ======================================================
// SAFE TEXT
// ======================================================

// This function removes unsupported characters.
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

    // Purple decorative blocks
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

    page.drawCircle({
        x: x + radius,
        y: y + radius,
        size: radius,
        color,
    });

    page.drawCircle({
        x: x + width - radius,
        y: y + radius,
        size: radius,
        color,
    });

    page.drawCircle({
        x: x + radius,
        y: y + height - radius,
        size: radius,
        color,
    });

    page.drawCircle({
        x: x + width - radius,
        y: y + height - radius,
        size: radius,
        color,
    });
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

    page.drawText(value, {
        x,
        y,
        size,
        font,
        color,
        ...options,
    });
};

// ======================================================
// WRAP TEXT
// ======================================================

const wrapText = (text, font, size, maxWidth) => {
    const words = safeText(text).split(/\s+/);

    const lines = [];
    let currentLine = "";

    for (const word of words) {
        const testLine = currentLine
            ? `${currentLine} ${word}`
            : word;

        const width = font.widthOfTextAtSize(
            testLine,
            size
        );

        if (width <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(currentLine);
            }

            currentLine = word;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
};

// ======================================================
// EVENT IMAGE
// ======================================================

const drawEventImage = async (
    page,
    imageBytes,
    x,
    y,
    width,
    height,
    pdfDoc
) => {
    if (!imageBytes) {
        // fallback
        page.drawRectangle({
            x,
            y,
            width,
            height,
            color: COLORS.purpleDark,
        });

        return;
    }

    try {
        let image;

        // JPEG
        if (
            imageBytes[0] === 0xff &&
            imageBytes[1] === 0xd8
        ) {
            image = await pdfDoc.embedJpg(imageBytes);
        } else {
            // PNG
            image = await pdfDoc.embedPng(imageBytes);
        }

        const imageWidth = image.width;
        const imageHeight = image.height;

        const imageRatio =
            imageWidth / imageHeight;

        const boxRatio =
            width / height;

        let drawWidth;
        let drawHeight;
        let drawX;
        let drawY;

        // COVER
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

        page.drawImage(image, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
        });

        // Dark overlay
        page.drawRectangle({
            x,
            y,
            width,
            height,
            color: COLORS.dark,
            opacity: 0.38,
        });
    } catch (error) {
        console.error(
            "Could not embed event image:",
            error.message
        );

        page.drawRectangle({
            x,
            y,
            width,
            height,
            color: COLORS.purpleDark,
        });
    }
};

// ======================================================
// COLORFUL WAVE
// ======================================================

const drawWave = (
    page,
    x,
    y,
    width,
    height
) => {
    const points = 32;

    for (let i = 0; i < points; i++) {
        const px =
            x + (width / points) * i;

        const wave =
            Math.sin(i * 0.55) * height * 0.35;

        page.drawRectangle({
            x: px,
            y: y + wave,
            width: width / points + 1,
            height: height * 0.45,
            color:
                i < points / 2
                    ? COLORS.pink
                    : COLORS.orange,
            opacity: 0.95,
        });
    }
};

// ======================================================
// FRONT TICKET
// ======================================================

const drawFrontTicket = async (
    page,
    pdfDoc,
    fonts,
    booking,
    event,
    imageBytes
) => {
    const { regular, bold } = fonts;

    const x = FRONT_X;
    const y = TICKET_Y;

    // ------------------------------------------
    // MAIN BACKGROUND
    // ------------------------------------------

    roundedRect(
        page,
        x,
        y,
        TICKET_WIDTH,
        TICKET_HEIGHT,
        COLORS.white,
        5,
        COLORS.purpleDark,
        1
    );

    // ------------------------------------------
    // TOP PURPLE SECTION
    // ------------------------------------------

    const topHeight = 83 * MM;

    drawPurpleBackground(
        page,
        x,
        y + TICKET_HEIGHT - topHeight,
        TICKET_WIDTH,
        topHeight
    );

    // ------------------------------------------
    // EVENT IMAGE
    // ------------------------------------------

    const imageX = x + 4 * MM;
    const imageY =
        y + TICKET_HEIGHT - 83 * MM;

    const imageWidth =
        TICKET_WIDTH - 8 * MM;

    const imageHeight = 47 * MM;

    await drawEventImage(
        page,
        imageBytes,
        imageX,
        imageY,
        imageWidth,
        imageHeight,
        pdfDoc
    );

    // ------------------------------------------
    // EVENTORA LOGO
    // ------------------------------------------

    page.drawCircle({
        x: x + 12 * MM,
        y: y + TICKET_HEIGHT - 12 * MM,
        size: 6 * MM,
        color: COLORS.purpleLight,
    });

    drawText(
        page,
        "E",
        x + 10.1 * MM,
        y + TICKET_HEIGHT - 14 * MM,
        6 * MM,
        bold,
        COLORS.white
    );

    drawText(
        page,
        "EVENTORA",
        x + 21 * MM,
        y + TICKET_HEIGHT - 11 * MM,
        6.2 * MM,
        bold,
        COLORS.white
    );

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
    // CONFIRMED BADGE
    // ------------------------------------------

    roundedRect(
        page,
        x + TICKET_WIDTH - 39 * MM,
        y + TICKET_HEIGHT - 17 * MM,
        32 * MM,
        8 * MM,
        COLORS.green,
        2
    );

    drawText(
        page,
        "CONFIRMED",
        x + TICKET_WIDTH - 34.5 * MM,
        y + TICKET_HEIGHT - 14.1 * MM,
        2.8 * MM,
        bold,
        COLORS.white
    );

    // ------------------------------------------
    // EVENT LABEL
    // ------------------------------------------

    roundedRect(
        page,
        x + 7 * MM,
        y + TICKET_HEIGHT - 29 * MM,
        18 * MM,
        7 * MM,
        COLORS.purpleLight,
        2
    );

    drawText(
        page,
        "EVENT",
        x + 10 * MM,
        y + TICKET_HEIGHT - 26.5 * MM,
        2.8 * MM,
        bold,
        COLORS.white
    );

    // ------------------------------------------
    // EVENT TITLE
    // ------------------------------------------

    const title = safeText(event?.title);

    const titleSize = 6 * MM;

    const titleLines = wrapText(
        title,
        bold,
        titleSize,
        TICKET_WIDTH - 14 * MM
    );

    let titleY =
        y + TICKET_HEIGHT - 40 * MM;

    for (const line of titleLines.slice(0, 3)) {
        drawText(
            page,
            line,
            x + 7 * MM,
            titleY,
            titleSize,
            bold,
            COLORS.white
        );

        titleY -= 7 * MM;
    }

    // ------------------------------------------
    // DATE + LOCATION
    // ------------------------------------------

    const date = formatDate(event?.date);
    const location = safeText(event?.location);

    const infoY = imageY + 5 * MM;

    // vertical divider
    page.drawLine({
        start: {
            x: x + TICKET_WIDTH / 2,
            y: infoY - 3 * MM,
        },
        end: {
            x: x + TICKET_WIDTH / 2,
            y: infoY + 13 * MM,
        },
        thickness: 0.5,
        color: rgb(0.65, 0.50, 1),
    });

    drawText(
        page,
        "DATE",
        x + 7 * MM,
        infoY + 7 * MM,
        2.5 * MM,
        bold,
        rgb(0.75, 0.60, 1)
    );

    drawText(
        page,
        date,
        x + 7 * MM,
        infoY + 2 * MM,
        3.5 * MM,
        bold,
        COLORS.white
    );

    drawText(
        page,
        "LOCATION",
        x + TICKET_WIDTH / 2 + 7 * MM,
        infoY + 7 * MM,
        2.5 * MM,
        bold,
        rgb(0.75, 0.60, 1)
    );

    const locationLines = wrapText(
        location,
        bold,
        3.1 * MM,
        TICKET_WIDTH / 2 - 10 * MM
    );

    let locationY = infoY + 2 * MM;

    for (const line of locationLines.slice(0, 2)) {
        drawText(
            page,
            line,
            x + TICKET_WIDTH / 2 + 7 * MM,
            locationY,
            3.1 * MM,
            bold,
            COLORS.white
        );

        locationY -= 4 * MM;
    }

    // ------------------------------------------
    // WAVE
    // ------------------------------------------

    drawWave(
        page,
        x,
        y + 68 * MM,
        TICKET_WIDTH,
        5 * MM
    );

    // ------------------------------------------
    // TICKET DETAILS SECTION
    // ------------------------------------------

    const detailsY = y + 7 * MM;
    const detailsHeight = 58 * MM;

    roundedRect(
        page,
        x,
        detailsY,
        TICKET_WIDTH,
        detailsHeight,
        COLORS.lightBg,
        5
    );

    drawText(
        page,
        "TICKET DETAILS",
        x + 7 * MM,
        detailsY + detailsHeight - 9 * MM,
        4 * MM,
        bold,
        COLORS.purple
    );

    page.drawLine({
        start: {
            x: x + 7 * MM,
            y: detailsY + detailsHeight - 12 * MM,
        },
        end: {
            x: x + TICKET_WIDTH - 7 * MM,
            y: detailsY + detailsHeight - 12 * MM,
        },
        thickness: 0.7,
        color: COLORS.lightGray,
    });

    // ------------------------------------------
    // DETAIL BOX
    // ------------------------------------------

    const boxX = x + 5 * MM;
    const boxY = detailsY + 16 * MM;
    const boxW = TICKET_WIDTH - 10 * MM;
    const boxH = 33 * MM;

    roundedRect(
        page,
        boxX,
        boxY,
        boxW,
        boxH,
        COLORS.white,
        4,
        COLORS.lightGray,
        0.6
    );

    const attendeeName =
        safeText(booking?.userId?.name) || "Guest";

    const email =
        safeText(booking?.userId?.email);

    const category =
        safeText(event?.category) || "General";

    const price =
        formatPrice(event?.ticketPrice);

    // LEFT COLUMN
    const leftX = boxX + 7 * MM;

    // RIGHT COLUMN
    const rightX =
        boxX + boxW / 2 + 3 * MM;

    // ATTENDEE
    drawText(
        page,
        "ATTENDEE",
        leftX,
        boxY + 26 * MM,
        2.1 * MM,
        bold,
        COLORS.gray
    );

    drawText(
        page,
        attendeeName,
        leftX,
        boxY + 21.5 * MM,
        3.1 * MM,
        bold,
        COLORS.black
    );

    // DATE
    drawText(
        page,
        "DATE",
        leftX,
        boxY + 14 * MM,
        2.1 * MM,
        bold,
        COLORS.gray
    );

    drawText(
        page,
        date,
        leftX,
        boxY + 9.5 * MM,
        3.1 * MM,
        bold,
        COLORS.black
    );

    // LOCATION
    drawText(
        page,
        "LOCATION",
        rightX,
        boxY + 26 * MM,
        2.1 * MM,
        bold,
        COLORS.gray
    );

    const locLines = wrapText(
        location,
        bold,
        2.8 * MM,
        boxW / 2 - 8 * MM
    );

    let locY = boxY + 21.5 * MM;

    for (const line of locLines.slice(0, 2)) {
        drawText(
            page,
            line,
            rightX,
            locY,
            2.8 * MM,
            bold,
            COLORS.black
        );

        locY -= 3.7 * MM;
    }

    // CATEGORY
    drawText(
        page,
        "CATEGORY",
        rightX,
        boxY + 10 * MM,
        2.1 * MM,
        bold,
        COLORS.gray
    );

    drawText(
        page,
        category,
        rightX,
        boxY + 5.5 * MM,
        2.8 * MM,
        bold,
        COLORS.black
    );

    // ------------------------------------------
    // PRICE + EMAIL
    // ------------------------------------------

    drawText(
        page,
        "TICKET PRICE",
        leftX,
        detailsY + 11 * MM,
        2.1 * MM,
        bold,
        COLORS.gray
    );

    drawText(
        page,
        price,
        leftX,
        detailsY + 6.5 * MM,
        3.2 * MM,
        bold,
        COLORS.black
    );

    drawText(
        page,
        "EMAIL",
        rightX,
        detailsY + 11 * MM,
        2.1 * MM,
        bold,
        COLORS.gray
    );

    const emailLines = wrapText(
        email,
        regular,
        2.3 * MM,
        boxW / 2 - 8 * MM
    );

    let emailY = detailsY + 6.5 * MM;

    for (const line of emailLines.slice(0, 2)) {
        drawText(
            page,
            line,
            rightX,
            emailY,
            2.3 * MM,
            regular,
            COLORS.black
        );

        emailY -= 3.2 * MM;
    }
};

// ======================================================
// BACK TICKET
// ======================================================

const drawBackTicket = async (
    page,
    pdfDoc,
    fonts,
    booking,
    event
) => {
    const { regular, bold } = fonts;

    const x = BACK_X;
    const y = TICKET_Y;

    // ------------------------------------------
    // WHITE BACKGROUND
    // ------------------------------------------

    roundedRect(
        page,
        x,
        y,
        TICKET_WIDTH,
        TICKET_HEIGHT,
        COLORS.white,
        5,
        COLORS.purpleDark,
        1
    );

    // ------------------------------------------
    // TOP DECORATION
    // ------------------------------------------

    page.drawRectangle({
        x,
        y: y + TICKET_HEIGHT - 3 * MM,
        width: TICKET_WIDTH,
        height: 3 * MM,
        color: COLORS.lightPurple,
    });

    // ------------------------------------------
    // SHIELD / CHECK DESIGN
    // ------------------------------------------

    page.drawCircle({
        x: x + TICKET_WIDTH / 2,
        y: y + TICKET_HEIGHT - 21 * MM,
        size: 8 * MM,
        color: COLORS.lightPurple,
    });

    drawText(
        page,
        "OK",
        x + TICKET_WIDTH / 2 - 4 * MM,
        y + TICKET_HEIGHT - 22.5 * MM,
        3 * MM,
        bold,
        COLORS.purple
    );

    // ------------------------------------------
    // SCAN TITLE
    // ------------------------------------------

    drawText(
        page,
        "SCAN TO VERIFY",
        x + TICKET_WIDTH / 2 - 25 * MM,
        y + TICKET_HEIGHT - 34 * MM,
        5 * MM,
        bold,
        COLORS.purple
    );

    drawText(
        page,
        "Present this QR code at",
        x + TICKET_WIDTH / 2 - 22 * MM,
        y + TICKET_HEIGHT - 41 * MM,
        3 * MM,
        regular,
        COLORS.black
    );

    drawText(
        page,
        "the event entrance.",
        x + TICKET_WIDTH / 2 - 19 * MM,
        y + TICKET_HEIGHT - 46 * MM,
        3 * MM,
        regular,
        COLORS.black
    );

    // ------------------------------------------
    // DIVIDER
    // ------------------------------------------

    page.drawLine({
        start: {
            x: x + 10 * MM,
            y: y + TICKET_HEIGHT - 52 * MM,
        },
        end: {
            x: x + TICKET_WIDTH - 10 * MM,
            y: y + TICKET_HEIGHT - 52 * MM,
        },
        thickness: 0.8,
        color: COLORS.lightPurple,
    });

    // ------------------------------------------
    // QR CODE
    // ------------------------------------------

    const bookingId =
        booking?._id?.toString() ||
        booking?.id?.toString() ||
        "";

    const qrData = JSON.stringify({
        bookingId,
        eventId: event?._id?.toString() || "",
        eventTitle: safeText(event?.title),
        status: "confirmed",
    });

    try {
        const qrDataUrl = await QRCode.toDataURL(
            qrData,
            {
                width: 800,
                margin: 2,
                errorCorrectionLevel: "H",
            }
        );

        const qrBase64 = qrDataUrl.split(",")[1];

        const qrBytes = Buffer.from(
            qrBase64,
            "base64"
        );

        const qrImage =
            await pdfDoc.embedPng(qrBytes);

        const qrSize = 52 * MM;

        const qrX =
            x + (TICKET_WIDTH - qrSize) / 2;

        const qrY =
            y + TICKET_HEIGHT - 110 * MM;

        // QR outer card
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

        page.drawImage(qrImage, {
            x: qrX,
            y: qrY,
            width: qrSize,
            height: qrSize,
        });
    } catch (error) {
        console.error(
            "QR generation failed:",
            error.message
        );
    }

    // ------------------------------------------
    // BOOKING ID
    // ------------------------------------------

    drawText(
        page,
        "BOOKING ID",
        x + TICKET_WIDTH / 2 - 13 * MM,
        y + 45 * MM,
        2.6 * MM,
        bold,
        COLORS.gray
    );

    const shortBookingId =
        bookingId.toUpperCase();

    drawText(
        page,
        shortBookingId,
        x + TICKET_WIDTH / 2 -
            (bold.widthOfTextAtSize(
                shortBookingId,
                3.8 * MM
            ) / 2),
        y + 39 * MM,
        3.8 * MM,
        bold,
        COLORS.purple
    );

    // ------------------------------------------
    // DECORATIVE CITY / EVENTORA AREA
    // ------------------------------------------

    page.drawRectangle({
        x: x + 12 * MM,
        y: y + 22 * MM,
        width: TICKET_WIDTH - 24 * MM,
        height: 0.6 * MM,
        color: COLORS.lightPurple,
    });

    drawText(
        page,
        "EVENTORA",
        x + TICKET_WIDTH / 2 - 12 * MM,
        y + 16 * MM,
        4 * MM,
        bold,
        COLORS.purple
    );

    drawText(
        page,
        "Your Event, Your Experience",
        x + TICKET_WIDTH / 2 - 19 * MM,
        y + 11 * MM,
        2.3 * MM,
        regular,
        COLORS.gray
    );

    // ------------------------------------------
    // SECURITY MESSAGE
    // ------------------------------------------

    roundedRect(
        page,
        x + 8 * MM,
        y + 3 * MM,
        TICKET_WIDTH - 16 * MM,
        7 * MM,
        COLORS.lightPurple,
        2
    );

    drawText(
        page,
        "Keep this ticket safe and do not share it.",
        x + 14 * MM,
        y + 5.5 * MM,
        2.1 * MM,
        bold,
        COLORS.purpleDark
    );
};

// ======================================================
// MAIN FUNCTION
// ======================================================

export const generateTicketPDF = async (booking) => {
    try {
        const pdfDoc =
            await PDFDocument.create();

        // ------------------------------------------
        // A5 LANDSCAPE PAGE
        // ------------------------------------------

        const page = pdfDoc.addPage([
            PAGE_WIDTH,
            PAGE_HEIGHT,
        ]);

        // ------------------------------------------
        // FONTS
        // ------------------------------------------

        const regular =
            await pdfDoc.embedFont(
                StandardFonts.Helvetica
            );

        const bold =
            await pdfDoc.embedFont(
                StandardFonts.HelveticaBold
            );

        const fonts = {
            regular,
            bold,
        };

        // ------------------------------------------
        // POPULATE DATA
        // ------------------------------------------

        const event = booking?.eventId;

        if (!event) {
            throw new Error(
                "Event information is missing from booking"
            );
        }

        // ------------------------------------------
        // EVENT IMAGE URL
        // ------------------------------------------

        const imageUrl =
            event.imageUrl ||
            event.image ||
            event.imageURL ||
            "";

        console.log(
            "Event image URL:",
            imageUrl
        );

        const imageBytes =
            await fetchImage(imageUrl);

        // ------------------------------------------
        // DRAW FRONT
        // ------------------------------------------

        await drawFrontTicket(
            page,
            pdfDoc,
            fonts,
            booking,
            event,
            imageBytes
        );

        // ------------------------------------------
        // DRAW BACK
        // ------------------------------------------

        await drawBackTicket(
            page,
            pdfDoc,
            fonts,
            booking,
            event
        );

        // ------------------------------------------
        // SAVE PDF
        // ------------------------------------------

        const pdfBytes =
            await pdfDoc.save();

        console.log(
            "Eventora ticket PDF generated successfully"
        );

        return Buffer.from(pdfBytes);

    } catch (error) {
        console.error(
            "Ticket PDF generation failed:",
            error
        );

        throw error;
    }
};

export const generateTicketPNG =
    generateTicketPDF;