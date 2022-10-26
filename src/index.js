#!/usr/bin/env node

"use strict";
const Conf = require("conf");
const config = new Conf();
const run = require("./core");

const isValid = config.get("isValid");
const apiKey = config.get("apiKey");

run({ apiKey, isValid });
