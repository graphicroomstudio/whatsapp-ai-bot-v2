require("dotenv").config();

const express = require("express");
const { getReply } = require("./engine/aiEngine");

const app = express();

app.use(express.json({ limit: "20mb" }));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

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

    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;

    let userMessage = "";

    switch (message.type) {

      case "text":
        userMessage = message.text.body;
        break;

      case "image":
        userMessage =
          "The customer has sent an image. Acknowledge it politely and ask how Graphic Room Studio can help.";
        break;

      case "video":
        userMessage =
          "The customer has sent a video. Acknowledge it politely and ask how Graphic Room Studio can help.";
        break;

      case "audio":
        userMessage =
          "The customer has sent a voice note. Acknowledge it politely and ask them to briefly explain their requirement if necessary.";
        break;

      case "document":
        userMessage =
          "The customer has shared a document. Acknowledge it politely and ask what they would like Graphic Room Studio to do.";
        break;

      default:
        userMessage =
          `The customer sent a ${message.type}. Respond naturally and continue the conversation.`;

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
          text: {
            body: assistantReply
          }
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
