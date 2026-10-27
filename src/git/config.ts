import Constants from 'expo-constants';

export const REPOSITORY_URL = 'https://github.com/Capster/todo.git';
export const BRANCH = 'master';
export const REPOSITORY_DIRECTORY = 'todo-repo';
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
