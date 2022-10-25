"use strict";
const deepl = require("deepl-node");
const inquirer = require("inquirer");
const logSymbols = require("log-symbols");
const Conf = require("conf");
const config = new Conf();
const chalk = require("chalk");

const checkApiKey = (callback) => {
  const apiKey = config.get("apiKey") || "initialValue";
  const saveApiKey = (apiKey) => config.set("apiKey", apiKey);

  const translator = new deepl.Translator(apiKey);
  //try translating to determine if API KEY is valid
  const tryTranslate = async (callback) => {
    try {
      await translator.translateText("Hello.", null, "ja");
      config.set("isValid", true);
      console.log(chalk.bold("Restarting..."));
      console.clear();
      //When the key is valid, move to the main process.
      callback(apiKey);
    } catch (error) {
      //API KEY is invalid
      config.set("isValid", false);
      if (apiKey === "initialValue") {
        console.log(logSymbols.info, chalk.bold("Initial Setup"));
      } else {
        console.log(
          logSymbols.error,
          "Set a valid DeepL API key (Free or Pro)"
        );
      }
      inquirer
        .prompt([
          {
            type: "input",
            name: "apiKey",
            message: "DeepL API key (saved locally):",
          },
        ])
        .then((answer) => {
          saveApiKey(answer.apiKey.trim() || "invalid");
          checkApiKey(callback);
          console.log(logSymbols.success, "API key saved");
        });
    }
  };
  tryTranslate(callback);
};

module.exports = checkApiKey;
