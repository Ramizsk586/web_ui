import React from 'react';
import Editor, { loader, type Monaco, type OnMount } from '@monaco-editor/react';

interface MonacoCodeEditorProps {
  value: string;
  language: string;
  path?: string;
  fontSize?: number;
  wordWrap?: boolean;
  lineNumbers?: 'on' | 'off';
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onMount?: OnMount;
  onSave?: () => void;
}

const THEME_NAME = 'lumina-warm';
let themeRegistered = false;
let loaderConfigured = false;

const ensureLoaderConfig = () => {
  if (loaderConfigured || typeof window === 'undefined') return;
  loader.config({
    paths: {
      vs: '/node_modules/monaco-editor/min/vs',
    },
  });
  loaderConfigured = true;
};

const normalizeLanguage = (language: string) => {
  const lower = (language || '').toLowerCase();
  if (lower === 'js' || lower === 'jsx') return 'javascript';
  if (lower === 'ts' || lower === 'tsx') return 'typescript';
  if (lower === 'md') return 'markdown';
  return lower || 'plaintext';
};

const ensureTheme = (monaco: Monaco) => {
  if (themeRegistered) return;
  monaco.editor.defineTheme(THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8F8273' },
      { token: 'keyword', foreground: 'D97756' },
      { token: 'string', foreground: 'E09F67' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type.identifier', foreground: 'EDE6DD' },
      { token: 'delimiter', foreground: 'AD9F91' },
    ],
    colors: {
      'editor.background': '#110E0D',
      'editor.foreground': '#EDE6DD',
      'editorLineNumber.foreground': '#5F554C',
      'editorLineNumber.activeForeground': '#EDE6DD',
      'editorCursor.foreground': '#D97756',
      'editor.selectionBackground': '#D9775633',
      'editor.inactiveSelectionBackground': '#D9775622',
      'editor.lineHighlightBackground': '#1A1513',
      'editorLineHighlightBorder': '#00000000',
      'editorIndentGuide.background1': '#2D241E',
      'editorIndentGuide.activeBackground1': '#4A3A31',
      'editorWhitespace.foreground': '#2D241E',
      'editorGutter.background': '#110E0D',
      'editorWidget.background': '#181412',
      'editorWidget.border': '#2D241E',
      'input.background': '#181412',
      'input.border': '#2D241E',
      'input.foreground': '#EDE6DD',
      'scrollbarSlider.background': '#3B302A88',
      'scrollbarSlider.hoverBackground': '#5A484099',
      'scrollbarSlider.activeBackground': '#775F54AA',
    },
  });
  themeRegistered = true;
};

export function MonacoCodeEditor({
  value,
  language,
  path,
  fontSize = 13,
  wordWrap = true,
  lineNumbers = 'on',
  readOnly = false,
  onChange,
  onMount,
  onSave,
}: MonacoCodeEditorProps) {
  ensureLoaderConfig();

  return (
    <Editor
      height="100%"
      defaultLanguage={normalizeLanguage(language)}
      language={normalizeLanguage(language)}
      path={path}
      value={value}
      beforeMount={(monaco) => {
        ensureTheme(monaco);
      }}
      onMount={(editor, monaco) => {
        ensureTheme(monaco);
        monaco.editor.setTheme(THEME_NAME);
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          onSave?.();
        });
        onMount?.(editor, monaco);
      }}
      onChange={(next) => onChange?.(next ?? '')}
      theme={THEME_NAME}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize,
        lineNumbers,
        wordWrap: wordWrap ? 'on' : 'off',
        tabSize: 2,
        insertSpaces: true,
        smoothScrolling: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: 'line',
        cursorSmoothCaretAnimation: 'on',
        roundedSelection: true,
        glyphMargin: false,
        folding: true,
        bracketPairColorization: { enabled: true },
        guides: {
          indentation: true,
          bracketPairs: true,
        },
      }}
    />
  );
}
