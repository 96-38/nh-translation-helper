"use strict";
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const logSymbols = require("log-symbols");

const confirmFileOverwite = ({ projectRoot, file, langName }) => {
  inquirer
    .prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: `${langName}.json already exists. Overwrite?`,
      },
    ])
    .then((answer) => {
      if (!answer.overwrite) {
        console.log(logSymbols.error, "Not overwritten");
        return;
      }
      fs.writeFile(
        path.join(projectRoot, `translations/${langName}.json`),
        file,
        (err) => {
          if (err) {
            console.log(err);
            return;
          }
          console.log(
            logSymbols.success,
            `Overwritten successfully: ${path.join(
              projectRoot,
              `translations/${langName}.json`
            )} `
          );
        }
      );
    });
};

module.exports = confirmFileOverwite;
