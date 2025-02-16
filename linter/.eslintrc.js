module.exports = {
  root: false,
  extends: ['eslint-config-fusion'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      rules: {
        'flowtype/require-valid-file-annotation': 'off',
        'flowtype/no-types-missing-file-annotation': 'off',
        'cup/no-undef': 'off',
        // does not work correctly with import type typescript feature todo: probably can be fixed with eslint tooling upgrade
        'import/no-duplicates': 'off',

        // disbled because missing dependency in fusion-core todo: review after fixing the types
        'import/no-extraneous-dependencies': 'off',

        // should be replaced with @typescript-eslint/no-unused-vars,
        // but there is apparently a bug when importing type namespaces
        'no-unused-vars': 'off',
        'no-redeclare': 'off',
        'no-dupe-class-members': 'off',
        '@typescript-eslint/no-dupe-class-members': 'error',
        'import/no-unresolved': 'off',
      },
    },
  ],
  ignorePatterns: ['**/*.d.ts'],
};
