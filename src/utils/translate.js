"use strict";
const fs = require("fs");
const path = require("path");
const deepl = require("deepl-node");
const inquirer = require("inquirer");
const logSymbols = require("log-symbols");
const ora = require("ora");

//remove CDATA tag
const removeTag = (text) => {
  const startTag = /\<\!\[CDATA\[\<color=.+\>/g;
  const endTag = "</color>]]>";
  return text.replaceAll(endTag, "").replaceAll(startTag, "");
};

//translate json
const translate = async ({
  projectRoot,
  sourceLangCode,
  targetLangCode,
  apiKey,
}) => {
  const translator = new deepl.Translator(apiKey);
  const spinner = ora("Translating...").start();
  //initialize language name
  const langList = require("./langList");
  const targetLangName = langList
    .find((v) => v.code === targetLangCode)
    .name.toLowerCase();
  const sourceLangName = langList
    .find((v) => v.code === sourceLangCode)
    .name.toLowerCase();

  //read json from file
  if (
    !fs.existsSync(
      path.join(projectRoot, `translations/${sourceLangName}.json`)
    )
  ) {
    spinner.stop();
    console.log(
      logSymbols.error,
      `File not found: ${path.join(
        projectRoot,
        `translations/${sourceLangName}.json`
      )}`
    );
    return;
  }
  const jsonString = fs.readFileSync(
    path.join(projectRoot, `translations/${sourceLangName}.json`),
    "utf-8"
  );

  //replace comments
  const replaceSpecificChar = (jsonString) =>
    jsonString.replaceAll(
      / \/\/((?=.*)(?=.*[:"\\«»]).+)[\n\r\r\n]/gi,
      (match) =>
        match.replaceAll('"', "##").replaceAll(":", "%%").replaceAll("\\", "&&")
    );
  const replaceComments = (jsonString) =>
    jsonString.replaceAll(/ \/\/(.*)[\n\r\r\n]/gi, '"@$1":"@$1",\n');

  //parse string to json
  const parseJsonString = (jsonString) => {
    try {
      return JSON.parse(replaceComments(replaceSpecificChar(jsonString)));
    } catch (error) {
      spinner.stop();
      console.log(logSymbols.error, error.message);
      console.log(logSymbols.info, "Removing the JSON comment-outs may work.");
      process.exit(1);
    }
  };

  const json = parseJsonString(jsonString) || {};

  //extract dictionary object
  const arrFromJson = Object.entries(json);
  const extractDictObj = (name, array) => {
    const index = array.findIndex((e) => e[0] === name);
    return array[index]?.[1];
  };

  const dialogueDict = extractDictObj("DialogueDictionary", arrFromJson) || {};
  const shipLogsDict = extractDictObj("ShipLogDictionary", arrFromJson) || {};
  const UIDict = extractDictObj("UIDictionary", arrFromJson) || {};
  const achievementDict =
    extractDictObj("AchievementTranslations", arrFromJson) || {};

  //generate text array
  const objToTextArr = (obj) => Object.entries(obj).map((v) => removeTag(v[1]));
  const dialogueArr = objToTextArr(dialogueDict || {});
  const shipLogsArr = objToTextArr(shipLogsDict || {});
  const UIArr = objToTextArr(UIDict || {});

  const achievementKeyArr = Object.keys(achievementDict || {});
  const achievementNameArr = Object.entries(achievementDict || {}).map(
    (v) => v[1].Name
  );
  const achievementDescArr = Object.entries(achievementDict || {}).map(
    (v) => v[1].Description
  );

  // translate text array
  const translateText = async (targetTextArray, targetLangCode) =>
    await translator.translateText(targetTextArray, null, targetLangCode);

  const genTranslatedTextArray = async (targetTextArray) => {
    const removeUndefined = (array) => array.filter((v) => v !== undefined);
    if (
      Array.isArray(targetTextArray) &&
      !removeUndefined(targetTextArray).length
    ) {
      return;
    }
    try {
      if (!targetTextArray.length) return null;
      return [...(await translateText(targetTextArray, targetLangCode))].map(
        (v) => v.text
      );
    } catch (error) {
      spinner.stop();
      console.log(logSymbols.error, error.message);
      process.exit(1);
    }
  };
  const translatedDialogueArr = await genTranslatedTextArray(dialogueArr);
  const translatedShipLogsArr = await genTranslatedTextArray(shipLogsArr);
  const translatedUIArr = await genTranslatedTextArray(UIArr);

  const translatedAchievementNameArr = await genTranslatedTextArray(
    achievementNameArr
  );
  const translatedAchievementDescArr = await genTranslatedTextArray(
    achievementDescArr
  );

  //generate translated dictionary object
  const genTranslatedDict = (dictObj, translatedTextArray) =>
    Object.entries(dictObj)
      .map((v, i) => [v[0], translatedTextArray?.[i]])
      .reduce((acc, curr) => {
        return { ...acc, [curr[0]]: curr[1] };
      }, {});
  const translatedDialogueDict = genTranslatedDict(
    dialogueDict,
    translatedDialogueArr
  );
  const translatedShipLogsDict = genTranslatedDict(
    shipLogsDict,
    translatedShipLogsArr
  );
  const translatedUIDict = genTranslatedDict(UIDict, translatedUIArr);

  const genTranslatedAchievementDict = (key, name, desc) =>
    key.reduce((acc, curr, index) => {
      return {
        ...acc,
        [curr]: { Name: name?.[index], Description: desc?.[index] },
      };
    }, {});
  const translatedAchievementDict = genTranslatedAchievementDict(
    achievementKeyArr,
    translatedAchievementNameArr,
    translatedAchievementDescArr
  );

  //restore comments
  const restoreComments = (jsonString) =>
    jsonString.replaceAll(/"@(.+)":.+,\n/g, "//$1\n");
  const restoreSpecificChar = (jsonString) =>
    jsonString.replaceAll(
      / \/\/((?=.*)(?=.*[##&&%%]).+)[\n\r\r\n]/gi,
      (match) =>
        match.replaceAll("##", '"').replaceAll("%%", ":").replaceAll("&&", "\\")
    );

  const translated = {
    $schema:
      "https://raw.githubusercontent.com/xen-42/outer-wilds-new-horizons/main/NewHorizons/Schemas/translation_schema.json",
    DialogueDictionary: translatedDialogueDict,
    ShipLogDictionary: translatedShipLogsDict,
    UIDictionary: translatedUIDict,
    AchievementTranslations: translatedAchievementDict,
  };

  //format
  const formattedTranslatedString = restoreSpecificChar(
    restoreComments(JSON.stringify(translated, null, 2))
  )
    .replaceAll('",\n    //', '",\n\n    //')
    .replaceAll("},\n", "},\n\n");

  //export JSON file
  //Confirm overwrite
  spinner.succeed("Translation completed");
  fs.writeFile(
    `${path.join(projectRoot, `translations/${targetLangName}.json`)}`,
    formattedTranslatedString,
    { flag: "wx" },
    (err) => {
      if (err) {
        inquirer
          .prompt([
            {
              type: "confirm",
              name: "overwrite",
              message: `${targetLangName}.json already exists. Overwrite?`,
            },
          ])
          .then((answer) => {
            if (!answer.overwrite) {
              console.log(logSymbols.error, "Not overwritten");
              return;
            }
            fs.writeFile(
              `${path.join(
                projectRoot,
                `translations/${targetLangName}.json`
              )}`,
              formattedTranslatedString,
              (err) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log(
                    logSymbols.success,
                    `Overwritten successfully: ${path.join(
                      projectRoot,
                      `translations/${targetLangName}.json`
                    )} `
                  );
                }
              }
            );
          });
      } else {
        console.log(
          logSymbols.success,
          `Exported successfully: ${path.join(
            projectRoot,
            `translations/${targetLangName}.json`
          )} `
        );
      }
    }
  );
};

module.exports = translate;
