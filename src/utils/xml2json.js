"use strict";
//Built-in Modules
const fs = require("fs");
const path = require("path");
//Need to install with npm
const XML = require("pixl-xml");
const glob = require("glob");
const inquirer = require("inquirer");
const logSymbols = require("log-symbols");
const normalize = require("normalize-path");

//Restore CDATA Tag
//(CDATA Tags are deleted in the process of converting XML to JSON)
const restoreTag = (array) =>
  array
    .map((v) => v.replaceAll("<color", "<![CDATA[<color"))
    .map((v) => v.replaceAll("</color>", "</color>]]>"));

//Parse XML in Text Directory
const parseText = (path) => {
  const xml = fs.readFileSync(path, "utf-8");
  const text = [
    ...new Set(
      restoreTag(
        XML.parse(xml, {
          preserveDocumentNode: true,
          forceArrays: true,
        })
          .NomaiObject.TextBlock.map((v) => v.Text)
          .flat()
      )
    ),
  ];
  return text;
};

//Parse XML in Dialogue Directory
const parseDialogue = (path) => {
  const xml = fs.readFileSync(path, "utf-8");
  const dialogue = [
    ...new Set(
      XML.parse(xml, {
        preserveDocumentNode: true,
        forceArrays: true,
      })
        .DialogueTree.DialogueNode.map((v) =>
          v.DialogueOptionsList
            ? [
                restoreTag(v.Dialogue.map((v) => v.Page).flat()),
                restoreTag(
                  v.DialogueOptionsList.map((v) =>
                    v.DialogueOption.map((v) => v.Text).flat()
                  ).flat()
                ),
              ].flat()
            : v.Dialogue
            ? restoreTag(v.Dialogue.map((v) => v.Page).flat())
            : ""
        )
        .flat()
    ),
  ];
  return dialogue;
};

//Parse XML in ShipLogs Directory
const parseShipLogs = (path) => {
  const xml = fs.readFileSync(path, "utf-8");
  const shipLogs = [
    ...new Set(
      XML.parse(xml, {
        preserveDocumentNode: true,
        forceArrays: true,
      })
        .AstroObjectEntry.Entry.map((v) =>
          v.RumorFact && v.ExploreFact
            ? [
                v.Name,
                restoreTag(
                  v.RumorFact.map((v) => [v.RumorName, v.Text].flat()).flat()
                ),
                restoreTag(v.ExploreFact.map((v) => v.Text).flat()),
              ].flat()
            : v.ExploreFact
            ? [
                v.Name,
                restoreTag(v.ExploreFact.map((v) => v.Text).flat()),
              ].flat()
            : [
                v.Name,
                restoreTag(
                  v.RumorFact.map((v) => [v.RumorName, v.Text].flat()).flat()
                ),
              ].flat()
        )
        .flat()
    ),
  ];
  return shipLogs;
};

const xml2json = ({ projectRoot }) => {
  //Check project path
  if (!fs.existsSync(path.join(projectRoot, "planets"))) {
    console.log(logSymbols.error, "Path of the project root is invalid.");
    return;
  }

  const dialogueArr = [];
  const shipLogsArr = [];
  const fileList = glob
    .sync(normalize(path.join(projectRoot, "planets/**/*.xml")))
    .map((v) => normalize(v));

  if (Array.isArray(fileList) && !fileList.length) {
    console.log(logSymbols.error, "XML file not found");
    process.exit(1);
  }

  try {
    //Dialogue
    fileList.forEach((v) => {
      if (v.includes("/Dialogue/")) {
        dialogueArr.push(`//${path.basename(v)}@`);
        dialogueArr.push(parseDialogue(v));
      }
    });

    //Text
    fileList.forEach((v) => {
      if (v.includes("/Text/")) {
        dialogueArr.push(`//${path.basename(v)}@`);
        dialogueArr.push(parseText(v));
      }
    });

    //ShipLogs
    fileList.forEach((v) => {
      if (v.includes("/ShipLogs/")) {
        shipLogsArr.push(`//${path.basename(v)}@`);
        shipLogsArr.push(parseShipLogs(v));
      }
    });
  } catch (error) {
    console.log(logSymbols.error, error.message);
    process.exit(1);
  }

  //Convert Array to Object
  const arrToObj = (arr) =>
    arr.flat().reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: curr,
      };
    }, {});
  const dialogue = arrToObj(dialogueArr);
  const shipLogs = arrToObj(shipLogsArr);

  //Format JSON
  const json = JSON.stringify(
    {
      $schema:
        "https://raw.githubusercontent.com/xen-42/outer-wilds-new-horizons/main/NewHorizons/Schemas/translation_schema.json",
      DialogueDictionary: dialogue,
      ShipLogDictionary: shipLogs,
      UIDictionary: { "Please add manually.": "Please add manually." },
      AchievementTranslations: {
        "Please add manually.": {},
      },
    },
    null,
    2
  )
    .replaceAll('",\n    "//', '",\n\n    "//')
    .replaceAll("},\n", "},\n\n")
    .replaceAll('"//', "//")
    .replaceAll(/.xml@.+/g, "")
    .replaceAll(/<\/color>]]> ([.,!?])/g, "</color>]]>$1");

  //Export JSON File
  //Confirm translations dir
  const exportJSON = () => {
    fs.mkdir(path.join(projectRoot, "translations"), (err) => {
      return;
    });
    //Confirm overwrite
    fs.writeFile(
      path.join(projectRoot, "translations/english.json"),
      json,
      { flag: "wx" },
      (err) => {
        if (err) {
          inquirer
            .prompt([
              {
                type: "confirm",
                name: "overwrite",
                message: "english.json already exists. Overwrite?",
              },
            ])
            .then((answer) => {
              if (!answer.overwrite) {
                console.log(logSymbols.error, "Not overwritten");
                return;
              }
              fs.writeFile(
                path.join(projectRoot, "translations/english.json"),
                json,
                (err) => {
                  if (err) {
                    console.log(err);
                  } else {
                    console.log(
                      logSymbols.success,
                      `Overwritten successfully: ${path.join(
                        projectRoot,
                        "translations/english.json"
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
              "translations/english.json"
            )} `
          );
        }
      }
    );
  };

  exportJSON();
};

module.exports = xml2json;
