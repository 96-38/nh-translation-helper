"use strict";
const Conf = require("conf");
const config = new Conf();

const deleteApiKey = () => {
  config.delete("isValid");
  config.delete("apiKey");
};

module.exports = deleteApiKey;
