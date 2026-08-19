<h1 align="center">📖 nh-translation-helper</h1>

<p align="center">
A small CLI tool to help with multi-language support for the <a href="https://nh.outerwildsmods.com">New Horizons</a> based <a href="https://www.mobiusdigitalgames.com/outer-wilds.html">Outer Wilds</a> story mod.
</p>
<p align="center">
  <a href="https://github.com/96-38/bitbank-trailing-stop/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" />
  </a>
    <a href="https://badge.fury.io/js/nh-translation-helper"><img src="https://badge.fury.io/js/nh-translation-helper.svg" alt="npm version" height="18"></a>
  <img src="https://user-images.githubusercontent.com/48713768/197670224-f408a47d-3781-48ea-acd4-8d8c57a7d66b.png"/>
</p>

## Requirements

- [Node.js >= 12.0.0](https://nodejs.org/)
- [DeepL API Key (Free or Pro)](https://www.deepl.com/docs-api)

### For Windows Users

When installing Node.js, be sure to install "Tools for Native Modules".<br>Make sure the following checkbox in the installation wizard is checked.

<img width="385" alt="Node.js Install Wizard" src="https://user-images.githubusercontent.com/48713768/201880972-8bca6fab-e562-4f0d-895e-520af808c7aa.png">

**Note**: Make sure you have enough free space (about 7 GB) before installing Node.js.

## Installation

```bash
$ npm i -g nh-translation-helper
```

### For Windows Users

Installation may fail if you do not have the necessary environment for build.<br> In that case, please reinstall Node.js and be sure to install "Tools for Native Modules".

## Features

- Generate english.json
  - Extract the text (dialogue, ship logs, etc.) from XML files and generate an english.json.
  - The XML file name is inserted into the JSON as a comment, which is useful for translation work because you know which scene the text is from.
- Translate JSON (DeepL API Key required)

  - Generate a JSON file instantly for another language.
  - Supported Languages (inter-translatable)
    - English : en-US
    - Spanish_la : es
    - German : de
    - French : fr
    - Italian : it
    - Polish : pl
    - Portuguese_br : pt-BR
    - Japanese : ja
    - Russian : ru
    - Chinese_simple : zh
    - Turkish : tr
    - Czech : cs

- Easy to use
  - Interactive UI so you just answer questions

## Usage

```bash
$ nh-translation-helper
```

When you start translation for the first time, please set the API KEY.

## Note

- Not supported extracting UIDictionary and AchievementTranslations
  - It is difficult to parse these automatically, and the number of words is small that it would be better to add them manually by MOD developers for better results.
  - Translating UIDictionary and AchievementTranslations is supported.
- Not supported translation into Korean
  - Translation is provided by the DeepL API, so it is not possible to translate into languages that are not supported by DeepL.
- The generated translations are “not” perfect
  - It is a machine translation though DeepL. The translations on DeepL are known to be too casual or to abbreviate some sentences.
  - It will need to be manually corrected to make it a good translation. However, this tool allows you to prototype and is more efficient than starting from scratch. Also, the CDATA tag has been removed from the translated text and must be added manually.
- Parsing errors may occur when trying to translate manually created JSON files
  - In many cases, this is due to a specific comment in the JSON. Please remove the comments and try again.
  - Most comments are processed normally, but errors may occur if the comment contains special symbols or if the comment is located at the end of a JSON object.
