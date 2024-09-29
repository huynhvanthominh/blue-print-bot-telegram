const { Telegraf } = require("telegraf");

const token = "7419413997:AAEcqfdMPytFfxkDchJxSmW3dzimTozrSo4";
const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply("Welcome"));
bot.help((ctx) => ctx.reply("Send me a sticker"));

bot.on("sticker", (ctx) => ctx.reply("🐶"));

bot.on("message", async (ctx) => {
  const message = ctx.update.message.text;
  if (message.match(/hello/)) {
    ctx.reply("Xin chào");
  } else {
    ctx.reply("Hong hiểu...");
  }
});

bot.launch();

console.log("running...");
