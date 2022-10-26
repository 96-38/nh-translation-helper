<h1 align="center">📖 nh-translation-helper</h1>

<p align="center">
A small CLI tool to help with multi-language support for the <a href="https://nh.outerwildsmods.com">New Horizons</a> based <a href="https://www.mobiusdigitalgames.com/outer-wilds.html">Outer Wilds</a> story mod.
</p>
<p align="center">
  <a href="https://github.com/96-38/bitbank-trailing-stop/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" />
    <a href="https://badge.fury.io/js/nh-translation-helper"><img src="https://badge.fury.io/js/nh-translation-helper.svg" alt="npm version" height="18"></a>
  </a>
  <img src="https://user-images.githubusercontent.com/48713768/197670224-f408a47d-3781-48ea-acd4-8d8c57a7d66b.png"/>
</p>

## Requirements

- [Node.js >=12.0.0](https://nodejs.org/)
- [DeepL API Key (Free or Pro)](https://www.deepl.com/docs-api)

## Installation

```bash
$ npm i -g nh-translation-helper
```

## Features

- Generate english.json
  - Extract the text (dialogue, ship logs, etc.) from XML files and generate a english.json
- Translate JSON

  - Generate a json file instantly for another language (DeepL API Key required)
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

- Easy to use
  - Interactive UI so you just answer questions

## Usage

```bash
$ nh-translation-helper
```

When you run for the first time, please set the API KEY.

## Note

- Not supported extract UIDictionary and AchievementTranslations
  - It is difficult to parse these automatically, and the number of words is small that it would be better to add them manually for better results.
- Not supported translation into Korean
  - Translation is provided by the DeepL API, so it is not possible to translate into languages that are not supported by DeepL.
- The generated translations are “not” perfect
  - It is a machine translation though DeepL. The translations on DeepL are known to be too casual or to abbreviate some sentences.
  - It will need to be manually corrected to make it a good translation. However, this tool allows you to prototype and is more efficient than starting from scratch. Also, the CDATA tag has been removed from the translated text and must be added manually.
- Parsing errors may occur when trying to translate manually created JSON files
  - In many cases, this is due to a specific comment in the JSON. Please delete the comments and try again.
