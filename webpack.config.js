const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const { SourceMapDevToolPlugin, DefinePlugin } = require("webpack");
const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Hash del contenido de cada imagen de static/images para versionar sus URLs
// desde Vue (assetUrl): solo cambian cuando cambia el archivo.
function versionesDeImagenes() {
  const dir = path.resolve(__dirname, 'static/images');
  const versiones = {};
  const recorrer = (actual) => {
    fs.readdirSync(actual, { withFileTypes: true }).forEach((entrada) => {
      const ruta = path.join(actual, entrada.name);
      if (entrada.isDirectory()) return recorrer(ruta);
      const url = '/' + path.relative(path.resolve(__dirname, 'static'), ruta).split(path.sep).join('/');
      versiones[url] = crypto.createHash('md5').update(fs.readFileSync(ruta)).digest('hex').slice(0, 10);
    });
  };
  if (fs.existsSync(dir)) recorrer(dir);
  return versiones;
}

module.exports = {
  entry: {
    app: path.resolve(__dirname, 'src/index.js')
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'static/'),
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.svg$/,
        type: 'asset/source',
      },
      {
        test: /\.(png|jpg|gif)$/,
        loader: 'file-loader',
        options: {
          outputPath: 'static/images/'
        }
      },
      {
        test: /\.(ttf|eot|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[contenthash][ext]',
        },
      },
    ],
  },
  resolve: {
    alias: {
      'gonmotor-icons': path.resolve(__dirname, 'src/icons'),
      '@': path.resolve(__dirname, 'src')
    },
    extensions: ['', '.js', '.jsx', '.css']
  },
  plugins: [
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin(),
    new DefinePlugin({
      __ASSET_VERSIONS__: JSON.stringify(versionesDeImagenes()),
    }),
    new SourceMapDevToolPlugin({
      filename: "[file].map"
    })
  ],
  optimization: {
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ['default', { calc: false }],
        },
      })
    ]
  },
};