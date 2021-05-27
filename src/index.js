const {resolve} = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");
const color = require("color");

const imgPath = resolve(__dirname, "..", "img");

const WIDTH = 74;
const HEIGHT = 63;
const WHITE = "#d6e0f0";
const WHITE_DARK = "#8394bf";
const WHITE_EXPANDED = color(WHITE).color;
const WHITE_DARK_EXPANDED = color(WHITE_DARK).color;
const FRAME_DELAY = 0.05;

const FRAMES = [];
for (let i = 1; i < 7; i++) {
  FRAMES.push(sharp(resolve(imgPath, i + ".png")).ensureAlpha());
}

const COLORS = [
  // main
  "#c51111",
  "#132fd2",
  "#127f2d",
  "#ed53b9",
  "#ef7d0e",
  "#f3f658",
  "#3f484e",
  "#d5e0ef",
  "#6b30bc",
  "#72491e",
  "#39fedb",
  "#50ef3a",

  // upcoming
  "#d76364",
  "#ecc0d3",
  "#768595",

  // unobtainable
  "#1d9853",
  "#918977",
  "#637118",
];

const COLORS_DARK = [];

for (let c = 0; c < COLORS.length; c++) {
  const col = color("#949494").color;
  const target = color(COLORS[c]).color;

  const r = (col[0] * target[0]) / 255;
  const g = (col[1] * target[1]) / 255;
  const b = (col[2] * target[2]) / 255;

  COLORS_DARK[c] = color({
    r,
    g,
    b,
  }).hex();
}

async function makeFrame(w, h, colors, index) {
  const out = sharp({
    create: {
      width: w * WIDTH,
      height: h * HEIGHT,
      channels: 4,
      background: "#00000000",
    },
  });
  const toComposite = [];

  for (let y = 0; y < colors.length; y++) {
    for (let x = 0; x < colors[y].length; x++) {
      const thisColor = COLORS[colors[y][x]];
      const thisDarkColor = COLORS_DARK[colors[y][x]];
      const expandedColor = color(thisColor).color;
      const darkColor = color(thisDarkColor).color;

      const frame = await FRAMES[index].clone().raw().toBuffer();
      const pixels = [];
      for (let b = 0; b < frame.length; b = b + 4) {
        pixels.push([frame[b], frame[b + 1], frame[b + 2], frame[b + 3]]);
      }

      let tinted = [];
      for (let p = 0; p < pixels.length; p++) {
        if (
          pixels[p][0] == WHITE_EXPANDED[0] &&
          pixels[p][1] == WHITE_EXPANDED[1] &&
          pixels[p][2] == WHITE_EXPANDED[2]
        ) {
          pixels[p][0] = expandedColor[0];
          pixels[p][1] = expandedColor[1];
          pixels[p][2] = expandedColor[2];
        } else if (
          pixels[p][0] == WHITE_DARK_EXPANDED[0] &&
          pixels[p][1] == WHITE_DARK_EXPANDED[1] &&
          pixels[p][2] == WHITE_DARK_EXPANDED[2]
        ) {
          pixels[p][0] = darkColor[0];
          pixels[p][1] = darkColor[1];
          pixels[p][2] = darkColor[2];
        }
        tinted.push(...pixels[p]);
      }
      tinted = sharp(Buffer.from(tinted), {
        raw: {
          width: WIDTH,
          height: HEIGHT,
          channels: 4,
        },
      });

      toComposite.push({
        input: await tinted.toBuffer(),
        raw: {
          width: WIDTH,
          height: HEIGHT,
          channels: 4,
        },
        top: y * HEIGHT,
        left: x * WIDTH,
      });
    }
  }

  out.composite(toComposite);
  return out;
}

async function fromBuffer(buffer) {}

async function fromFile(path) {
  return await fromBuffer(await fs.readFile(path));
}

module.exports = {
  colors: COLORS,
  darkColors: COLORS_DARK,
  makeFrame,
  fromFile,
  fromBuffer,
};
