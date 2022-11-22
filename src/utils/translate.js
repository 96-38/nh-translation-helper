"use strict";
const fs = require("fs");
const path = require("path");
const ora = require("ora");
const deepl = require("deepl-node");
const logSymbols = require("log-symbols");
const confirmFileOverwite = require("./confirmFileOverwrite");

const removeTag = (text) => {
  const closingColorTagCL = "<![CDATA[</color>]]>";
  const closingColorTagCU = "<![CDATA[</Color>]]>";
  const openingColorTagCL = /\<\!\[CDATA\[\<color=[a-z#0-9]+\>\]\]\>/g;
  const openingColorTagCU = /\<\!\[CDATA\[\<Color=[a-z#0-9]+\>\]\]\>/g;

  const closingColorTagL = "</color>]]>";
  const closingColorTagU = "</Color>]]>";
  const openingColorTagL = /\<\!\[CDATA\[\<color=[a-z#0-9]+\>/g;
  const openingColorTagU = /\<\!\[CDATA\[\<Color=[a-z#0-9]+\>/g;

  const closingTagC = "]]>";
  const openingTagC = "<![CDATA[";

  //do not change order
  return text
    .replaceAll(closingColorTagCL, "")
    .replaceAll(closingColorTagCU, "")
    .replaceAll(openingColorTagCL, "")
    .replaceAll(openingColorTagCU, "")
    .replaceAll(closingColorTagL, "")
    .replaceAll(closingColorTagU, "")
    .replaceAll(openingColorTagL, "")
    .replaceAll(openingColorTagU, "")
    .replaceAll(closingTagC, "")
    .replaceAll(openingTagC, "");
};

const translate = async ({
  projectRoot,
  sourceLangCode,
  targetLangCode,
  apiKey,
}) => {
  const spinner = ora("Translating...").start();

  const langList = require("./langList");
  const targetLangName = langList
    .find((lang) => lang.code === targetLangCode)
    .name.toLowerCase();
  const sourceLangName = langList
    .find((lang) => lang.code === sourceLangCode)
    .name.toLowerCase();

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

  const replaceSpecificChar = (jsonString) =>
    jsonString.replaceAll(
      / \/\/((?=.*)(?=.*[:"\\«»]).+)[\n\r\r\n]/gi,
      (match) =>
        //Replace symbols that cause parsing errors
        match.replaceAll('"', "##").replaceAll(":", "%%").replaceAll("\\", "&&")
    );

  const replaceComments = (jsonString) =>
    jsonString.replaceAll(/ \/\/(.*)[\n\r\r\n]/gi, (match, p1) => {
      const trimmed = p1.trim();
      return `"@${trimmed}":"@${trimmed}",\n`;
    });

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
  const extractDictObj = (name, array) => {
    const index = array.findIndex((e) => e[0] === name);
    return array[index]?.[1] || {};
  };

  const arrFromJson = Object.entries(json);
  const dialogueDict = extractDictObj("DialogueDictionary", arrFromJson);
  const shipLogsDict = extractDictObj("ShipLogDictionary", arrFromJson);
  const UIDict = extractDictObj("UIDictionary", arrFromJson);
  const achievementDict = extractDictObj(
    "AchievementTranslations",
    arrFromJson
  );

  //generate text array
  const objToTextArr = (obj) =>
    Object.entries(obj).map((property) => removeTag(property[1]));

  const dialogueArr = objToTextArr(dialogueDict);
  const shipLogsArr = objToTextArr(shipLogsDict);
  const UIArr = objToTextArr(UIDict);
  const achievementKeyArr = Object.keys(achievementDict);
  const achievementNameArr = Object.entries(achievementDict).map(
    (property) => property[1].Name || "Please add manually."
  );
  const achievementDescArr = Object.entries(achievementDict).map(
    (property) => property[1].Description || "Please add manually."
  );

  //translate text array
  const translator = new deepl.Translator(apiKey);
  const translateTextArray = async (targetTextArray, targetLangCode) =>
    //If the second argument is set to null, source language is automatically detected.
    await translator.translateText(targetTextArray, null, targetLangCode);

  const generateTranslatedTextArray = async (targetTextArray) => {
    const isEmptyArray = (targetTextArray) =>
      Array.isArray(targetTextArray) && !targetTextArray.length;

    if (isEmptyArray(targetTextArray)) return [];
    try {
      return [
        ...(await translateTextArray(targetTextArray, targetLangCode)),
      ].map((response) => response.text);
    } catch (error) {
      spinner.stop();
      console.log(logSymbols.error, error.message);
      process.exit(1);
    }
  };

  const translatedDialogueArr = await generateTranslatedTextArray(dialogueArr);
  const translatedShipLogsArr = await generateTranslatedTextArray(shipLogsArr);
  const translatedUIArr = await generateTranslatedTextArray(UIArr);

  const translatedAchievementNameArr = await generateTranslatedTextArray(
    achievementNameArr
  );
  const translatedAchievementDescArr = await generateTranslatedTextArray(
    achievementDescArr
  );

  //generate translated dictionary object
  const generateTranslatedDict = (dictObj, translatedTextArray) =>
    translatedTextArray.length
      ? Object.entries(dictObj)
          .map((property, index) => [property[0], translatedTextArray[index]])
          .reduce((acc, curr) => {
            return { ...acc, [curr[0]]: curr[1] };
          }, {})
      : {};

  const translatedDialogueDict = generateTranslatedDict(
    dialogueDict,
    translatedDialogueArr
  );
  const translatedShipLogsDict = generateTranslatedDict(
    shipLogsDict,
    translatedShipLogsArr
  );
  const translatedUIDict = generateTranslatedDict(UIDict, translatedUIArr);

  const generateTranslatedAchievementDict = (key, name, desc) =>
    key.reduce((acc, curr, index) => {
      return {
        ...acc,
        [curr]: { Name: name?.[index], Description: desc?.[index] },
      };
    }, {});

  const translatedAchievementDict = generateTranslatedAchievementDict(
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
    //adjust line break
    .replaceAll('",\n    //', '",\n\n    //')
    .replaceAll("},\n", "},\n\n");

  //export JSON file
  spinner.succeed("Translation completed");
  fs.writeFile(
    `${path.join(projectRoot, `translations/${targetLangName}.json`)}`,
    formattedTranslatedString,
    { flag: "wx" },
    (err) => {
      if (err) {
        confirmFileOverwite({
          projectRoot,
          file: formattedTranslatedString,
          langName: targetLangName,
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
