const {resolve} = require("path");
const color = require("color");
const Jimp = require("jimp");
const {GifFrame, GifCodec} = require("gifwrap");

const imgPath = resolve(__dirname, "..", "img");

const gifEncoder = new GifCodec();

const WIDTH = 74;
const HEIGHT = 63;
const WHITE = "#d6e0f0";
const WHITE_DARK = "#8394bf";
const WHITE_EXPANDED = color(WHITE).color;
const WHITE_DARK_EXPANDED = color(WHITE_DARK).color;
const FRAME_DELAY = 5;

const FRAMES = [];
for (let i = 1; i < 7; i++) {
  FRAMES.push(Jimp.read(resolve(imgPath, i + ".png")));
}

const FRAMES_COLORED = [];

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
const COLORS_EXPANDED = [];

for (let c = 0; c < COLORS.length; c++) {
  const col = color("#949494").color;
  const target = color(COLORS[c]).color;
  COLORS_EXPANDED[c] = target;

  const r = (col[0] * target[0]) / 255;
  const g = (col[1] * target[1]) / 255;
  const b = (col[2] * target[2]) / 255;

  COLORS_DARK[c] = color({
    r,
    g,
    b,
  }).hex();
}

async function generatePalette() {
  for (let c = 0; c < COLORS.length; c++) {
    const thisColor = COLORS[c];
    const thisDarkColor = COLORS_DARK[c];
    const expandedColor = color(thisColor).color;
    const darkColor = color(thisDarkColor).color;
    FRAMES_COLORED[c] = [];

    for (let i = 0; i < 6; i++) {
      const frame = await FRAMES[i].then((x) => x.bitmap.data);

      const pixels = [];
      for (let b = 0; b < frame.length; b = b + 4) {
        pixels.push([frame[b], frame[b + 1], frame[b + 2], frame[b + 3]]);
      }

      const tinted = [];
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

      const newFrame = new Jimp(WIDTH, HEIGHT, 0x00000000);
      newFrame.bitmap.data = Buffer.from(tinted);

      FRAMES_COLORED[c][i] = newFrame;
    }
  }
}

async function makeFrame(w, h, colors, startIndex) {
  const out = new Jimp(w * WIDTH, h * HEIGHT, 0x00000000);
  let index = startIndex;

  for (let y = 0; y < colors.length; y++) {
    index = startIndex + y;
    for (let x = 0; x < colors[y].length; x++) {
      const color = colors[y][x];
      if (color == -1) continue;
      if (!FRAMES_COLORED[color] || !FRAMES_COLORED[color][(index + x) % 6]) {
        await generatePalette();
      }

      out.composite(
        FRAMES_COLORED[color][(index + x) % 6],
        x * WIDTH,
        y * HEIGHT
      );
    }
  }

  return out;
}

async function makeGif(width, height, colors) {
  const frames = [];
  for (let i = 0; i < 6; i++) {
    const frame = await makeFrame(width, height, colors, i);
    const gifFrame = new GifFrame(width * WIDTH, height * HEIGHT, {
      delayCentisecs: FRAME_DELAY,
    });
    gifFrame.bitmap.data = frame.bitmap.data;
    frames.push(gifFrame);
  }
  const gif = await gifEncoder.encodeGif(frames);

  return gif.buffer;
}

// https://stackoverflow.com/a/4492417
function arrayToMatrix(array, size) {
  const matrix = [];
  let i, k;

  for (i = 0, k = -1; i < array.length; i++) {
    if (i % size == 0) {
      k++;
      matrix[k] = [];
    }

    matrix[k].push(array[i]);
  }

  return matrix;
}

// https://github.com/danielepiccone/ditherjs/blob/d533b542419dc82028b58dacd8f1d6b1a7dbaddc/lib/ditherjs.js#L65-L85
function colorDistance(a, b) {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
      Math.pow(a[1] - b[1], 2) +
      Math.pow(a[2] - b[2], 2)
  );
}
function approximateColor(color, palette) {
  function findIndex(fun, arg, list, min) {
    if (list.length == 2) {
      if (fun(arg, min) <= fun(arg, list[1])) {
        return min;
      } else {
        return list[1];
      }
    } else {
      var tl = list.slice(1);
      if (fun(arg, min) > fun(arg, list[1])) {
        min = list[1];
      }
      return findIndex(fun, arg, tl, min);
    }
  }

  return findIndex(colorDistance, color, palette, palette[0]);
}

async function remapColors(buffer) {
  const pixels = [];
  for (let b = 0; b < buffer.length; b = b + 4) {
    pixels.push([buffer[b], buffer[b + 1], buffer[b + 2], buffer[b + 3]]);
  }

  const remapped = [];
  for (let p = 0; p < pixels.length; p++) {
    const newColor = approximateColor(pixels[p], COLORS_EXPANDED);
    const outColor = [...newColor, pixels[p][3]];
    if (pixels[p][3] != 255) {
      outColor[0] = outColor[1] = outColor[2] = outColor[3] = 0;
    }
    remapped.push(...outColor);
  }

  return Buffer.from(remapped);
}

async function convert(file, width) {
  const image = await Jimp.read(file);
  const resized = image.resize(width, Jimp.AUTO, Jimp.RESIZE_NEAREST_NEIGHBOR);
  const remapped = await remapColors(resized.bitmap.data);

  const pixels = [];
  for (let b = 0; b < remapped.length; b = b + 4) {
    pixels.push([
      remapped[b],
      remapped[b + 1],
      remapped[b + 2],
      remapped[b + 3],
    ]);
  }

  let colors = [];
  for (let p = 0; p < pixels.length; p++) {
    if (pixels[p][3] != 255) {
      colors.push(-1);
    } else {
      for (const index in COLORS_EXPANDED) {
        const color = COLORS_EXPANDED[index];
        if (
          pixels[p][0] == color[0] &&
          pixels[p][1] == color[1] &&
          pixels[p][2] == color[2]
        ) {
          colors.push(index);
          break;
        }
      }
    }
  }
  colors = arrayToMatrix(colors, width);

  return await makeGif(width, colors.length, colors);
}

module.exports = {
  colors: COLORS,
  darkColors: COLORS_DARK,
  makeFrame,
  convert,
};
