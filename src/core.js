"use strict";
const inquirer = require("inquirer");
const logSymbols = require("log-symbols");
const langList = require("./utils/langList");
const xml2json = require("./utils/xml2json");
const translate = require("./utils/translate");
const setupApiKey = require("./utils/setupApiKey");
const deleteApiKey = require("./utils/deleteApiKey");

const run = ({ apiKey, isValid = false }) => {
  inquirer
    .prompt([
      {
        type: "list",
        name: "process",
        message: "Which would you like to do?",
        choices: [
          "Generate english.json from XML files",
          "Translate JSON (DeepL API key required)",
          `${logSymbols.warning} Delete saved API key`,
        ],
      },
      {
        type: "input",
        name: "apiKey",
        message: "DeepL API key (saved locally):",
        when: (answer) =>
          answer.process.includes("Translate") && isValid === false,
      },
      {
        type: "input",
        name: "projectRoot",
        message: "Project root (absolute path):",
        when: (answer) =>
          answer.process.includes("XML") ||
          (answer.process.includes("Translate") && isValid === true),
      },
      {
        type: "confirm",
        name: "deleteApiKey",
        message: "Are you sure?",
        when: (answer) => answer.process.includes("Delete"),
      },
      {
        type: "list",
        name: "sourceLang",
        message: "Select source language:",
        choices: langList.map((v) => v.name),
        when: (answer) =>
          answer.process.includes("Translate") && isValid === true,
      },
      {
        type: "list",
        name: "targetLang",
        message: "Select target language:",
        choices: langList.map((v) => v.name),
        when: (answer) =>
          answer.process.includes("Translate") && isValid === true,
      },
    ])
    .then(async (answer) => {
      //XML to JSON
      if (answer.process.includes("XML")) {
        xml2json({ projectRoot: answer.projectRoot.trim() });
        //Translate JSON
      } else if (answer.process.includes("Translate")) {
        if (isValid === false) {
          await setupApiKey({
            apiKey: answer.apiKey.trim() || "empty",
          });
        } else {
          translate({
            projectRoot: answer.projectRoot.trim(),
            sourceLangCode: langList.find((v) => v.name === answer.sourceLang)
              .code,
            targetLangCode: langList.find((v) => v.name === answer.targetLang)
              .code,
            apiKey,
          });
        }
      } else if (answer.deleteApiKey) {
        deleteApiKey();
        console.log(logSymbols.success, "API KEY deleted");
      }
    });
};

module.exports = run;
