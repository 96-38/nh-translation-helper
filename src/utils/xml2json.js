"use strict";
const fs = require("fs");
const path = require("path");
const XML = require("pixl-xml");
const glob = require("glob");
const normalize = require("normalize-path");
const logSymbols = require("log-symbols");
const confirmFileOverwite = require("./confirmFileOverwrite");

const xml2json = ({ projectRoot }) => {
  if (!fs.existsSync(path.join(projectRoot, "planets"))) {
    console.log(logSymbols.error, "Path of the project root is invalid.");
    return;
  }

  const fileList = glob
    //normalize path for windows (glob only use forward-slashes)
    .sync(normalize(path.join(projectRoot, "planets/**/*.xml")))
    .map((v) => normalize(v));

  if (Array.isArray(fileList) && !fileList.length) {
    console.log(logSymbols.error, "XML file not found");
    process.exit(1);
  }

  //CDATA Tags are removed in the process of converting XML to JSON
  const restoreCdataTag = (textArr) =>
    textArr
      .map((text) => text.replaceAll("<color", "<![CDATA[<color"))
      .map((text) => text.replaceAll("</color>", "</color>]]>"))
      .map((text) => text.replaceAll("<Color", "<![CDATA[<Color"))
      .map((text) => text.replaceAll("</Color>", "</Color>]]>"));

  const restoreCdataTagWithClosingTag = (textArr) =>
    textArr
      .map((text) =>
        text.replaceAll(/<color=([a-z#0-9]+)>/g, "<![CDATA[<color=$1>]]>")
      )
      .map((text) =>
        text.replaceAll(/<Color=([a-z#0-9]+)>/g, "<![CDATA[<Color=$1>]]>")
      )
      .map((text) => text.replaceAll("</color>", "<![CDATA[</color>]]>"))
      .map((text) => text.replaceAll("</Color>", "<![CDATA[</Color>]]>"))
      //remove spaces before and after text enclosed in tags
      .map((text) =>
        text.replaceAll(/=([a-z#0-9]+)>]]> ([^>]+) <!/g, "=$1>]]>$2<!")
      );

  const parseXmlTextDirToArr = (filePath, restoreCdataTag) => {
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

  const parseXmlDialogueDirToArr = (filePath, restoreCdataTag) => {
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

  const parseXmlShipLogsDirToArr = (filePath, restoreCdataTag) => {
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

  const getFileName = (filePath) => path.basename(filePath);
  const xmlToArray = (filePath, xmlRootElement, restoreCdataTag) => {
    const fileName = getFileName(filePath);
    if (xmlRootElement === "AstroObjectEntry") {
      allShipLogsArr.push(`//${fileName}@`);
      allShipLogsArr.push(parseXmlShipLogsDirToArr(filePath, restoreCdataTag));
    } else if (xmlRootElement === "DialogueTree") {
      allDialogueArr.push(`//${fileName}@`);
      allDialogueArr.push(parseXmlDialogueDirToArr(filePath, restoreCdataTag));
    } else if (xmlRootElement === "NomaiObject") {
      allDialogueArr.push(`//${fileName}@`);
      allDialogueArr.push(parseXmlTextDirToArr(filePath, restoreCdataTag));
    }
  };
  const allDialogueArr = [];
  const allShipLogsArr = [];

  //extract text from xml to array
  try {
    fileList.forEach((filePath) => {
      const xml = fs.readFileSync(filePath, "utf-8");
      const hasCdataTagWithClosingTag =
        xml.includes("<![CDATA[</Color>]]>") ||
        xml.includes("<![CDATA[</color>]]>");
      const xmlRootElement = Object.keys(
        XML.parse(xml, {
          preserveDocumentNode: true,
          forceArrays: true,
        })
      )[0];

      if (hasCdataTagWithClosingTag) {
        xmlToArray(filePath, xmlRootElement, restoreCdataTagWithClosingTag);
      } else {
        xmlToArray(filePath, xmlRootElement, restoreCdataTag);
      }
    });
  } catch (error) {
    console.log(logSymbols.error, error.message);
    process.exit(1);
  }

  //convert array to obj
  const arrToObj = (arr) =>
    arr.flat().reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: curr,
      };
    }, {});

  const dialogueObj = arrToObj(allDialogueArr);
  const shipLogsObj = arrToObj(allShipLogsArr);

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
    .replaceAll(/.xml@.+/g, "")
    //remove white space after closing tag
    .replaceAll(/<\/color>]]> ([.,!?])/g, "</color>]]>$1")
    .replaceAll(/<\/Color>]]> ([.,!?])/g, "</Color>]]>$1");

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
