const appJson = require('./app.json');

const rawCorsProxy = process.env.EXPO_PUBLIC_GIT_CORS_PROXY;
const gitCorsProxy = typeof rawCorsProxy === 'string' ? rawCorsProxy.trim() : '';

if (gitCorsProxy) {
  let proxyUrl;
  try {
    proxyUrl = new URL(gitCorsProxy);
  } catch (error) {
    throw new Error(
      'EXPO_PUBLIC_GIT_CORS_PROXY must be a valid http(s) URL.',
    );
  }

  if (proxyUrl.protocol !== 'http:' && proxyUrl.protocol !== 'https:') {
    throw new Error(
      'EXPO_PUBLIC_GIT_CORS_PROXY must be a valid http(s) URL.',
    );
  }
}

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      ...(gitCorsProxy ? { gitCorsProxy } : {}),
    },
  },
};
