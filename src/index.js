#!/usr/bin/env node

"use strict";
const Conf = require("conf");
const config = new Conf();
const checkApiKey = require("./utils/checkApiKey");
const run = require("./core");

const isValid = config.get("isValid");
if (isValid) {
  const apiKey = config.get("apiKey");
  run(apiKey);
} else {
  checkApiKey(run);
}
