const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const MONACO_DIR = path.resolve(__dirname, './node_modules/monaco-editor');

module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        include: MONACO_DIR,
        use: ['style-loader', 'css-loader'],
      }
    ],
  },
  plugins: [
    new MonacoWebpackPlugin({
      languages: [
        'csharp',
        'css',
        'html',
        'javascript',
        'json',
        'markdown',
        'mysql',
        'php',
        'powershell',
        'python',
        'shell',
        'sql',
      ]
    }),
  ]
};