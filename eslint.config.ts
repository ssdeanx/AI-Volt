// eslint.config.ts
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';

export default tseslint.config(
  // ESLint recommended configurations
  eslint.configs.recommended,

  // SonarJS recommended configurations
  sonarjs.configs.recommended,
  
  // Security recommended configurations
  security.configs.recommended,

  // TypeScript ESLint basic recommended configurations
  // This set does not require project (tsconfig.json) for basic linting,
  // but for some rules to work optimally, especially if you add more specific ones later,
  // providing the project path is still good practice.
  ...tseslint.configs.recommended,

  {
    // General configuration for all TypeScript files
    files: ['**/*.ts', '**/*.tsx'], // Adjust if you have .tsx files
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        // project: true, // You can enable this later for more powerful type-aware rules
        tsconfigRootDir: import.meta.dirname,
        tsconfig: './tsconfig.json',
        extraFileExtensions: ['.ts', '.tsx'],
        warnOnUnsupportedTypeScriptVersion: true,
        warnOnUnmatchedTypeScriptVersion: true,
        warnOnUnmatchedLibraryVersion: true,
        warnOnUnmatchedLibraryName: true,


        ecmaVersion: 'latest', // Use modern ECMAScript features
        sourceType: 'module',
      },
      globals: {
        ...globals.node, // Add Node.js global variables
      },
    },
    rules: {
      // --- ESLint Core Rule Overrides/Additions ---
      'no-unused-vars': 'off', // Disable base rule as @typescript-eslint/no-unused-vars is used
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off', // Allow console in dev
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'eqeqeq': ['error', 'always'], // Enforce strict equality

      // --- TypeScript ESLint Rule Overrides/Additions ---
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off', // Warn on 'any' type
      // You can comment out or adjust explicit-function-return-type if it's too noisy initially
      '@typescript-eslint/explicit-function-return-type': [
        'off', // Changed to 'off' for a more basic setup
        // {
        //   allowExpressions: true,
        //   allowTypedFunctionExpressions: true,
        // },
      ],
      // Consider adding these back as your project matures:
      // '@typescript-eslint/no-floating-promises': 'error',
      // '@typescript-eslint/consistent-type-imports': [
      //   'warn',
      //   {
      //     prefer: 'type-imports',
      //     fixStyle: 'inline-type-imports',
      //   },
      // ],
      // '@typescript-eslint/no-misused-promises': [
      //   'error',
      //   {
      //     checksVoidReturn: {
      //       attributes: false,
      //     },
      //   },
      // ],
    },
  },
  {
    // Configuration for JavaScript files (if any, e.g., config files)
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
  {
    // Ignores common directories and specific files
    ignores: [
      'node_modules/',
      'dist/',
      '.DS_Store',
      '.env',
      '.env.*',
      '*.log',
      '*.lock',
      'package-lock.json', // If you use npm
      'pnpm-lock.yaml',    // If you use pnpm
      'yarn.lock',         // If you use yarn
      'temp/',
      'coverage/',
      '*.md', // Usually not linted for code style
      'llm.txt',
      // Add any other specific files or patterns to ignore
      'eslint.config.ts', // Might be needed if it self-lints with type-aware rules
    ],
  }
);
