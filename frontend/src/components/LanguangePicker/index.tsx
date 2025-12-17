"use client";
import { getCookie, setCookie } from '@/utils/cookies';
import { useEffect, useState } from 'react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português (Brasil)' },
];

export default function LanguagePicker() {
  const COOKIE_NAME = 'transcendence_locale';
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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLang(newLang);
    setCookie(COOKIE_NAME, newLang);
    window.location.reload(); // Optional: reload to apply language
  };

  return (
    <select value={lang} onChange={handleChange}>
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}
