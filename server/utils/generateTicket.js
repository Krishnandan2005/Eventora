import QRCode from "qrcode";
import sharp from "sharp";

// ============================================================
// TICKET SIZE
// 85.6mm × 140mm — portrait ID/card style
// ============================================================

const WIDTH = 1011;
const HEIGHT = 1654;

const FONT = "DejaVu Sans";

// ============================================================
// HELPERS
// ============================================================

const escapeXml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

const formatDate = (date) => {
    if (!date) return "N/A";

    const d = new Date(date);

    if (isNaN(d.getTime())) {
        return String(date);
    }

    return d
        .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        .toUpperCase();
};

const formatDay = (date) => {
    if (!date) return "";

    const d = new Date(date);

    if (isNaN(d.getTime())) return "";

    return d.toLocaleDateString("en-US", {
        weekday: "long",
    });
};

// ============================================================
// TEXT WRAPPING
// ============================================================

const wrapText = (text, maxChars = 25) => {
    const words = String(text || "").split(/\s+/);

    const lines = [];
    let current = "";

    for (const word of words) {
        const test = current
            ? `${current} ${word}`
            : word;

        if (test.length <= maxChars) {
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

// ============================================================
// FETCH EVENT IMAGE
// ============================================================

const fetchImageAsDataUri = async (url) => {
    try {
        if (!url) return null;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Image fetch failed: ${response.status}`
            );
        }

        const arrayBuffer = await response.arrayBuffer();

        const buffer = Buffer.from(arrayBuffer);

        const metadata = await sharp(buffer).metadata();

        let mime = "image/jpeg";

        if (metadata.format === "png") {
            mime = "image/png";
        }

        if (metadata.format === "webp") {
            mime = "image/webp";
        }

        return `data:${mime};base64,${buffer.toString("base64")}`;
    } catch (error) {
        console.error("Event image error:", error);
        return null;
    }
};

// ============================================================
// MAIN TICKET GENERATOR
// ============================================================

export const generateTicketPNG = async (booking) => {
    try {
        const event = booking.eventId;
        const user = booking.userId;

        // ========================================================
        // EVENT IMAGE
        // ========================================================

        const eventImage = await fetchImageAsDataUri(
            event.imageUrl
        );

        // ========================================================
        // QR CODE
        // ========================================================

        const qrData = JSON.stringify({
            bookingId: booking._id.toString(),
            eventId: event._id.toString(),
        });

        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            width: 500,
            margin: 2,
            errorCorrectionLevel: "H",
        });

        // ========================================================
        // DYNAMIC DATA
        // ========================================================

        const title = escapeXml(event.title || "Event");

        const attendee = escapeXml(
            user?.name || "Attendee"
        );

        const email = escapeXml(
            user?.email || ""
        );

        const date = escapeXml(
            formatDate(event.date)
        );

        const day = escapeXml(
            formatDay(event.date)
        );

        const location = escapeXml(
            event.location || "Location not available"
        );

        const category = escapeXml(
            event.category || "General"
        );

        const price = escapeXml(
            `INR ${booking.amount ?? 0}`
        );

        const bookingId = escapeXml(
            booking._id
                .toString()
                .slice(-16)
                .toUpperCase()
        );

        // ========================================================
        // WRAPPED TEXT
        // ========================================================

        const titleLines = wrapText(
            event.title || "Event",
            28
        ).slice(0, 3);

        const locationLines = wrapText(
            event.location || "Location not available",
            23
        ).slice(0, 2);

        // ========================================================
        // TITLE SVG
        // ========================================================

        const titleSvg = titleLines
            .map(
                (line, index) => `
                    <text
                        x="62"
                        y="${305 + index * 47}"
                        font-family="${FONT}"
                        font-size="39"
                        font-weight="700"
                        fill="white"
                    >
                        ${escapeXml(line)}
                    </text>
                `
            )
            .join("");

        // ========================================================
        // LOCATION SVG
        // ========================================================

        const locationSvg = locationLines
            .map(
                (line, index) => `
                    <text
                        x="560"
                        y="${858 + index * 28}"
                        font-family="${FONT}"
                        font-size="20"
                        font-weight="700"
                        fill="white"
                    >
                        ${escapeXml(line)}
                    </text>
                `
            )
            .join("");

        // ========================================================
        // EVENT IMAGE
        // ========================================================

        const imageSection = eventImage
            ? `
                <defs>
                    <clipPath id="eventImageClip">
                        <rect
                            x="40"
                            y="375"
                            width="931"
                            height="345"
                            rx="28"
                        />
                    </clipPath>
                </defs>

                <image
                    href="${eventImage}"
                    x="40"
                    y="375"
                    width="931"
                    height="345"
                    preserveAspectRatio="xMidYMid slice"
                    clip-path="url(#eventImageClip)"
                />

                <rect
                    x="40"
                    y="375"
                    width="931"
                    height="345"
                    rx="28"
                    fill="url(#imageOverlay)"
                />
            `
            : `
                <rect
                    x="40"
                    y="375"
                    width="931"
                    height="345"
                    rx="28"
                    fill="url(#imageFallback)"
                />

                <circle
                    cx="505"
                    cy="520"
                    r="100"
                    fill="#ffffff"
                    opacity="0.08"
                />

                <text
                    x="505"
                    y="530"
                    text-anchor="middle"
                    font-family="${FONT}"
                    font-size="30"
                    font-weight="700"
                    fill="white"
                    opacity="0.8"
                >
                    EVENTORA
                </text>
            `;

        // ========================================================
        // SVG
        // ========================================================

        const svg = `
        <svg
            width="${WIDTH}"
            height="${HEIGHT}"
            viewBox="0 0 ${WIDTH} ${HEIGHT}"
            xmlns="http://www.w3.org/2000/svg"
        >

            <defs>

                <!-- Main purple gradient -->
                <linearGradient
                    id="mainGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                >
                    <stop
                        offset="0%"
                        stop-color="#08052D"
                    />

                    <stop
                        offset="50%"
                        stop-color="#32109A"
                    />

                    <stop
                        offset="100%"
                        stop-color="#7B18E6"
                    />
                </linearGradient>

                <!-- Footer -->
                <linearGradient
                    id="footerGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                >
                    <stop
                        offset="0%"
                        stop-color="#3420E8"
                    />

                    <stop
                        offset="50%"
                        stop-color="#7A1FF2"
                    />

                    <stop
                        offset="100%"
                        stop-color="#F026A8"
                    />
                </linearGradient>

                <!-- Wave -->
                <linearGradient
                    id="waveGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                >
                    <stop
                        offset="0%"
                        stop-color="#F426A6"
                    />

                    <stop
                        offset="50%"
                        stop-color="#A62CF5"
                    />

                    <stop
                        offset="100%"
                        stop-color="#FF9D22"
                    />
                </linearGradient>

                <!-- Image overlay -->
                <linearGradient
                    id="imageOverlay"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                >
                    <stop
                        offset="0%"
                        stop-color="#05052D"
                        stop-opacity="0.05"
                    />

                    <stop
                        offset="100%"
                        stop-color="#05052D"
                        stop-opacity="0.65"
                    />
                </linearGradient>

                <!-- Fallback -->
                <linearGradient
                    id="imageFallback"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                >
                    <stop
                        offset="0%"
                        stop-color="#14104A"
                    />

                    <stop
                        offset="100%"
                        stop-color="#6A1FE5"
                    />
                </linearGradient>

                <!-- Shadow -->
                <filter id="shadow">
                    <feDropShadow
                        dx="0"
                        dy="10"
                        stdDeviation="18"
                        flood-opacity="0.20"
                    />
                </filter>

            </defs>

            <!-- ================================================= -->
            <!-- OUTER CARD -->
            <!-- ================================================= -->

            <rect
                x="16"
                y="16"
                width="979"
                height="1622"
                rx="44"
                fill="white"
                filter="url(#shadow)"
            />

            <!-- ================================================= -->
            <!-- TOP PURPLE AREA -->
            <!-- ================================================= -->

            <path
                d="
                    M16 60
                    Q16 16 60 16
                    H951
                    Q995 16 995 60
                    V810
                    H16
                    Z
                "
                fill="url(#mainGradient)"
            />

            <!-- Decorative dots -->

            <g
                fill="white"
                opacity="0.20"
            >
                <circle cx="860" cy="70" r="7"/>
                <circle cx="900" cy="100" r="5"/>
                <circle cx="940" cy="70" r="4"/>
                <circle cx="830" cy="115" r="4"/>
                <circle cx="920" cy="145" r="3"/>
            </g>

            <!-- ================================================= -->
            <!-- LOGO -->
            <!-- ================================================= -->

            <circle
                cx="105"
                cy="105"
                r="43"
                fill="#6126E8"
            />

            <text
                x="105"
                y="119"
                text-anchor="middle"
                font-family="${FONT}"
                font-size="38"
                font-weight="700"
                fill="white"
            >
                E
            </text>

            <text
                x="165"
                y="105"
                font-family="${FONT}"
                font-size="39"
                font-weight="700"
                fill="white"
            >
                EVENTORA
            </text>

            <text
                x="168"
                y="134"
                font-family="${FONT}"
                font-size="16"
                fill="#D9D2FA"
            >
                Your Event, Your Experience
            </text>

            <!-- ================================================= -->
            <!-- CONFIRMED BADGE -->
            <!-- ================================================= -->

            <rect
                x="685"
                y="75"
                width="240"
                height="60"
                rx="16"
                fill="#00C96B"
            />

            <circle
                cx="718"
                cy="105"
                r="14"
                fill="none"
                stroke="white"
                stroke-width="3"
            />

            <path
                d="
                    M711 105
                    L716 111
                    L727 98
                "
                fill="none"
                stroke="white"
                stroke-width="3"
            />

            <text
                x="742"
                y="113"
                font-family="${FONT}"
                font-size="20"
                font-weight="700"
                fill="white"
            >
                CONFIRMED
            </text>

            <!-- ================================================= -->
            <!-- EVENT LABEL -->
            <!-- ================================================= -->

            <rect
                x="62"
                y="190"
                width="122"
                height="44"
                rx="11"
                fill="#6626E8"
            />

            <text
                x="123"
                y="219"
                text-anchor="middle"
                font-family="${FONT}"
                font-size="18"
                font-weight="700"
                fill="white"
            >
                EVENT
            </text>

            <!-- ================================================= -->
            <!-- EVENT TITLE -->
            <!-- ================================================= -->

            ${titleSvg}

            <!-- ================================================= -->
            <!-- EVENT IMAGE -->
            <!-- ================================================= -->

            ${imageSection}

            <!-- ================================================= -->
            <!-- COLORFUL WAVE -->
            <!-- ================================================= -->

            <path
                d="
                    M16 690
                    C180 755 310 785 465 738
                    C625 690 770 755 995 695
                    L995 850
                    L16 850
                    Z
                "
                fill="url(#mainGradient)"
            />

            <path
                d="
                    M16 700
                    C185 765 315 792 470 744
                    C630 697 770 763 995 703
                "
                fill="none"
                stroke="url(#waveGradient)"
                stroke-width="17"
            />

            <!-- ================================================= -->
            <!-- DATE -->
            <!-- ================================================= -->

            <g>

                <circle
                    cx="95"
                    cy="790"
                    r="27"
                    fill="#6526E8"
                />

                <!-- Calendar icon -->
                <rect
                    x="83"
                    y="780"
                    width="24"
                    height="21"
                    rx="3"
                    fill="none"
                    stroke="white"
                    stroke-width="2.5"
                />

                <line
                    x1="83"
                    y1="787"
                    x2="107"
                    y2="787"
                    stroke="white"
                    stroke-width="2.5"
                />

                <text
                    x="135"
                    y="785"
                    font-family="${FONT}"
                    font-size="15"
                    font-weight="700"
                    fill="#CDB7FF"
                >
                    DATE
                </text>

                <text
                    x="135"
                    y="815"
                    font-family="${FONT}"
                    font-size="22"
                    font-weight="700"
                    fill="white"
                >
                    ${date}
                </text>

                <text
                    x="135"
                    y="840"
                    font-family="${FONT}"
                    font-size="15"
                    fill="#E2DBFF"
                >
                    ${day}
                </text>

            </g>

            <!-- ================================================= -->
            <!-- LOCATION -->
            <!-- ================================================= -->

            <g>

                <circle
                    cx="570"
                    cy="790"
                    r="27"
                    fill="#8B2AF3"
                />

                <!-- Location icon -->
                <path
                    d="
                        M570 805
                        C570 805 557 793 557 785
                        C557 777 563 771 570 771
                        C577 771 583 777 583 785
                        C583 793 570 805 570 805
                    "
                    fill="none"
                    stroke="white"
                    stroke-width="2.5"
                />

                <circle
                    cx="570"
                    cy="785"
                    r="4"
                    fill="white"
                />

                <text
                    x="615"
                    y="785"
                    font-family="${FONT}"
                    font-size="15"
                    font-weight="700"
                    fill="#CDB7FF"
                >
                    LOCATION
                </text>

                ${locationSvg}

            </g>

            <!-- ================================================= -->
            <!-- DETAILS SECTION -->
            <!-- ================================================= -->

            <rect
                x="16"
                y="875"
                width="979"
                height="575"
                rx="40"
                fill="white"
            />

            <text
                x="62"
                y="940"
                font-family="${FONT}"
                font-size="25"
                font-weight="700"
                fill="#5522DA"
            >
                TICKET DETAILS
            </text>

            <line
                x1="62"
                y1="960"
                x2="950"
                y2="960"
                stroke="#E7DFFC"
                stroke-width="3"
            />

            <!-- ================================================= -->
            <!-- DETAIL CARD -->
            <!-- ================================================= -->

            <rect
                x="50"
                y="985"
                width="911"
                height="390"
                rx="25"
                fill="#FBFAFF"
                stroke="#E4DDF9"
                stroke-width="2"
            />

            <!-- Vertical divider -->

            <line
                x1="505"
                y1="1015"
                x2="505"
                y2="1350"
                stroke="#E5DEF8"
                stroke-width="2"
            />

            <!-- ================================================= -->
            <!-- ATTENDEE -->
            <!-- ================================================= -->

            <circle
                cx="95"
                cy="1045"
                r="27"
                fill="#5C20E8"
            />

            <!-- User icon -->
            <circle
                cx="95"
                cy="1039"
                r="7"
                fill="none"
                stroke="white"
                stroke-width="2.5"
            />

            <path
                d="
                    M82 1057
                    C84 1049 89 1046 95 1046
                    C101 1046 106 1049 108 1057
                "
                fill="none"
                stroke="white"
                stroke-width="2.5"
            />

            <text
                x="140"
                y="1037"
                font-family="${FONT}"
                font-size="13"
                font-weight="700"
                fill="#777"
            >
                ATTENDEE
            </text>

            <text
                x="140"
                y="1064"
                font-family="${FONT}"
                font-size="21"
                font-weight="700"
                fill="#18152D"
            >
                ${attendee}
            </text>

            <!-- ================================================= -->
            <!-- DATE DETAIL -->
            <!-- ================================================= -->

            <circle
                cx="95"
                cy="1120"
                r="27"
                fill="#EA249F"
            />

            <!-- Calendar icon -->
            <rect
                x="83"
                y="1109"
                width="24"
                height="21"
                rx="3"
                fill="none"
                stroke="white"
                stroke-width="2.5"
            />

            <line
                x1="83"
                y1="1116"
                x2="107"
                y2="1116"
                stroke="white"
                stroke-width="2.5"
            />

            <text
                x="140"
                y="1112"
                font-family="${FONT}"
                font-size="13"
                font-weight="700"
                fill="#777"
            >
                DATE
            </text>

            <text
                x="140"
                y="1139"
                font-family="${FONT}"
                font-size="21"
                font-weight="700"
                fill="#18152D"
            >
                ${date}
            </text>

            <!-- ================================================= -->
            <!-- LOCATION DETAIL -->
            <!-- ================================================= -->

            <circle
                cx="95"
                cy="1195"
                r="27"
                fill="#FF921D"
            />

            <!-- Pin -->
            <path
                d="
                    M95 1210
                    C95 1210 83 1199 83 1190
                    C83 1183 88 1178 95 1178
                    C102 1178 107 1183 107 1190
                    C107 1199 95 1210 95 1210
                "
                fill="none"
                stroke="white"
                stroke-width="2.5"
            />

            <circle
                cx="95"
                cy="1190"
                r="3.5"
                fill="white"
            />

            <text
                x="140"
                y="1187"
                font-family="${FONT}"
                font-size="13"
                font-weight="700"
                fill="#777"
            >
                LOCATION
            </text>

            <text
                x="140"
                y="1214"
                font-family="${FONT}"
                font-size="17"
                font-weight="700"
                fill="#18152D"
            >
                ${locationLines[0]
                    ? escapeXml(locationLines[0])
                    : "N/A"}
            </text>

            ${
                locationLines[1]
                    ? `
                        <text
                            x="140"
                            y="1237"
                            font-family="${FONT}"
                            font-size="17"
                            font-weight="700"
                            fill="#18152D"
                        >
                            ${escapeXml(locationLines[1])}
                        </text>
                    `
                    : ""
            }

            <!-- ================================================= -->
            <!-- CATEGORY -->
            <!-- ================================================= -->

            <circle
                cx="95"
                cy="1280"
                r="27"
                fill="#08B96B"
            />

            <!-- Tag icon -->
            <path
                d="
                    M84 1270
                    H99
                    L107 1278
                    L96 1290
                    L84 1278
                    Z
                "
                fill="none"
                stroke="white"
                stroke-width="2.5"
            />

            <circle
                cx="96"
                cy="1275"
                r="2.5"
                fill="white"
            />

            <text
                x="140"
                y="1272"
                font-family="${FONT}"
                font-size="13"
                font-weight="700"
                fill="#777"
            >
                CATEGORY
            </text>

            <text
                x="140"
                y="1299"
                font-family="${FONT}"
                font-size="20"
                font-weight="700"
                fill="#18152D"
            >
                ${category}
            </text>

            <!-- ================================================= -->
            <!-- PRICE -->
            <!-- ================================================= -->

            <circle
                cx="95"
                cy="1350"
                r="27"
                fill="#2469F5"
            />

            <!-- Ticket icon -->
            <path
                d="
                    M83 1341
                    H107
                    V1359
                    H83
                    Z
                "
                fill="none"
                stroke="white"
                stroke-width="2.5"
            />

            <line
                x1="88"
                y1="1341"
                x2="88"
                y2="1359"
                stroke="white"
                stroke-width="2"
                stroke-dasharray="3 3"
            />

            <text
                x="140"
                y="1342"
                font-family="${FONT}"
                font-size="13"
                font-weight="700"
                fill="#777"
            >
                TICKET PRICE
            </text>

            <text
                x="140"
                y="1369"
                font-family="${FONT}"
                font-size="21"
                font-weight="700"
                fill="#18152D"
            >
                ${price}
            </text>

            <!-- ================================================= -->
            <!-- EMAIL -->
            <!-- ================================================= -->

            <text
                x="555"
                y="1037"
                font-family="${FONT}"
                font-size="13"
                font-weight="700"
                fill="#777"
            >
                EMAIL
            </text>

            <text
                x="555"
                y="1065"
                font-family="${FONT}"
                font-size="17"
                font-weight="700"
                fill="#18152D"
            >
                ${email}
            </text>

            <!-- ================================================= -->
            <!-- BOOKING STATUS -->
            <!-- ================================================= -->

            <rect
                x="555"
                y="1100"
                width="350"
                height="80"
                rx="18"
                fill="#EFFBF5"
                stroke="#B8EFD2"
                stroke-width="2"
            />

            <circle
                cx="590"
                cy="1140"
                r="20"
                fill="#00C96B"
            />

            <path
                d="
                    M580 1140
                    L587 1147
                    L600 1132
                "
                fill="none"
                stroke="white"
                stroke-width="3"
            />

            <text
                x="625"
                y="1135"
                font-family="${FONT}"
                font-size="14"
                font-weight="700"
                fill="#15945C"
            >
                BOOKING STATUS
            </text>

            <text
                x="625"
                y="1157"
                font-family="${FONT}"
                font-size="18"
                font-weight="700"
                fill="#222"
            >
                Confirmed
            </text>

            <!-- ================================================= -->
            <!-- VALIDITY INFO -->
            <!-- ================================================= -->

            <rect
                x="555"
                y="1210"
                width="350"
                height="140"
                rx="20"
                fill="#F2ECFF"
                stroke="#D5C3FF"
                stroke-width="2"
            />

            <circle
                cx="590"
                cy="1250"
                r="21"
                fill="#5A20D9"
            />

            <text
                x="590"
                y="1258"
                text-anchor="middle"
                font-family="${FONT}"
                font-size="21"
                font-weight="700"
                fill="white"
            >
                i
            </text>

            <text
                x="625"
                y="1245"
                font-family="${FONT}"
                font-size="14"
                font-weight="700"
                fill="#333"
            >
                VALID TICKET
            </text>

            <text
                x="625"
                y="1272"
                font-family="${FONT}"
                font-size="13"
                fill="#555"
            >
                Valid only for the event
            </text>

            <text
                x="625"
                y="1293"
                font-family="${FONT}"
                font-size="13"
                fill="#555"
            >
                mentioned on this ticket.
            </text>

            <text
                x="625"
                y="1322"
                font-family="${FONT}"
                font-size="14"
                font-weight="700"
                fill="#5522DA"
            >
                Thank you for choosing Eventora.
            </text>

            <!-- ================================================= -->
            <!-- QR SECTION -->
            <!-- ================================================= -->

            <rect
                x="16"
                y="1445"
                width="979"
                height="130"
                fill="#FFFFFF"
            />

            <line
                x1="62"
                y1="1470"
                x2="949"
                y2="1470"
                stroke="#E5DDF9"
                stroke-width="2"
            />

            <text
                x="62"
                y="1505"
                font-family="${FONT}"
                font-size="13"
                font-weight="700"
                fill="#777"
            >
                BOOKING ID
            </text>

            <text
                x="62"
                y="1535"
                font-family="${FONT}"
                font-size="21"
                font-weight="700"
                fill="#5522DA"
            >
                ${bookingId}
            </text>

            <text
                x="600"
                y="1505"
                font-family="${FONT}"
                font-size="13"
                font-weight="700"
                fill="#777"
            >
                SCAN TO VERIFY
            </text>

            <text
                x="600"
                y="1532"
                font-family="${FONT}"
                font-size="14"
                fill="#444"
            >
                Present this ticket at
            </text>

            <text
                x="600"
                y="1554"
                font-family="${FONT}"
                font-size="14"
                fill="#444"
            >
                the event entrance.
            </text>

            <!-- ================================================= -->
            <!-- FOOTER -->
            <!-- ================================================= -->

            <rect
                x="16"
                y="1575"
                width="979"
                height="63"
                rx="0"
                fill="url(#footerGradient)"
            />

            <text
                x="62"
                y="1614"
                font-family="${FONT}"
                font-size="17"
                font-weight="700"
                fill="white"
            >
                EVENTORA
            </text>

            <text
                x="505"
                y="1614"
                text-anchor="middle"
                font-family="${FONT}"
                font-size="14"
                fill="#FFFFFF"
                opacity="0.9"
            >
                Your Event, Your Experience
            </text>

            <text
                x="940"
                y="1614"
                text-anchor="end"
                font-family="${FONT}"
                font-size="14"
                font-weight="700"
                fill="#FFE600"
            >
                ${bookingId}
            </text>

            <!-- ================================================= -->
            <!-- QR CODE -->
            <!-- ================================================= -->

            <g>
                <rect
                    x="760"
                    y="1195"
                    width="155"
                    height="155"
                    rx="16"
                    fill="white"
                    stroke="#DDD3F5"
                    stroke-width="2"
                />

                <image
                    href="${qrCodeDataUrl}"
                    x="770"
                    y="1205"
                    width="135"
                    height="135"
                />
            </g>

        </svg>
        `;

        // ========================================================
        // SVG → PNG
        // ========================================================

        const pngBuffer = await sharp(
            Buffer.from(svg)
        )
            .png({
                quality: 100,
                compressionLevel: 9,
            })
            .toBuffer();

        console.log(
            "Eventora ticket PNG generated successfully"
        );

        return pngBuffer;

    } catch (error) {
        console.error(
            "Ticket PNG generation error:",
            error
        );

        throw error;
    }
};