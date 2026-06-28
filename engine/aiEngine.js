const OpenAI = require("openai");

const { loadAllBrain } = require("./brainLoader");
const buildPrompt = require("./promptBuilder");
const memory = require("./memory");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getReply(userId, userMessage) {

  try {

    // Save customer message
    memory.addUserMessage(userId, userMessage);

    // Load Business Brain
    const brain = loadAllBrain();

    // Load Previous Conversation
    const conversation = memory.getConversation(userId);

    // System Prompt
    const systemPrompt = buildPrompt(brain);

    // Prepare Messages
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...conversation
    ];

    // Ask GPT
    const response = await client.chat.completions.create({
      model: "gpt-5.5",
      messages,
      temperature: 0.7,
max_completion_tokens: 500    });

    const reply =
      response.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response.";

    // Save AI Reply
    memory.addAssistantMessage(userId, reply);

    return reply;

  } catch (err) {

    console.error("AI Engine Error");

    console.error(err);

    return "I'm sorry. Something went wrong while processing your request. Please try again in a moment.";

  }

}

module.exports = {
  getReply
};
