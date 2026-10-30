import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

// ======================================================
// CONSTANTS & DIMENSIONS
// ======================================================
const MM = 2.83465; // 1 mm in PDF points

// Page & Layout Setup (A5 Landscape)
const PAGE_WIDTH = 210 * MM;
const PAGE_HEIGHT = 148 * MM;

const TICKET_WIDTH = 85.6 * MM;
const TICKET_HEIGHT = 140 * MM;
const GAP = 5 * MM;

const TOTAL_WIDTH = TICKET_WIDTH * 2 + GAP;
const START_X = (PAGE_WIDTH - TOTAL_WIDTH) / 2;
const FRONT_X = START_X;
const BACK_X = START_X + TICKET_WIDTH + GAP;
const TICKET_Y = (PAGE_HEIGHT - TICKET_HEIGHT) / 2;

// Brand Palette
const COLORS = {
  white: rgb(1, 1, 1),
  black: rgb(0.04, 0.05, 0.12),
  navy: rgb(0.05, 0.06, 0.14),
  accent: rgb(0.42, 0.36, 0.95),
  accentPink: rgb(0.93, 0.28, 0.55),
  green: rgb(0.09, 0.72, 0.4),
  gray: rgb(0.42, 0.42, 0.5),
  lightGray: rgb(0.87, 0.86, 0.93),
  lightBg: rgb(0.97, 0.97, 0.99),
  softBg: rgb(0.95, 0.94, 0.98),
  cutLine: rgb(0.72, 0.72, 0.78),
};

// ======================================================
// HELPERS
// ======================================================
const safeText = (val) => (!val ? "" : String(val).replace(/[^\x20-\x7E]/g, "").trim());

const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime())
    ? safeText(dateValue)
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
};

const formatPrice = (price) => {
  if (price === undefined || price === null || price === "") return "FREE";
  const num = Number(price);
  return Number.isNaN(num) ? safeText(price) : `INR ${num}`;
};

