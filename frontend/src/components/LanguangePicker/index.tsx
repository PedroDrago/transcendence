"use client";
import { getCookie, setCookie } from '@/utils/cookies';
import { useEffect, useState } from 'react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português (Brasil)' },
];

const COOKIE_NAME = 'transcendence_locale';

interface Props {
  variant?: 'compact' | 'full';
}

export default function LanguagePicker({ variant = 'compact' }: Props) {
  const [lang, setLang] = useState('');

  useEffect(() => {
    let cookieLang = getCookie(COOKIE_NAME);
    if (!cookieLang) {
      cookieLang = navigator.language.split('-')[0];
      setCookie(COOKIE_NAME, cookieLang);
      location.reload();
    }
    setLang(cookieLang);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newLang = e.target.value;
    setLang(newLang);
    setCookie(COOKIE_NAME, newLang);
    window.location.reload();
  }

  if (variant === 'full') {
    return (
      <div className="lang-picker-full">
        {LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            className={`lang-option${lang === code ? ' lang-option--active' : ''}`}
            onClick={() => { if (lang !== code) { setCookie(COOKIE_NAME, code); window.location.reload(); } }}
          >
            <span className="lang-option-code">{code.toUpperCase()}</span>
            <span className="lang-option-label">{label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <select className="lang-select" value={lang} onChange={handleChange}>
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}
