"use strict";
const fs = require("fs");
const path = require("path");
const XML = require("pixl-xml");
const glob = require("glob");
const normalize = require("normalize-path");
const logSymbols = require("log-symbols");
const confirmFileOverwite = require("./confirmFileOverwrite");

const parseXml = (filePath) => {
  //CDATA Tags are removed in the process of converting XML to JSON
  const restoreCdataTag = (array) =>
    array
      .map((v) => v.replaceAll("<color", "<![CDATA[<color"))
      .map((v) => v.replaceAll("</color>", "</color>]]>"));

  const parseTextDirToArr = (filePath) => {
    const xml = fs.readFileSync(filePath, "utf-8");
    const textArr = [
      ...new Set(
        restoreCdataTag(
          XML.parse(xml, {
            preserveDocumentNode: true,
            forceArrays: true,
          }).NomaiObject.TextBlock.flatMap((v) => v.Text)
        )
      ),
    ];
    return textArr;
  };

  const parseDialogueDirToArr = (filePath) => {
    const xml = fs.readFileSync(filePath, "utf-8");
    const dialogueArr = [
      ...new Set(
        XML.parse(xml, {
          preserveDocumentNode: true,
          forceArrays: true,
        })
          .DialogueTree.DialogueNode.flatMap((v) =>
            v.DialogueOptionsList
              ? [
                  restoreCdataTag(v.Dialogue.flatMap((v) => v.Page)),
                  restoreCdataTag(
                    v.DialogueOptionsList.flatMap((v) =>
                      v.DialogueOption.flatMap((v) => v.Text)
                    )
                  ),
                ]
              : v.Dialogue
              ? restoreCdataTag(v.Dialogue.flatMap((v) => v.Page))
              : ""
          )
          .flat(Infinity)
      ),
    ];
    return dialogueArr;
  };

  const parseShipLogsDirToArr = (filePath) => {
    const xml = fs.readFileSync(filePath, "utf-8");
    const shipLogsArr = [
      ...new Set(
        XML.parse(xml, {
          preserveDocumentNode: true,
          forceArrays: true,
        })
          .AstroObjectEntry.Entry.flatMap((v) =>
            v.RumorFact && v.ExploreFact
              ? [
                  v.Name,
                  restoreCdataTag(
                    v.RumorFact.flatMap((v) => [v.RumorName, v.Text]).flat()
                  ),
                  restoreCdataTag(v.ExploreFact.flatMap((v) => v.Text)),
                ]
              : v.ExploreFact
              ? [v.Name, restoreCdataTag(v.ExploreFact.flatMap((v) => v.Text))]
              : [
                  v.Name,
                  restoreCdataTag(
                    v.RumorFact.flatMap((v) => [v.RumorName, v.Text]).flat()
                  ),
                ]
          )
          .flat(Infinity)
      ),
    ];
    return shipLogsArr;
  };

  if (filePath.includes("/Dialogue/")) {
    return parseDialogueDirToArr;
  }
  if (filePath.includes("/Text/")) {
    return parseTextDirToArr;
  }
  if (filePath.includes("/ShipLogs/")) {
    return parseShipLogsDirToArr;
  }
};

const xml2json = ({ projectRoot }) => {
  if (!fs.existsSync(path.join(projectRoot, "planets"))) {
    console.log(logSymbols.error, "Path of the project root is invalid.");
    return;
  }

  const getFileName = (filePath) => path.basename(filePath);
  const allDialogueArr = [];
  const allShipLogsArr = [];
  const fileList = glob
    .sync(normalize(path.join(projectRoot, "planets/**/*.xml")))
    .map((v) => normalize(v));

  if (Array.isArray(fileList) && !fileList.length) {
    console.log(logSymbols.error, "XML file not found");
    process.exit(1);
  }

  try {
    fileList.forEach((filePath) => {
      const fileName = getFileName(filePath);
      const parseXmlToArr = parseXml(filePath);
      if (filePath.includes("/Dialogue/")) {
        allDialogueArr.push(`//${fileName}@`);
        allDialogueArr.push(parseXmlToArr(filePath));
      } else if (filePath.includes("/Text/")) {
        allDialogueArr.push(`//${fileName}@`);
        allDialogueArr.push(parseXmlToArr(filePath));
      } else if (filePath.includes("/ShipLogs/")) {
        allShipLogsArr.push(`//${fileName}@`);
        allShipLogsArr.push(parseXmlToArr(filePath));
      }
    });
  } catch (error) {
    console.log(logSymbols.error, error.message);
    process.exit(1);
  }

  const convertArrToObj = (arr) =>
    arr.flat().reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: curr,
      };
    }, {});

  const dialogueObj = convertArrToObj(allDialogueArr);
  const shipLogsObj = convertArrToObj(allShipLogsArr);

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
    .replaceAll(/.xml@.+/g, "")
    //remove white space after closing tag
    .replaceAll(/<\/color>]]> ([.,!?])/g, "</color>]]>$1");

  const exportJSON = () => {
    fs.mkdir(path.join(projectRoot, "translations"), (err) => {
      return;
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

module.exports = xml2json;
