require("dotenv").config();
const express = require("express");
const { getReply } = require("./engine/aiEngine");
const app = express();
app.use(express.json({ limit: "20mb" }));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// =========================
// HANDOVER / PAUSE SYSTEM
// =========================
const pausedUsers = new Set(); // In-memory (resets on restart, theek hai)

// =========================
// HOME
// =========================
app.get("/", (req, res) => {
  res.send("Graphic Room Studio WhatsApp AI Bot V2 🚀");
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
  console.log("❌ Webhook Verification Failed");
  return res.sendStatus(403);
});

// =========================
// RECEIVE WHATSAPP MESSAGE
// =========================
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    // ✅ Ignore status updates (delivered, read receipts)
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const myNumber = process.env.MY_NUMBER; // Tumhara apna WhatsApp number

    // =========================
    // ADMIN COMMANDS (Tumhare apne messages)
    // =========================
    if (from === myNumber && message.type === "text") {
      const text = message.text.body.trim().toLowerCase();

      if (text.startsWith("pause ")) {
        const targetNumber = text.replace("pause ", "").trim();
        pausedUsers.add(targetNumber);
        console.log(`⏸ Bot paused for ${targetNumber}`);
        return res.sendStatus(200);
      }

      if (text.startsWith("resume ")) {
        const targetNumber = text.replace("resume ", "").trim();
        pausedUsers.delete(targetNumber);
        console.log(`▶️ Bot resumed for ${targetNumber}`);
        return res.sendStatus(200);
      }

      if (text === "paused list") {
        console.log("⏸ Paused users:", [...pausedUsers]);
        return res.sendStatus(200);
      }
    }

    // =========================
    // BOT PAUSED CHECK
    // =========================
    if (pausedUsers.has(from)) {
      console.log(`⏸ Bot is paused for ${from}, skipping.`);
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
        userMessage = "The customer has sent an image. Acknowledge it politely and ask how Graphic Room Studio can help.";
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

    // Ask AI
    const assistantReply = await getReply(from, userMessage);
    if (!assistantReply || assistantReply.trim() === "") {
      console.log("⚠ Empty reply from AI");
      return res.sendStatus(200);
    }

    // Send WhatsApp Reply
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
    console.log("✅ WhatsApp Reply Sent");
    console.log(result);
    return res.sendStatus(200);

  } catch (err) {
    console.error("❌ WEBHOOK ERROR");
    console.error(err);
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
const { setHumanActive, isHumanActive } = require("./humanActive");

// Webhook mein — bot reply karne se pehle ye check karo:
if (isHumanActive(from)) {
  console.log(`👤 Human active for ${from}, bot skipping.`);
  return res.sendStatus(200);
});
