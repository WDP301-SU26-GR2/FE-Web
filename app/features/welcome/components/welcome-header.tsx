import { useTranslation } from "react-i18next";

import { LanguageSwitcher, ThemeToggle } from "~/shared/components";

export function WelcomeHeader() {
  const { t } = useTranslation("common");
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <span className="text-lg font-semibold text-primary">{t("appName")}</span>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
