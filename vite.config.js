import { defineConfig, loadEnv } from "vite"
import { resolve } from "path"

export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        }
    },

    plugins: [],

    // https://github.com/vitejs/vite/issues/1930
    // https://vitejs.dev/guide/env-and-mode.html#env-files
    // https://github.com/vitejs/vite/discussions/3058#discussioncomment-2115319
    // 在这里自定义变量
    // define: {
    //     "process.env.DEV_MODE": `"${isWatch}"`,
    //     "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
    // },

    build: {
        // 输出路径
        outDir: 'dist',
        emptyOutDir: false,

        // 构建后是否生成 source map 文件
        sourcemap: false,

        // 设置为 false 可以禁用最小化混淆
        // 或是用来指定是应用哪种混淆器
        // boolean | 'terser' | 'esbuild'
        // 不压缩，用于调试
        minify: false,

        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, "src/index.ts"),
            // the proper extensions will be added
            name: 'siyuan-background',
            fileName: (format) => `siyuan-background.${format}.js`,
            formats: ["cjs", "es"],
        },
        rollupOptions: {
            //     plugins: [
            //         ...(
            //             isWatch ? [
            //                 livereload(devDistDir),
            //                 {
            //                     //监听静态资源文件
            //                     name: 'watch-external',
            //                     async buildStart() {
            //                         const files = await fg([
            //                             'public/i18n/**',
            //                             './README*.md',
            //                             './plugin.json'
            //                         ]);
            //                         for (let file of files) {
            //                             this.addWatchFile(file);
            //                         }
            //                     }
            //                 }
            //             ] : [
            //                 zipPack({
            //                     inDir: './dist',
            //                     outDir: './',
            //                     outFileName: 'package.zip'
            //                 })
            //             ]
            //         )
            //     ],

            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ["require", "process"],

            // output: {
            //     entryFileNames: "[name].js",
            // },
        },
    }
})
