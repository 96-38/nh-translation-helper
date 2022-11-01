"use strict";
const fs = require("fs");
const path = require("path");
const ora = require("ora");
const deepl = require("deepl-node");
const logSymbols = require("log-symbols");
const confirmFileOverwite = require("./confirmFileOverwrite");

const removeTag = (text) => {
  const startTag = /\<\!\[CDATA\[\<color=.+\>/g;
  const endTag = "</color>]]>";
  return text.replaceAll(endTag, "").replaceAll(startTag, "");
};

const translate = async ({
  projectRoot,
  sourceLangCode,
  targetLangCode,
  apiKey,
}) => {
  const translator = new deepl.Translator(apiKey);
  const spinner = ora("Translating...").start();

  const langList = require("./langList");
  const targetLangName = langList
    .find((v) => v.code === targetLangCode)
    .name.toLowerCase();
  const sourceLangName = langList
    .find((v) => v.code === sourceLangCode)
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
