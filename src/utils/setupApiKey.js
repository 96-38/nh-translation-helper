"use strict";
const inquirer = require("inquirer");
const logSymbols = require("log-symbols");
const checkApiKey = require("./checkApiKey");
const saveValidApiKey = require("./saveValidApiKey");
const langList = require("./langList");
const translate = require("./translate");

const setupApiKey = async ({ apiKey }) => {
  const isValid = await checkApiKey(apiKey);
  if (isValid) {
    saveValidApiKey(apiKey);
    console.log(logSymbols.success, "API key saved");
    inquirer
      .prompt([
        {
          type: "input",
          name: "projectRoot",
          message: "Project root (absolute path):",
        },
        {
          type: "list",
          name: "sourceLang",
          message: "Select source language:",
          choices: langList.map((v) => v.name),
        },
        {
          type: "list",
          name: "targetLang",
          message: "Select target language:",
          choices: langList.map((v) => v.name),
        },
      ])
      .then(async (answer) => {
        translate({
          projectRoot: answer.projectRoot.trim(),
          sourceLangCode: langList.find((v) => v.name === answer.sourceLang)
            .code,
          targetLangCode: langList.find((v) => v.name === answer.targetLang)
            .code,
          apiKey,
        });
      });
  } else {
    inquirer
      .prompt([
        {
          type: "input",
          name: "apiKey",
          message: "Set a valid DeepL API key (Free or Pro):",
          prefix: logSymbols.error,
        },
      ])
      .then(async (answer) => {
        await setupApiKey({
          apiKey: answer.apiKey || "empty",
        });
      });
  }
};

module.exports = setupApiKey;
