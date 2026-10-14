/** @type {import("prettier").Config} */
export default {
    semi: true,
    tabWidth: 2,
    printWidth: 120,
    singleQuote: false,
    trailingComma: "all",
    bracketSpacing: true,
    arrowParens: "always",
    bracketSameLine: true,

    plugins: ["prettier-plugin-astro"],

    overrides: [
        {
            files: "*.astro",
            options: { parser: "astro" },
        },
    ],
};
