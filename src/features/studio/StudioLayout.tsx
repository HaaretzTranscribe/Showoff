import { Link, Outlet } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export function StudioLayout() {
  const { t } = useI18n();
  return (
    <div>
      <header>
        <strong>{t("common.appName")}</strong>
        <nav>
          <Link to="/studio/courses">{t("studio.nav.courses")}</Link>
        </nav>
        <LanguageSwitcher />
      </header>
      <Outlet />
    </div>
  );
}
