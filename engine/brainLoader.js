const fs = require("fs");
const path = require("path");

function loadJSON(fileName) {
  try {
    const filePath = path.join(__dirname, "..", "brain", fileName);
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`❌ Error loading ${fileName}`);
    console.error(err);
    return {};
  }
}

function loadAllBrain() {
  return {
    company: loadJSON("company.json"),
    services: loadJSON("services.json"),
    pricing: loadJSON("pricing.json"),
    portfolio: loadJSON("portfolio.json"),
    faq: loadJSON("faq.json"),
    process: loadJSON("process.json")
  };
}

module.exports = {
  loadAllBrain
};
