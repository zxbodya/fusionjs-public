// @flow
/* eslint-env node */

module.exports = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testPathIgnorePatterns: [
        '/node_modules/',
        '.browser.js',
        'dist',
        'setup-jest.js',
      ],
      globals: {
        __NODE__: true,
        __BROWSER__: false,
        __DEV__: true,
      },
    },
    {
      displayName: 'browser',
      testEnvironment: 'jsdom',
      testPathIgnorePatterns: [
        '/node_modules/',
        '.node.js',
        'dist',
        'setup-jest.js',
      ],
      globals: {
        __NODE__: false,
        __BROWSER__: true,
        __DEV__: true,
      },
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup-jest.js'],
    },
  ],
};
