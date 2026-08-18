"use client";

export function LanguageToggle() {
  const changeLanguage = (next: "fr" | "en") => {
    document.documentElement.dataset.lang = next;
    document.documentElement.lang = next;
    window.localStorage.setItem("cameroon-language", next);
  };

  return (
    <div className="language-toggle" aria-label="Language / Langue">
      <button
        type="button"
        className="lang-fr-button"
        onClick={() => changeLanguage("fr")}
        aria-label="Afficher le site en français"
      >
        FR
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        className="lang-en-button"
        onClick={() => changeLanguage("en")}
        aria-label="Display the site in English"
      >
        EN
      </button>
    </div>
  );
}
