const login = (bot, ctx, userInputs) => {
  const chatId = ctx.chat.id;
  ctx.reply("Login");
  if (ctx.chat.type !== "private") {
    bot.sendMessage(chatId, "Please send your password in a private chat.");
    return;
  }

  bot.sendMessage(chatId, "Please enter your username:");
  userInputs[chatId] = { state: "awaiting_username" };
  return userInput;
};

const auth = {
  login,
};

module.exports = {
  auth,
};
