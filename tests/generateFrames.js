const sharp = require("sharp");
const dumpy = require("../src/index.js");
const {resolve} = require("path");

const WIDTH = 74;
const HEIGHT = 63;
const COLORS = dumpy.colors;

async function generateTestImage() {
  const palette = [];
  for (let i = 0; i < COLORS.length; i++) {
    palette[i] = i;
  }

  const out = sharp({
    create: {
      width: WIDTH * COLORS.length,
      height: HEIGHT * 6,
      channels: 4,
      background: "#00000000",
    },
  });
  const toComposite = [];

  for (let i = 0; i < 6; i++) {
    const frame = await dumpy.makeFrame(COLORS.length, 1, [palette], i);
    const output = await frame.ensureAlpha().toBuffer();
    toComposite.push({
      input: output,
      top: i * HEIGHT,
      left: 0,
      raw: {
        width: WIDTH * COLORS.length,
        height: HEIGHT,
        channels: 4,
      },
    });
  }
  out.composite(toComposite);

  return out;
}
generateTestImage().then((x) =>
  x.png().toFile(resolve(__dirname, "generateFrames.png"))
);
