// humanActive.js
const lastHumanReply = {};

function setHumanActive(userId) {
  lastHumanReply[userId] = Date.now();
}

function isHumanActive(userId, timeoutMinutes = 10) {
  const last = lastHumanReply[userId];
  if (!last) return false;
  const diff = (Date.now() - last) / 1000 / 60;
  return diff < timeoutMinutes;
}

module.exports = { setHumanActive, isHumanActive };
