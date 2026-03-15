import { createContext, useContext, useState, ReactNode } from "react";
import { translations, Lang, LangKey } from "./i18n";

interface LangContextValue {
    lang: Lang;
    setLang: (l: Lang) => void;
    t: (key: LangKey | string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Lang>("en");

    const t = (key: LangKey | string): string =>
        (translations[lang] as Record<string, string>)[key] ?? key;

    return (
        <LangContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LangContext.Provider>
    );
}

export function useLang() {
    const ctx = useContext(LangContext);
    if (!ctx) throw new Error("useLang must be used within LangProvider");
    return ctx;
}
