const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connect() {
  if (!db) {
    await client.connect();
    db = client.db('whatsapp_bot');
  }
  return db;
}

async function addUserMessage(userId, message) {
  const database = await connect();
  await database.collection('conversations').updateOne(
    { userId },
    { 
      $push: { 
        messages: { 
          $each: [{ role: 'user', content: message, time: new Date() }],
          $slice: -20 
        } 
      },
      $set: { updatedAt: new Date() }
    },
    { upsert: true }
  );
}

async function addAssistantMessage(userId, message) {
  const database = await connect();
  await database.collection('conversations').updateOne(
    { userId },
    { 
      $push: { 
        messages: { 
          $each: [{ role: 'assistant', content: message, time: new Date() }],
          $slice: -20 
        } 
      },
      $set: { updatedAt: new Date() }
    },
    { upsert: true }
  );
}

async function getConversation(userId) {
  const database = await connect();
  const doc = await database.collection('conversations').findOne({ userId });
  return doc ? doc.messages : [];
}

async function clearConversation(userId) {
  const database = await connect();
  await database.collection('conversations').deleteOne({ userId });
}

module.exports = {
  addUserMessage,
  addAssistantMessage,
  getConversation,
  clearConversation
};
