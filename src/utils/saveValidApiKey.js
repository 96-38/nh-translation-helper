"use strict";
const Conf = require("conf");
const config = new Conf();

const saveValidApiKey = (apiKey) => {
  config.set("apiKey", apiKey);
  config.set("isValid", true);
};

module.exports = saveValidApiKey;
