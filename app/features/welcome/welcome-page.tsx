import { useTranslation } from "react-i18next";

import logoDark from "./assets/logo-dark.svg";
import logoLight from "./assets/logo-light.svg";
import { WelcomeHeader } from "./components/welcome-header";
import { WelcomeResources } from "./components/welcome-resources";

export function WelcomePage() {
  const { t } = useTranslation("welcome");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <WelcomeHeader />

      <section className="flex flex-col items-center gap-12 pt-8 pb-16">
        <div className="w-[500px] max-w-[100vw] p-4">
          <img
            src={logoLight}
            alt="React Router"
            className="block w-full dark:hidden"
          />
          <img
            src={logoDark}
            alt="React Router"
            className="hidden w-full dark:block"
          />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="w-full max-w-sm space-y-6 px-4">
          <WelcomeResources />
        </div>
      </section>
    </main>
  );
}
