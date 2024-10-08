const { default: axios } = require("axios");
const { CookieJar } = require("tough-cookie");
const fs = require("fs");
const path = require("path");
const qs = require("querystring");
const homePage = "https://blueprint.cyberlogitec.com.vn/";
const { wrapper } = require("axios-cookiejar-support");
const { CronJob } = require("cron");
wrapper(axios);
const userInputs = {};
const cookiesDir = "./cookies";
if (!fs.existsSync(cookiesDir)) {
  fs.mkdirSync(cookiesDir);
}

// Save cookies after each request
const authClient = axios.create({
  withCredentials: true,
  maxRedirects: 0,
  validateStatus: (status) => status < 400 || status === 302, // To handle redirects
});

function getUserCookieJar(chatId) {
  const cookiePath = path.join(cookiesDir, `${chatId}.json`);
  let jar;
  if (fs.existsSync(cookiePath)) {
    const cookieData = fs.readFileSync(cookiePath, "utf8");
    jar = CookieJar.fromJSON(cookieData);
  } else {
    jar = new CookieJar();
  }

  return { jar, cookiePath };
}

// Function to save a user's cookies to file
function saveUserCookies(jar, cookiePath) {
  const serializedCookies = JSON.stringify(jar.toJSON());
  fs.writeFileSync(cookiePath, serializedCookies);
}

authClient.interceptors.request.use(
  function (config) {
    const chatId = config.headers["chat-id"];
    const { jar } = getUserCookieJar(chatId);
    return {
      ...config,
      jar,
      withCredentials: true,
    };
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  },
);

authClient.interceptors.response.use(
  (response) => {
    const chatId = response.config.headers["chat-id"];
    const jar = response.config.jar;
    const { cookiePath } = getUserCookieJar(chatId);
    saveUserCookies(jar, cookiePath);
    fs.wri;
    return response;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Get Login Post Target
async function getLoginPostTarget(ctx) {
  const loginPageUrl = await getLoginPageUrl(ctx);
  const response = await authClient.get(loginPageUrl, {
    headers: {
      "chat-id": ctx.chat.id,
    },
  });
  const authUrl =
    response.data && response.data.length > 0
      ? getAuthUrl(ctx, response.data)
      : response.headers["location"];
  return authUrl;
}

// Get Login Page URL
async function getLoginPageUrl(ctx) {
  const chatId = ctx.chat.id;
  const response = await authClient.get(homePage, {
    headers: {
      "chat-id": chatId,
    },
  });

  if (response.status === 200) {
    throw new Error("Already logged in");
  }

  const ssoUrl = response.headers["location"];
  const ssoResponse = await authClient.get(ssoUrl, {
    headers: {
      "Upgrade-Insecure-Requests": "1",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      DNT: "1",
      "Sec-GPC": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      Connection: "keep-alive",
      Priority: "u=1",
      "chat-id": chatId,
    },
  });
  return ssoResponse.headers["location"];
}

// Get Auth URL from the login page HTML
function getAuthUrl(ctx, html) {
  const match = html.match(/action="([^"]+)"/);
  if (!match) {
    throw new Error("No action URL found");
  }

  return match[1].replace(/&amp;/g, "&");
}

// Authenticate with the server
async function authenticate(ctx, username, password, postUrl) {
  const chatId = ctx.chat.id;
  const response = await authClient.post(
    postUrl,
    qs.stringify({
      username,
      password,
      credentialId: "",
      rememberMe: "on",
    }),
    {
      headers: {
        "Upgrade-Insecure-Requests": "1",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Content-Type": "application/x-www-form-urlencoded",
        "chat-id": chatId,
      },
    },
  );

  return response.headers["location"];
}

// Perform SSO Login
async function ssoLogin(ctx, ssoUrl) {
  const chatId = ctx.chat.id;
  await authClient.get(ssoUrl, {
    headers: {
      "Upgrade-Insecure-Requests": "1",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "chat-id": chatId,
    },
  });
}

// Main login function
async function login(ctx, username, password) {
  const postUrl = await getLoginPostTarget(ctx);
  const ssoUrl = await authenticate(ctx, username, password, postUrl);
  await ssoLogin(ctx, ssoUrl);
}

// Logout function
async function logout(chatId) {
  await authClient.get(homePage + "process-logout", {
    headers: {
      "chat-id": chatId,
    },
  });
  const p = path.join(cookiesDir, `${chatId}.json`);
  if (fs.existsSync(p)) {
    fs.rmSync(p);
  }
}

// Fetch user info
async function getUserInfo(chatId) {
  try {
    const response = await authClient.get(
      "https://blueprint.cyberlogitec.com.vn/api/getUserInfo",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
          Accept: "application/json, text/plain, */*",
          "chat-id": chatId,
        },
      },
    );

    if (response.status !== 200) {
      throw new Error("Error fetching user info");
    }
    return response.data;
  } catch (err) {
    throw new Error("Error fetching user info");
  }
}

const punch = async (chatId) => {
  await authClient.post(
    homePage + "api/checkInOut/insert",
    {},
    {
      headers: {
        "chat-id": chatId,
      },
    },
  );
};

function getRandomDelay(minMinutes, maxMinutes) {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

const _start = (chatId, { onSuccess, onPunchSuccess, onError }) => {
  userInputs[chatId] = userInputs[chatId] ?? {};
  const _main = async (min, max) => {
    try {
      await getUserInfo(chatId);
      const randomDelay = getRandomDelay(min, max);
      const date = new Date();
      date.setMilliseconds(date.getMilliseconds() + randomDelay);
      setTimeout(() => {
        punch(chatId)
          .then((rs) => {
            onPunchSuccess && onPunchSuccess(rs);
          })
          .catch((err) => {
            onError && onError(err);
          });
      }, randomDelay);
      onSuccess &&
        onSuccess({
          date: date.toLocaleString(),
        });
    } catch (error) {
      onError && onError(error);
    }
  };
  const job1 = CronJob.from({
    cronTime: "00 00 07 * * 1-5",
    onTick: function () {
      _main(1, 5).then();
    },
    start: true,
  });

  const job2 = CronJob.from({
    cronTime: "00 30 17 * * 1-5",
    onTick: function () {
      _main(1, 10).then();
    },
    start: true,
  });

  const jobs = [job1, job2];
  jobs.forEach((job) => {
    job.start();
  });
  userInputs[chatId].jobs = jobs;
};

const _stop = (chatId) => {
  userInputs[chatId]?.jobs?.forEach((job) => {
    job?.stop();
  });
};

const init = async (bot) => {
  const files = fs.readdirSync(cookiesDir);
  files.forEach((file) => {
    const chatId = file.split(".")[0];
    userInputs[chatId] = {};
    _start(chatId, {
      onSuccess: ({ date }) => {
        _botSendMessage(bot, chatId, "Will auto punch at " + date);
      },
      onPunchSuccess: () => {
        _botSendMessage(bot, chatId, "Punch success.");
      },
      onError: (err) =>
        _botSendMessage(
          bot,
          chatId,
          "Restart auto punch failed. Information: " + err,
        ),
    });
    _botSendMessage(bot, chatId, "Bot restarted");
  });
};

const _botSendMessage = (bot, chatId, message) => {
  bot.telegram.sendMessage(chatId, message);
};

// Exported functions
module.exports = {
  login,
  logout,
  getUserInfo,
  punch,
  _start,
  _stop,
  init,
};