const fetchImage = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch (err) {
    console.error("Image fetch failed:", err.message);
    return null;
  }
};

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
  if (value) page.drawText(value, { x, y, size, font, color, ...options });
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
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
      line = testLine;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const drawTicketIcon = (page, x, y, size, fillColor, cutColor) => {
  const w = size * 1.5;
  const h = size;
  roundedRect(page, x, y, w, h, fillColor, size * 0.28);
  page.drawCircle({ x, y: y + h / 2, size: size * 0.22, color: cutColor });
  page.drawCircle({ x: x + w, y: y + h / 2, size: size * 0.22, color: cutColor });

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

const drawCheckmark = (page, cx, cy, size, color) => {
  page.drawLine({
    start: { x: cx - size * 0.5, y: cy },
    end: { x: cx - size * 0.12, y: cy - size * 0.4 },
    thickness: size * 0.22,
    color,
    lineCap: "Round",
  });
  page.drawLine({
    start: { x: cx - size * 0.12, y: cy - size * 0.4 },
    end: { x: cx + size * 0.55, y: cy + size * 0.45 },
    thickness: size * 0.22,
    color,
    lineCap: "Round",
  });
};

// ======================================================
// HEADER & ASSETS
// ======================================================
const drawBrandHeader = (page, fonts, x, y, rightLabel, rightLabelColor) => {
  const headerH = 11 * MM;
  const topY = y + TICKET_HEIGHT - headerH;

  page.drawRectangle({ x, y: topY, width: TICKET_WIDTH, height: headerH, color: COLORS.navy });
  page.drawRectangle({ x, y: topY - 1.2 * MM, width: TICKET_WIDTH, height: 1.2 * MM, color: COLORS.accent });

  drawTicketIcon(page, x + 5.5 * MM, topY + 3.2 * MM, 4.4 * MM, COLORS.accent, COLORS.navy);
  drawText(page, "EVENTORA", x + 16 * MM, topY + 3.6 * MM, 4.4 * MM, fonts.bold, COLORS.white);

  if (rightLabel) {
    const pillW = fonts.bold.widthOfTextAtSize(rightLabel, 2.5 * MM) + 7 * MM;
    const pillX = x + TICKET_WIDTH - pillW - 5 * MM;
    const pillY = topY + 2.6 * MM;
    roundedRect(page, pillX, pillY, pillW, 5.6 * MM, rightLabelColor, 2.8);
    drawCenteredText(page, rightLabel, pillX + pillW / 2, pillY + 1.85 * MM, 2.5 * MM, fonts.bold, COLORS.white);
  }
};

const drawEventImage = async (page, imageBytes, x, y, width, height, pdfDoc) => {
  if (!imageBytes) {
    page.drawRectangle({ x, y, width, height, color: COLORS.navy });
    return;
  }

  try {
    const isJpg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8;
    const image = isJpg ? await pdfDoc.embedJpg(imageBytes) : await pdfDoc.embedPng(imageBytes);

    const imageRatio = image.width / image.height;
    const boxRatio = width / height;
    let drawW, drawH, drawX, drawY;

    if (imageRatio > boxRatio) {
      drawH = height;
      drawW = height * imageRatio;
      drawX = x - (drawW - width) / 2;
      drawY = y;
    } else {
      drawW = width;
      drawH = width / imageRatio;
      drawX = x;
      drawY = y - (drawH - height) / 2;
    }

    page.drawImage(image, { x: drawX, y: drawY, width: drawW, height: drawH });
    page.drawRectangle({ x, y, width, height, color: COLORS.black, opacity: 0.1 });
    page.drawRectangle({ x, y, width, height: height * 0.48, color: COLORS.black, opacity: 0.5 });
  } catch (error) {
    console.error("Embedding image failed:", error.message);
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

  roundedRect(page, x, y, TICKET_WIDTH, TICKET_HEIGHT, COLORS.white, 4.5, COLORS.navy, 1);
  drawBrandHeader(page, fonts, x, y, "CONFIRMED", COLORS.green);

  // Image & Category
  const imgX = x + 3.5 * MM;
  const imgY = y + TICKET_HEIGHT - 54 * MM;
  const imgW = TICKET_WIDTH - 7 * MM;
  const imgH = 40 * MM;

  await drawEventImage(page, imageBytes, imgX, imgY, imgW, imgH, pdfDoc);

  const category = (safeText(event?.category) || "General").toUpperCase();
  const catPillW = bold.widthOfTextAtSize(category, 2.4 * MM) + 7 * MM;
  roundedRect(page, x + 6 * MM, y + TICKET_HEIGHT - 20 * MM, catPillW, 5.8 * MM, COLORS.accent, 2.8);
  drawText(page, category, x + 9.5 * MM, y + TICKET_HEIGHT - 17.9 * MM, 2.4 * MM, bold, COLORS.white);

  // Event Title
  const titleSize = 4.8 * MM;
  const titleLines = wrapText(event?.title, bold, titleSize, imgW - 6 * MM).slice(0, 2);
  let titleY = y + TICKET_HEIGHT - (titleLines.length > 1 ? 43 * MM : 46.5 * MM);
  for (const line of titleLines) {
    drawText(page, line, x + 6.5 * MM, titleY, titleSize, bold, COLORS.white);
    titleY -= 5.8 * MM;
  }

  // Under-image Divider Strip
  page.drawRectangle({ x: imgX, y: y + TICKET_HEIGHT - 56 * MM, width: imgW * 0.62, height: 1.6 * MM, color: COLORS.accent });
  page.drawRectangle({ x: imgX + imgW * 0.62, y: y + TICKET_HEIGHT - 56 * MM, width: imgW * 0.38, height: 1.6 * MM, color: COLORS.accentPink });

  // Date & Location Info Row
  const date = formatDate(event?.date);
  const location = safeText(event?.location);

  page.drawLine({
    start: { x: x + TICKET_WIDTH / 2, y: y + TICKET_HEIGHT - 59 * MM },
    end: { x: x + TICKET_WIDTH / 2, y: y + TICKET_HEIGHT - 71 * MM },
    thickness: 0.5,
    color: COLORS.lightGray,
  });

  page.drawCircle({ x: x + 7 * MM, y: y + TICKET_HEIGHT - 61.2 * MM, size: 0.65 * MM, color: COLORS.accent });
  drawText(page, "DATE", x + 9.5 * MM, y + TICKET_HEIGHT - 62 * MM, 2.2 * MM, bold, COLORS.gray);
  drawText(page, date, x + 6.5 * MM, y + TICKET_HEIGHT - 67.5 * MM, 3.2 * MM, bold, COLORS.black);

  page.drawCircle({ x: x + TICKET_WIDTH / 2 + 7 * MM, y: y + TICKET_HEIGHT - 61.2 * MM, size: 0.65 * MM, color: COLORS.accentPink });
  drawText(page, "LOCATION", x + TICKET_WIDTH / 2 + 9.5 * MM, y + TICKET_HEIGHT - 62 * MM, 2.2 * MM, bold, COLORS.gray);

  const locLines = wrapText(location, bold, 2.9 * MM, TICKET_WIDTH / 2 - 13 * MM).slice(0, 2);
  let locY = y + TICKET_HEIGHT - 67.5 * MM;
  for (const line of locLines) {
    drawText(page, line, x + TICKET_WIDTH / 2 + 6.5 * MM, locY, 2.9 * MM, bold, COLORS.black);
    locY -= 3.5 * MM;
  }

  // Ticket Details Panel
  const panelX = x + 3.5 * MM;
  const panelY = y + 5 * MM;
  const panelW = TICKET_WIDTH - 7 * MM;
  const panelH = 58 * MM;

  roundedRect(page, panelX, panelY, panelW, panelH, COLORS.lightBg, 4, COLORS.lightGray, 0.5);
  drawText(page, "TICKET DETAILS", panelX + 5 * MM, y + TICKET_HEIGHT - 80 * MM, 3.2 * MM, bold, COLORS.accent);
  page.drawLine({
    start: { x: panelX + 5 * MM, y: y + TICKET_HEIGHT - 82.5 * MM },
    end: { x: panelX + panelW - 5 * MM, y: y + TICKET_HEIGHT - 82.5 * MM },
    thickness: 0.5,
    color: COLORS.lightGray,
  });

  // Inner Card
  const boxX = panelX + 3.5 * MM;
  const boxY = y + 18 * MM;
  const boxW = panelW - 7 * MM;
  const boxH = 34 * MM;
  roundedRect(page, boxX, boxY, boxW, boxH, COLORS.white, 3.5, COLORS.lightGray, 0.5);

  const leftX = boxX + 5 * MM;
  const rightX = boxX + boxW / 2 + 2 * MM;
  const colW = boxW / 2 - 8 * MM;

  // Box Row 1
  drawText(page, "ATTENDEE", leftX, boxY + boxH - 5.5 * MM, 2 * MM, bold, COLORS.gray);
  drawText(page, safeText(booking?.userId?.name) || "Guest", leftX, boxY + boxH - 9.8 * MM, 3 * MM, bold, COLORS.black);

  drawText(page, "LOCATION", rightX, boxY + boxH - 5.5 * MM, 2 * MM, bold, COLORS.gray);
  let bLocY = boxY + boxH - 9.8 * MM;
  for (const line of wrapText(location, bold, 2.6 * MM, colW).slice(0, 2)) {
    drawText(page, line, rightX, bLocY, 2.6 * MM, bold, COLORS.black);
    bLocY -= 3.3 * MM;
  }

  // Box Divider
  page.drawLine({
    start: { x: leftX, y: boxY + boxH - 15.5 * MM },
    end: { x: boxX + boxW - 5 * MM, y: boxY + boxH - 15.5 * MM },
    thickness: 0.4,
    color: COLORS.lightGray,
  });

  // Box Row 2
  drawText(page, "DATE", leftX, boxY + boxH - 20 * MM, 2 * MM, bold, COLORS.gray);
  drawText(page, date, leftX, boxY + boxH - 24.3 * MM, 3 * MM, bold, COLORS.black);

  drawText(page, "CATEGORY", rightX, boxY + boxH - 20 * MM, 2 * MM, bold, COLORS.gray);
  drawText(page, category, rightX, boxY + boxH - 24.3 * MM, 2.7 * MM, bold, COLORS.black);

  // Bottom Detail Row: Price & Email
  page.drawCircle({ x: leftX, y: y + TICKET_HEIGHT - 122 * MM, size: 0.9 * MM, color: COLORS.green });
  drawText(page, "TICKET PRICE", leftX + 2.8 * MM, y + TICKET_HEIGHT - 120.8 * MM, 2 * MM, bold, COLORS.gray);
  drawText(page, formatPrice(event?.ticketPrice), leftX, y + TICKET_HEIGHT - 126 * MM, 3.3 * MM, bold, COLORS.accent);

  drawText(page, "EMAIL", rightX, y + TICKET_HEIGHT - 120.8 * MM, 2 * MM, bold, COLORS.gray);
  let emailY = y + TICKET_HEIGHT - 126 * MM;
  for (const line of wrapText(booking?.userId?.email, regular, 2.2 * MM, colW).slice(0, 2)) {
    drawText(page, line, rightX, emailY, 2.2 * MM, regular, COLORS.black);
    emailY -= 3 * MM;
  }

  drawCenteredText(page, "Please carry a valid photo ID to the venue", x + TICKET_WIDTH / 2, y + 2.8 * MM, 1.9 * MM, regular, COLORS.gray);
};

// ======================================================
// BACK TICKET
// ======================================================
const drawBackTicket = async (page, pdfDoc, fonts, booking, event) => {
  const { regular, bold } = fonts;
  const x = BACK_X;
  const y = TICKET_Y;
  const cx = x + TICKET_WIDTH / 2;

  roundedRect(page, x, y, TICKET_WIDTH, TICKET_HEIGHT, COLORS.white, 4.5, COLORS.navy, 1);
  drawBrandHeader(page, fonts, x, y, "E-TICKET", COLORS.accent);

  // Checkmark & Verification Label
  page.drawCircle({ x: cx, y: y + TICKET_HEIGHT - 23 * MM, size: 7.5 * MM, color: COLORS.softBg });
  drawCheckmark(page, cx, y + TICKET_HEIGHT - 23 * MM, 4.6 * MM, COLORS.green);

  drawCenteredText(page, "SCAN TO VERIFY", cx, y + TICKET_HEIGHT - 35.5 * MM, 4.4 * MM, bold, COLORS.accent);
  drawCenteredText(page, "Present this QR code at the", cx, y + TICKET_HEIGHT - 41 * MM, 2.6 * MM, regular, COLORS.gray);
  drawCenteredText(page, "event entrance for entry.", cx, y + TICKET_HEIGHT - 45 * MM, 2.6 * MM, regular, COLORS.gray);

  page.drawLine({
    start: { x: x + 10 * MM, y: y + TICKET_HEIGHT - 49 * MM },
    end: { x: x + TICKET_WIDTH - 10 * MM, y: y + TICKET_HEIGHT - 49 * MM },
    thickness: 0.6,
    color: COLORS.lightGray,
  });

  // QR Code
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

    const qrSize = 42 * MM;
    const qrX = x + (TICKET_WIDTH - qrSize) / 2;
    const qrY = y + TICKET_HEIGHT - 100 * MM;

    roundedRect(page, qrX - 4.5 * MM, qrY - 4.5 * MM, qrSize + 9 * MM, qrSize + 9 * MM, COLORS.white, 4, COLORS.lightGray, 0.7);
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  } catch (error) {
    console.error("QR generation failed:", error.message);
  }

  // Booking ID
  drawCenteredText(page, "BOOKING ID", cx, y + TICKET_HEIGHT - 106 * MM, 2.2 * MM, bold, COLORS.gray);
  drawCenteredText(page, bookingId.toUpperCase() || "N/A", cx, y + TICKET_HEIGHT - 111.5 * MM, 3.2 * MM, bold, COLORS.accent);

  page.drawLine({
    start: { x: x + 14 * MM, y: y + TICKET_HEIGHT - 116.5 * MM },
    end: { x: x + TICKET_WIDTH - 14 * MM, y: y + TICKET_HEIGHT - 116.5 * MM },
    thickness: 0.5,
    color: COLORS.lightGray,
  });

  // Security Note
  roundedRect(page, x + 7 * MM, y + TICKET_HEIGHT - 127 * MM, TICKET_WIDTH - 14 * MM, 7 * MM, COLORS.softBg, 2.5, COLORS.lightGray, 0.5);
  drawCenteredText(page, "Keep this ticket safe. Do not share the QR code.", cx, y + TICKET_HEIGHT - 123.5 * MM, 2 * MM, bold, COLORS.gray);
  drawCenteredText(page, "eventora.app", cx, y + 3 * MM, 1.9 * MM, regular, COLORS.lightGray);
};

// ======================================================
// CUT LINE
// ======================================================
const drawCutLine = (page) => {
  const centerX = FRONT_X + TICKET_WIDTH + GAP / 2;
  const top = TICKET_Y + TICKET_HEIGHT + 3.5 * MM;
  const bottom = TICKET_Y - 3.5 * MM;
  const dashLength = 2 * MM;
  const gapLength = 1.4 * MM;
  let cursor = top;

  while (cursor > bottom) {
    const segmentEnd = Math.max(cursor - dashLength, bottom);
    page.drawLine({
      start: { x: centerX, y: cursor },
      end: { x: centerX, y: segmentEnd },
      thickness: 0.7,
      color: COLORS.cutLine,
    });
    cursor = segmentEnd - gapLength;
  }
};

// ======================================================
// EXPORTS
// ======================================================
export const generateTicketPDF = async (booking) => {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fonts = { regular, bold };

    const event = booking?.eventId;
    if (!event) throw new Error("Event information is missing from booking");

    const imageUrl = event.imageUrl || event.image || event.imageURL || "";
    const imageBytes = await fetchImage(imageUrl);

    await drawFrontTicket(page, pdfDoc, fonts, booking, event, imageBytes);
    await drawBackTicket(page, pdfDoc, fonts, booking, event);
    drawCutLine(page);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Ticket PDF generation failed:", error);
    throw error;
  }
};