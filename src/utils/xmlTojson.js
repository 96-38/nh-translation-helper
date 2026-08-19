"use strict";
const fs = require("fs");
const path = require("path");
const parser = require("xml2json");
const glob = require("glob");
const normalize = require("normalize-path");
const logSymbols = require("log-symbols");
const confirmFileOverwite = require("./confirmFileOverwrite");

const xmlTojson = ({ projectRoot }) => {
  if (!fs.existsSync(path.join(projectRoot))) {
    console.log(logSymbols.error, "Path of the project root is invalid.");
    return;
  }

  const fileList = glob
    //normalize path for windows (glob only use forward-slashes)
    .sync(normalize(path.join(projectRoot, "**/*.xml")))
    .map((v) => normalize(v));

  console.log("File List:", fileList); // Debugging line

  if (Array.isArray(fileList) && !fileList.length) {
    console.log(logSymbols.error, "XML file not found");
    process.exit(1);
  }

  const parseOptions = {
    object: true,
    arrayNotation: true,
    preserveCdataTag: true,
  };

  const parseXmlTextDirToArr = (filePath) => {
    const xml = fs.readFileSync(filePath, "utf-8");
    const textArr = [
      ...new Set(
        parser
          .toJson(xml, parseOptions)
          .NomaiObject[0].TextBlock.flatMap((v) => v.Text)
      ),
    ];
    return textArr;
  };

  const parseXmlDialogueDirToArr = (filePath) => {
    const xml = fs.readFileSync(filePath, "utf-8");
    const dialogueArr = [
      ...new Set(
        parser
          .toJson(xml, parseOptions)
          .DialogueTree[0].DialogueNode.flatMap((v) =>
            v.DialogueOptionsList && v.Dialogue
              ? [
                  v.Dialogue.flatMap((v) => v.Page),
                  v.DialogueOptionsList.flatMap((v) => v.DialogueOption
                  ? v.DialogueOption.flatMap((v) => v.Text)
                  : ""
                  ),
                ]
              : v.DialogueOptionsList
              ? v.DialogueOptionsList.flatMap((v) => v.DialogueOption
                ? v.DialogueOption.flatMap((v) => v.Text)
                : ""
              )
              : v.Dialogue
              ? v.Dialogue.flatMap((v) => v.Page)
              : ""
          )
          .flat(Infinity)
      ),
    ];
    return dialogueArr;
  };

  const parseEntry = (entry) => {
    const result = [];

    // Extract the name
    if (entry.Name) {
      result.push(entry.Name);
    }

    // Extract RumorFact
    if (entry.RumorFact) {
      entry.RumorFact.forEach((fact) => {
        result.push(fact.RumorName, fact.Text);
      });
    }

    // Extract ExploreFact
    if (entry.ExploreFact) {
      entry.ExploreFact.forEach((fact) => {
        result.push(fact.Text);
      });
    }

    // Recursively parse nested entries
    if (entry.Entry) {
      entry.Entry.forEach((nestedEntry) => {
        result.push(...parseEntry(nestedEntry));
      });
    }

    return result;
  };

  const parseXmlShipLogsDirToArr = (filePath) => {
    const xml = fs.readFileSync(filePath, "utf-8");
    const json = parser.toJson(xml, parseOptions);
    const shipLogsArr = [
      ...new Set(
        json.AstroObjectEntry[0].Entry.flatMap((v) => parseEntry(v))
      ),
    ];
    return shipLogsArr;
  };

  const getFileName = (filePath) => path.basename(filePath);
  const allDialogueArr = [];
  const allShipLogsArr = [];

  //extract text from xml to array
  try {
    fileList.forEach((filePath) => {
      const xml = fs.readFileSync(filePath, "utf-8");
      const xmlRootElement = Object.keys(parser.toJson(xml, parseOptions))[0];

      const fileName = getFileName(filePath);
      if (xmlRootElement === "AstroObjectEntry") {
        allShipLogsArr.push(`//${fileName}@`);
        allShipLogsArr.push(parseXmlShipLogsDirToArr(filePath));
      } else if (xmlRootElement === "DialogueTree") {
        allDialogueArr.push(`//${fileName}@`);
        allDialogueArr.push(parseXmlDialogueDirToArr(filePath));
      } else if (xmlRootElement === "NomaiObject") {
        allDialogueArr.push(`//${fileName}@`);
        allDialogueArr.push(parseXmlTextDirToArr(filePath));
      }
    });
  } catch (error) {
    console.log(logSymbols.error, error.message);
    process.exit(1);
  }

  //convert line break to Windows style
  const convertLineBreak = (arr) =>
    arr.map((vs) =>
      Array.isArray(vs)
        ? vs.map((v) => String(v).replaceAll("\n", "\r\n")) // Ensure v is a string
        : String(vs).replaceAll("\n", "\r\n") // Ensure vs is a string
    );

  const convertedAllDialogueArr = convertLineBreak(allDialogueArr);
  const convertedAllShipLogsArr = convertLineBreak(allShipLogsArr);

  //convert array to obj
  const arrToObj = (arr) =>
    arr.flat().reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: curr,
      };
    }, {});

  const dialogueObj = arrToObj(convertedAllDialogueArr);
  const shipLogsObj = arrToObj(convertedAllShipLogsArr);

  //format json
  const formattedString = JSON.stringify(
    {
      $schema:
        "https://raw.githubusercontent.com/xen-42/outer-wilds-new-horizons/main/NewHorizons/Schemas/translation_schema.json",
      DialogueDictionary: dialogueObj,
      ShipLogDictionary: shipLogsObj,
      UIDictionary: { "Please add manually.": "Please add manually." },
      AchievementTranslations: {
        "Please add manually.": {},
      },
    },
    null,
    2
  )
    //adjust line break
    .replaceAll('",\n    "//', '",\n\n    "//')
    .replaceAll("},\n", "},\n\n")
    //restore comment
    .replaceAll('"//', "//")
    .replaceAll(/.xml@.+/g, "");

  const exportJSON = () => {
    fs.mkdir(path.join(projectRoot, "translations"), { recursive: true }, (err) => {
      if (err) {
        console.log(logSymbols.error, "Failed to create translations directory.");
        return;
      }
    });
    fs.writeFile(
      path.join(projectRoot, "translations/english.json"),
      formattedString,
      { flag: "wx" },
      (err) => {
        if (!err) {
          console.log(
            logSymbols.success,
            `Exported successfully: ${path.join(
              projectRoot,
              "translations/english.json"
            )} `
          );
          return;
        }
        confirmFileOverwite({
          projectRoot,
          file: formattedString,
          langName: "english",
        });
      }
    );
  };

  exportJSON();
};

module.exports = xmlTojson;
