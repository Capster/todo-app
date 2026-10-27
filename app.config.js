const fs = require('node:fs');
const path = require('node:path');

const appJson = require('./app.json');

const tokenPath = path.join(__dirname, 'token');

let token;
try {
  token = fs.readFileSync(tokenPath, 'utf8').trim();
} catch (error) {
  throw new Error(
    `Missing required token file at ${tokenPath}. Create it with a GitHub token before starting Expo.`,
  );
}

if (!token) {
  throw new Error(
    `The token file at ${tokenPath} is empty. Add a GitHub token before starting Expo.`,
  );
}

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      gitToken: token,
    },
  },
};
