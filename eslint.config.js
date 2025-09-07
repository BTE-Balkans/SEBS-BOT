import { neostandard } from "neostandard";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier";
import { configs as tsconfigs} from "typescript-eslint"

export default [
    ...neostandard({
        ts: true,
        filesTs: ['**/*.ts']
    }),
    tsconfigs.recommended,
    eslintConfigPrettier,
    {
        plugins: {
            prettier: eslintPluginPrettier
        },
        rules: {
            "prettier/prettier": "error",
            "indent": "off",
            "handle-callback-err": "off",
            "eqeqeq": "off"
        }
    }
]