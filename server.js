require("dotenv").config();
const express = require("express");
const { getReply } = require("./engine/aiEngine");
const app = express();
app.use(express.json({ limit: "20mb" }));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// =========================
// HUMAN ACTIVE TRACKING
// =========================
const lastHumanReply = {};

function setHumanActive(userId) {
  lastHumanReply[userId] = Date.now();
  console.log(`👤 Human active set for ${userId}`);
}

function isHumanActive(userId, timeoutMinutes = 10) {
  const last = lastHumanReply[userId];
  if (!last) return false;
  const diff = (Date.now() - last) / 1000 / 60;
  return diff < timeoutMinutes;
}

// =========================
// HOME
// =========================
app.get("/", (req, res) => {
  res.send("Graphic Room Studio WhatsApp AI Bot V2 🚀");
});

// =========================
// ADMIN — Human Active Trigger
// =========================
app.get("/human-reply/:number", (req, res) => {
  if (req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(403).send("Unauthorized");
  }
  setHumanActive(req.params.number);
  res.send(`✅ Bot paused 10 min for ${req.params.number}`);
});

// =========================
// WEBHOOK VERIFICATION
// =========================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook Verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// =========================
// RECEIVE WHATSAPP MESSAGE
// =========================
app.post("/webhook", async (req, res) => {

// ===============================
// BOT TIMING (9 PM - 8 AM)
// ===============================

const now = new Date();

// India Time
const indiaTime = new Date(
  now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
);

const hour = indiaTime.getHours();

// Allowed: 9 PM (21) to 8 AM (8)
const botActive = (hour >= 21 || hour < 8);

if (!botActive) {
    console.log("Bot is OFF (Day Time)");
    return; // Din me koi reply nahi bhejega
}

  
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;

    // =========================
    // HUMAN ACTIVE CHECK
    // =========================
    if (isHumanActive(from)) {
      console.log(`👤 Human active for ${from}, bot skipping.`);
      return res.sendStatus(200);
    }

    // =========================
    // NORMAL MESSAGE HANDLING
    // =========================
    let userMessage = "";
    switch (message.type) {
      case "text":
        userMessage = message.text.body;
        break;
     case "image":
  const imageId = message.image.id;
  const mediaResponse = await fetch(
    `https://graph.facebook.com/v23.0/${imageId}`,
    {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
    }
  );
  const mediaData = await mediaResponse.json();
  const imageUrl = mediaData.url;
  const imageDownload = await fetch(imageUrl, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
  });
  const imageBuffer = await imageDownload.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  const mimeType = message.image.mime_type || "image/jpeg";
  userMessage = { type: "image", base64: base64Image, mime: mimeType };
  break;
      case "video":
        userMessage = "The customer has sent a video. Acknowledge it politely and ask how Graphic Room Studio can help.";
        break;
      case "audio":
        userMessage = "The customer has sent a voice note. Acknowledge it politely and ask them to briefly explain their requirement if necessary.";
        break;
      case "document":
        userMessage = "The customer has shared a document. Acknowledge it politely and ask what they would like Graphic Room Studio to do.";
        break;
      default:
        userMessage = `The customer sent a ${message.type}. Respond naturally and continue the conversation.`;
    }

    console.log("📩", from, ":", userMessage);

    const assistantReply = await getReply(from, userMessage);
    if (!assistantReply || assistantReply.trim() === "") {
      console.log("⚠ Empty reply from AI");
      return res.sendStatus(200);
    }

    const response = await fetch(
      `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          text: { body: assistantReply }
        })
      }
    );

    const result = await response.json();
    console.log("✅ WhatsApp Reply Sent", result);
    return res.sendStatus(200);

  } catch (err) {
    console.error("❌ WEBHOOK ERROR", err);
    return res.sendStatus(500);
  }
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Graphic Room Studio AI Bot V2");
  console.log(`🌐 Running on Port ${PORT}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});
