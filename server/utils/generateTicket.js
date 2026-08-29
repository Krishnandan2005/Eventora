import QRCode from "qrcode";
import sharp from "sharp";

const WIDTH = 1011;
const HEIGHT = 1654;

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

    if (isNaN(d.getTime())) return String(date);

    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).toUpperCase();
};

const fetchImageAsDataUri = async (url) => {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Image fetch failed: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const metadata = await sharp(buffer).metadata();

        let mime = "image/jpeg";

        if (metadata.format === "png") mime = "image/png";
        if (metadata.format === "webp") mime = "image/webp";

        return `data:${mime};base64,${buffer.toString("base64")}`;
    } catch (error) {
        console.error("Event image error:", error);
        return null;
    }
};

export const generateTicketPNG = async (booking) => {
    const event = booking.eventId;
    const user = booking.userId;

    const eventImage = await fetchImageAsDataUri(event.imageUrl);

    const qrData = JSON.stringify({
        bookingId: booking._id.toString(),
        eventId: event._id.toString(),
    });

    const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 500,
        margin: 2,
        errorCorrectionLevel: "H",
    });

    const title = escapeXml(event.title);
    const attendee = escapeXml(user.name);
    const email = escapeXml(user.email);
    const date = escapeXml(formatDate(event.date));
    const location = escapeXml(event.location);
    const category = escapeXml(event.category);
    const price = escapeXml(`INR ${booking.amount}`);
    const bookingId = escapeXml(
        booking._id.toString().slice(-16).toUpperCase()
    );

    const image = eventImage
        ? `
        <defs>
            <clipPath id="eventImageClip">
                <rect x="45" y="330" width="921" height="430" rx="30"/>
            </clipPath>
        </defs>

        <image
            href="${eventImage}"
            x="45"
            y="330"
            width="921"
            height="430"
            preserveAspectRatio="xMidYMid slice"
            clip-path="url(#eventImageClip)"
        />

        <rect
            x="45"
            y="330"
            width="921"
            height="430"
            rx="30"
            fill="url(#imageOverlay)"
        />
        `
        : `
        <rect
            x="45"
            y="330"
            width="921"
            height="430"
            rx="30"
            fill="#24105f"
        />
        `;

    const svg = `
<svg
    width="${WIDTH}"
    height="${HEIGHT}"
    viewBox="0 0 ${WIDTH} ${HEIGHT}"
    xmlns="http://www.w3.org/2000/svg"
>

<defs>

    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#08052D"/>
        <stop offset="55%" stop-color="#30108F"/>
        <stop offset="100%" stop-color="#7B16D9"/>
    </linearGradient>

    <linearGradient id="bottomGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#3920E8"/>
        <stop offset="50%" stop-color="#7B20F2"/>
        <stop offset="100%" stop-color="#F026A8"/>
    </linearGradient>

    <linearGradient id="imageOverlay" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#05052D" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#05052D" stop-opacity="0.65"/>
    </linearGradient>

    <linearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#F52BA7"/>
        <stop offset="50%" stop-color="#A52AF4"/>
        <stop offset="100%" stop-color="#FF9E20"/>
    </linearGradient>

    <filter id="shadow">
        <feDropShadow
            dx="0"
            dy="10"
            stdDeviation="15"
            flood-opacity="0.18"
        />
    </filter>

</defs>

<!-- MAIN CARD -->

<rect
    x="20"
    y="20"
    width="971"
    height="1614"
    rx="42"
    fill="white"
    filter="url(#shadow)"
/>

<!-- HEADER -->

<path
    d="M20 62 Q20 20 62 20 H949 Q991 20 991 62 V820 H20 Z"
    fill="url(#background)"
/>

<!-- Decorative dots -->

<g opacity="0.25" fill="#FFFFFF">
    <circle cx="880" cy="85" r="6"/>
    <circle cx="910" cy="115" r="5"/>
    <circle cx="940" cy="85" r="4"/>
    <circle cx="850" cy="115" r="4"/>
</g>

<!-- LOGO -->

<circle
    cx="100"
    cy="110"
    r="43"
    fill="#6125E8"
/>

<text
    x="100"
    y="125"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="42"
    font-weight="700"
    fill="white"
>
    E
</text>

<text
    x="165"
    y="112"
    font-family="Arial, Helvetica, sans-serif"
    font-size="40"
    font-weight="700"
    fill="white"
>
    EVENTORA
</text>

<text
    x="168"
    y="142"
    font-family="Arial, Helvetica, sans-serif"
    font-size="17"
    fill="#D8D3F7"
>
    Your Event, Your Experience
</text>

<!-- CONFIRMED -->

<rect
    x="700"
    y="82"
    width="225"
    height="58"
    rx="15"
    fill="#00C96B"
/>

<circle cx="730" cy="111" r="13" fill="none" stroke="white" stroke-width="3"/>

<path
    d="M723 111 L728 116 L738 105"
    fill="none"
    stroke="white"
    stroke-width="3"
/>

<text
    x="750"
    y="119"
    font-family="Arial, Helvetica, sans-serif"
    font-size="21"
    font-weight="700"
    fill="white"
>
    CONFIRMED
</text>

<!-- EVENT LABEL -->

<rect
    x="65"
    y="205"
    width="120"
    height="45"
    rx="10"
    fill="#6524E8"
/>

<text
    x="125"
    y="235"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="18"
    font-weight="700"
    fill="white"
>
    EVENT
</text>

<!-- EVENT TITLE -->

<text
    x="65"
    y="300"
    font-family="Arial, Helvetica, sans-serif"
    font-size="40"
    font-weight="700"
    fill="white"
>
    ${title}
</text>

<!-- EVENT IMAGE -->

${image}

<!-- WAVE -->

<path
    d="M20 700
       C180 760 300 790 450 745
       C620 690 760 760 991 700
       L991 850
       L20 850 Z"
    fill="url(#background)"
/>

<path
    d="M20 705
       C190 770 310 795 470 745
       C630 695 770 765 991 705"
    fill="none"
    stroke="url(#wave)"
    stroke-width="18"
/>

<!-- DATE -->

<text
    x="75"
    y="825"
    font-family="Arial, Helvetica, sans-serif"
    font-size="17"
    font-weight="700"
    fill="#C9A9FF"
>
    DATE
</text>

<text
    x="75"
    y="860"
    font-family="Arial, Helvetica, sans-serif"
    font-size="24"
    font-weight="700"
    fill="white"
>
    ${date}
</text>

<!-- LOCATION -->

<text
    x="545"
    y="825"
    font-family="Arial, Helvetica, sans-serif"
    font-size="17"
    font-weight="700"
    fill="#C9A9FF"
>
    LOCATION
</text>

<text
    x="545"
    y="860"
    font-family="Arial, Helvetica, sans-serif"
    font-size="22"
    font-weight="700"
    fill="white"
>
    ${location}
</text>

<!-- TICKET DETAILS -->

<rect
    x="20"
    y="895"
    width="971"
    height="570"
    rx="40"
    fill="white"
/>

<text
    x="65"
    y="955"
    font-family="Arial, Helvetica, sans-serif"
    font-size="25"
    font-weight="700"
    fill="#5423D9"
>
    TICKET DETAILS
</text>

<line
    x1="65"
    y1="975"
    x2="946"
    y2="975"
    stroke="#E5DDFB"
    stroke-width="3"
/>

<!-- DETAIL CARD -->

<rect
    x="55"
    y="1005"
    width="901"
    height="390"
    rx="25"
    fill="#FAF9FF"
    stroke="#E6DFFC"
    stroke-width="2"
/>

<!-- Attendee -->

<circle cx="100" cy="1060" r="28" fill="#5C20E8"/>

<text
    x="100"
    y="1069"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="20"
    font-weight="700"
    fill="white"
>
    U
</text>

<text x="145" y="1052"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    font-weight="700"
    fill="#777">
    ATTENDEE
</text>

<text x="145" y="1078"
    font-family="Arial, Helvetica, sans-serif"
    font-size="21"
    font-weight="700"
    fill="#17152D">
    ${attendee}
</text>

<!-- Date -->

<circle cx="100" cy="1140" r="28" fill="#EC249F"/>

<text
    x="145"
    y="1132"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    font-weight="700"
    fill="#777">
    DATE
</text>

<text
    x="145"
    y="1158"
    font-family="Arial, Helvetica, sans-serif"
    font-size="21"
    font-weight="700"
    fill="#17152D">
    ${date}
</text>

<!-- Location -->

<circle cx="100" cy="1220" r="28" fill="#FF921D"/>

<text
    x="145"
    y="1212"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    font-weight="700"
    fill="#777">
    LOCATION
</text>

<text
    x="145"
    y="1238"
    font-family="Arial, Helvetica, sans-serif"
    font-size="20"
    font-weight="700"
    fill="#17152D">
    ${location}
</text>

<!-- Category -->

<circle cx="100" cy="1300" r="28" fill="#08B96B"/>

<text
    x="145"
    y="1292"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    font-weight="700"
    fill="#777">
    CATEGORY
</text>

<text
    x="145"
    y="1318"
    font-family="Arial, Helvetica, sans-serif"
    font-size="21"
    font-weight="700"
    fill="#17152D">
    ${category}
</text>

<!-- Price -->

<circle cx="100" cy="1370" r="28" fill="#2469F5"/>

<text
    x="145"
    y="1362"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    font-weight="700"
    fill="#777">
    TICKET PRICE
</text>

<text
    x="145"
    y="1388"
    font-family="Arial, Helvetica, sans-serif"
    font-size="21"
    font-weight="700"
    fill="#17152D">
    ${price}
</text>

<!-- EMAIL -->

<text
    x="600"
    y="1052"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    font-weight="700"
    fill="#777">
    EMAIL
</text>

<text
    x="600"
    y="1080"
    font-family="Arial, Helvetica, sans-serif"
    font-size="17"
    font-weight="700"
    fill="#17152D">
    ${email}
</text>

<!-- INFO -->

<rect
    x="55"
    y="1420"
    width="901"
    height="110"
    rx="22"
    fill="#F0E9FF"
    stroke="#D2C0FF"
    stroke-width="2"
/>

<circle
    cx="100"
    cy="1475"
    r="24"
    fill="#5A20D9"
/>

<text
    x="100"
    y="1484"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="22"
    font-weight="700"
    fill="white">
    i
</text>

<text
    x="140"
    y="1465"
    font-family="Arial, Helvetica, sans-serif"
    font-size="16"
    fill="#26233A">
    This ticket is valid only for the
</text>

<text
    x="140"
    y="1492"
    font-family="Arial, Helvetica, sans-serif"
    font-size="16"
    fill="#26233A">
    event mentioned above.
</text>

<text
    x="140"
    y="1520"
    font-family="Arial, Helvetica, sans-serif"
    font-size="17"
    font-weight="700"
    fill="#5522DA">
    Thank you for choosing Eventora.
</text>

<!-- FOOTER -->

<rect
    x="20"
    y="1535"
    width="971"
    height="99"
    rx="0 0 42 42"
    fill="url(#bottomGradient)"
/>

<text
    x="65"
    y="1595"
    font-family="Arial, Helvetica, sans-serif"
    font-size="19"
    font-weight="700"
    fill="white">
    TICKET ID:
</text>

<text
    x="190"
    y="1595"
    font-family="Arial, Helvetica, sans-serif"
    font-size="19"
    font-weight="700"
    fill="#FFE600">
    ${bookingId}
</text>

</svg>
`;

    const pngBuffer = await sharp(Buffer.from(svg))
        .png({
            quality: 100,
            compressionLevel: 9,
        })
        .toBuffer();

    return pngBuffer;
};