import { getLanguage } from "obsidian";
import en from "./en";
import zh from "./zh";

const localeMap: Record<string, Record<string, string>> = {
    en,
    zh,
    "zh-cn": zh,
    "zh-tw": zh,
};

let localeOverride: "auto" | "en" | "zh" = "auto";

export function setLocaleOverride(locale: "auto" | "en" | "zh"): void {
    localeOverride = locale;
}

export function getResolvedLocale(): string {
    if (localeOverride !== "auto") {
        return localeOverride;
    }
    return getLanguage().toLowerCase().split("-")[0];
}

export function t(key: string, params?: Record<string, string | number>): string {
    const lang = localeOverride !== "auto"
        ? localeOverride
        : getLanguage().toLowerCase();
    const normalizedLang = lang.toLowerCase();

    let str =
        localeMap[normalizedLang]?.[key] ??
        localeMap[normalizedLang.split("-")[0]]?.[key] ??
        en[key];

    if (str === undefined) {
        console.warn(`[moving-note] Missing translation key: ${key}`);
        return key;
    }

    if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
            str = str.replace(
                new RegExp(`\\{\\{${paramKey}\\}\\}`, "g"),
                String(paramValue)
            );
        }
    }

    return str;
}
