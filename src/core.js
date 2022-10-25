"use strict";
const inquirer = require("inquirer");
const logSymbols = require("log-symbols");
const langList = require("./utils/langList");
const xml2json = require("./utils/xml2json");
const translate = require("./utils/translate");
const deleteApiKey = require("./utils/deleteApiKey");

const run = (apiKey) => {
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
        name: "projectRoot",
        message: "Project root (absolute path):",
        when: (answer) =>
          answer.process.includes("XML") || answer.process.includes("JSON"),
      },
      {
        type: "confirm",
        name: "deleteApiKey",
        message: "Are you sure?",
        when: (answer) => answer.process.includes("Delete"),
      },
    ])
    .then((answer) => {
      if (answer.process.includes("XML")) {
        xml2json({ projectRoot: answer.projectRoot });
      } else if (answer.process.includes("Translate")) {
        const projectRoot = answer.projectRoot.trim();
        inquirer
          .prompt([
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
          .then((answer) => {
            translate({
              projectRoot,
              sourceLangCode: langList.find((v) => v.name === answer.sourceLang)
                .code,
              targetLangCode: langList.find((v) => v.name === answer.targetLang)
                .code,
              apiKey,
            });
          });
      } else if (answer.deleteApiKey) {
        deleteApiKey();
        console.log(logSymbols.success, "API KEY deleted");
      }
    });
};

module.exports = run;
