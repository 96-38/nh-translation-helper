"use strict";
const deepl = require("deepl-node");

const checkApiKey = async (apiKey = "empty") => {
  const translator = new deepl.Translator(apiKey);
  //try translating to determine if API KEY is valid
  try {
    await translator.translateText("Hello.", null, "ja");
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = checkApiKey;
