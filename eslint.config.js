import globals from "globals";
import tseslint from "typescript-eslint";
import hooksPlugin from 'eslint-plugin-react-hooks';
import refreshPlugin from 'eslint-plugin-react-refresh';
import { fixupPluginRules } from '@eslint/compat';

export default tseslint.config(
  {
    ignores: ["dist", ".idx", "dev-dist", "node_modules", "test-browser.cjs"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      'react-hooks': fixupPluginRules(hooksPlugin),
      'react-refresh': refreshPlugin,
    },
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.app.json', 'tsconfig.node.json'], // Corrected path
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...hooksPlugin.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  }
);
