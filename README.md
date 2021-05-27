# dumpy.js
Create Among Us Dumpy GIFs in pure node.js

## Why?
Because [this one](https://github.com/ThatOneCalculator/Among-Us-Dumpy-Gif-Maker) is horrible in how it works.

## Installation
```
pnpm i --save Cynosphere/dumpy.js
```
## Usage
```js
const {convert} = require("dumpy");
await convert(<url, path, buffer>, <size>) // Returns buffer of GIF
```