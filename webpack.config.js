const TerserPlugin = require('terser-webpack-plugin');
const { DefinePlugin } = require('webpack');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

const env = (process.env.NODE_ENV || 'production') === 'production' ? 'production' : 'development';
const isServe = process.env.WEBPACK_SERVE === 'true';
const isProduction = env === 'production';
const libBaseName = 'waterfall';
// md5 random id
const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const config = {
    mode : isProduction ? 'production' : 'development',
    entry : {
        waterfall : './assets/ts/waterfall.ts',
    },
    output : {
        library : {
            name : {
                root : libBaseName,
                amd : `amd-${libBaseName}`,
                commonjs : `common-${libBaseName}`,
            },
            type : 'umd',
        },
        path : __dirname,
        filename : "dist/[name].js",
        hotUpdateChunkFilename: './tmp/[name].hot-update.js',
        hotUpdateMainFilename: './tmp/[runtime].hot-update.json',
        publicPath: "./"
    },
    watchOptions : {
        ignored : /(^[\/\\](node_modules|vendor|js|css|img|fonts)[\/\\]|\.(lock|md|log|php|ya?ml)$|(^|[\/\\])\.)/,
        aggregateTimeout : 300,
        poll : 1000,
        followSymlinks : true,
    },
    devServer : {
        hot : true,
        headers : {
            'Access-Control-Allow-Origin' : '*'
        },
        allowedHosts : ['all'],
        liveReload : false,
        devMiddleware: {
            publicPath: "./",
            serverSideRender: true,
            writeToDisk: true
        },
        client: {
            webSocketURL: 'ws://localhost:9091/ws',
            overlay: {
                warnings: true,
                errors: true,
            },
        },
        port: 9091,
        webSocketServer: 'ws',
        watchFiles : [
            'assets/**/*.{ts,scss}',
        ],
    },
    devtool : isProduction ? false : 'source-map',
    resolve : {
        extensions : [
            '.js',
            '.ts',
            '.scss',
        ],
    },
    plugins : [
        new DefinePlugin({
            'process': {
                env: {
                    BUILD_ID : JSON.stringify(id),
                    ENVIRONMENT : JSON.stringify(isProduction),
                }
            },
        })
        // new HotModuleReplacementPlugin()
    ],
    optimization : {
        minimize : isProduction,
        minimizer : [
            new TerserPlugin({
                parallel : true,
                terserOptions : {
                    compress : {
                        drop_console : isProduction
                    },
                    output : {
                        comments : !isProduction,
                    },
                },
                extractComments : false,
            }),
            new CssMinimizerPlugin({
                minimizerOptions : {
                    preset : [
                        "default",
                        {
                            discardComments : {
                                removeAll : true
                            },
                        },
                    ],
                },
            }),
        ],
    },
    module : {
        rules : [
            {
                resourceQuery: /raw/,
                type: 'asset/source'
            },
            {
                test: /\.(te?xt|sqrl)$/,
                type: 'asset/source'
            },
            {
                test : /\.ts$/,
                use : {
                    loader : 'ts-loader'
                },
                exclude : /node_modules/
            },
            {
                test : /\.(s[ac]ss)$/,
                use : [
                    'style-loader',
                    'css-loader',
                    'postcss-loader',
                    {
                        loader : 'sass-loader',
                        options : {
                            sassOptions : {
                                silenceDeprecations: ['legacy-js-api'],
                                quietDeps : true
                            }
                        }
                    },
                ]
            }
        ],
    }
};
if (!isProduction && !isServe) {
    config.watch = true;
}

module.exports = () => config;