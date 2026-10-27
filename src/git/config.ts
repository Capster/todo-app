import Constants from 'expo-constants';

export const REPOSITORY_URL = 'https://github.com/Capster/todo.git';
export const BRANCH = 'master';
export const REPOSITORY_DIRECTORY = 'todo-repo';
export const GIT_CORS_PROXY_ENV = 'EXPO_PUBLIC_GIT_CORS_PROXY';
export const AUTHOR = {
  name: 'Todo App',
  email: 'todo-app@example.com',
};

export function getGitToken(): string {
  const token = Constants.expoConfig?.extra?.gitToken;

  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error(
      'Git token is missing. Add a token file to the project root and restart the app.',
    );
  }

  return token.trim();
}

export function getGitCorsProxy(): string | undefined {
  const proxy = Constants.expoConfig?.extra?.gitCorsProxy;

  if (typeof proxy !== 'string' || proxy.trim() === '') {
    return undefined;
  }

  return proxy.trim();
}

export function requireGitCorsProxy(): string {
  const proxy = getGitCorsProxy();

  if (!proxy) {
    throw new Error(
      `A CORS proxy is required for git operations in the browser. Set ${GIT_CORS_PROXY_ENV} to an http(s) URL and restart Expo.`,
    );
  }

  return proxy;
}
