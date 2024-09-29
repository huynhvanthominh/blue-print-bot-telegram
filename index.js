const { Telegraf } = require("telegraf");
const { KEY_API } = require("./constants");
const { default: axios } = require("axios");
var CronJob = require("cron").CronJob;
const cheerio = require("react-native-cheerio");
const token = "7419413997:AAEcqfdMPytFfxkDchJxSmW3dzimTozrSo4";
const bot = new Telegraf(token);
const qs = require("querystring");
let userInputs = {};

bot.start((ctx) => {
  const chatId = ctx.chat.id;
  userInputs[chatId] = {};
  fetchUser()
    .then((rs) => {
      console.log("fetchUser", rs);
    })
    .catch((err) => {
      getUrlLogin(chatId)
        .then(() => {
          if (ctx.chat.type !== "private") {
            ctx.sendMessage("Please send your password in a private chat.");
            return;
          }

          ctx.sendMessage("Please enter your username:");
          userInputs[chatId].state = "awaiting_username";
        })
        .catch((error) => {
          console.log("getUrlLogin", error);
        });
      console.log("fetch User", err);
    });
});
bot.command("stop", (ctx) => stop(ctx));
bot.help((ctx) => ctx.reply("Send me a sticker"));

bot.on("message", async (ctx) => {
  const chatId = ctx.chat.id;
  const userState = userInputs[chatId] ? userInputs[chatId].state : null;
  if (userState === "awaiting_username") {
    userInputs[chatId].username = ctx.text;
    userInputs[chatId].state = "awaiting_password";
    ctx.sendMessage(
      "Please enter your password (we recommend deleting this message after):",
    );
  } else if (userState === "awaiting_password") {
    const password = ctx.text;
    userInputs[chatId].password = password;
    userInputs[chatId].starte = "";
    ctx
      .deleteMessage(ctx.msgId)
      .then(() => {
        console.log("Password message deleted for security.");
      })
      .catch((error) => {
        console.error("Error deleting password message:", error);
      });
    // start(ctx);
    onLogin(chatId)
      .then((onLoginSuccess) => {
        ctx.sendMessage(
          "Login successful! Your username is: " + userInputs[chatId].username,
        );
        console.log("onLoginSuccess", onLoginSuccess);
      })
      .catch((onLoginError) => {
        console.error("onLoginError", onLoginError);
        ctx.sendMessage("Login failed!. Information: " + onLoginError);
      });
  }
});

bot.launch();

const start = (ctx) => {
  const chatId = ctx.chat.id;
  userInputs[chatId].job = CronJob.from({
    cronTime: "00 00 07 * * 1-5",
    onTick: function () {
      ctx.sendMessage("Punch success");
    },
    start: true,
  });
  userInputs[chatId].job.start();
};

const stop = (ctx) => {
  const chatId = ctx.chat.id;
  userInputs[chatId].job.stop();
  ctx.sendMessage("Stop auto punch success.");
};

const getUrlLogin = async (chatId) => {
  const url = "https://blueprint.cyberlogitec.com.vn/sso/login";
  const rs = await axios.get(url);
  if (rs.status === 200) {
    const html = rs.data;
    if (html) {
      const $ = cheerio.load(html);
      const link = $("form").attr("action");
      userInputs[chatId].urlLogin = link;
      userInputs[chatId].cookies = rs.headers["set-cookie"] ?? [];
    }
  }
};

const fetchUser = async () => {
  return axios.get(KEY_API.userInfo);
};

const onLogin = async (chatId) => {
  const url = userInputs[chatId].urlLogin;
  const { username, password, cookies } = userInputs[chatId];
  const options = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Cookie: cookies.join(";"),
    },
    data: qs.stringify({
      username,
      password,
    }),
    url,
  };
  const rs = await axios.request(options);
  console.log(rs, "onLogin");
};

console.log("running...");
