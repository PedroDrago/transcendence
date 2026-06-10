import { getTranslations } from 'next-intl/server';

export default async function TermsOfService() {
  const t = await getTranslations('Terms');

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1>{t('title')}</h1>
      <p>{t('lastUpdated')} {new Date().toLocaleDateString()}</p>

      <h2>{t('s1Title')}</h2>
      <p>{t('s1Body')}</p>

      <h2>{t('s2Title')}</h2>
      <p>{t('s2Intro')}</p>
      <ul>
        <li>{t('s2Li1')}</li>
        <li>{t('s2Li2')}</li>
        <li>{t('s2Li3')}</li>
        <li>{t('s2Li4')}</li>
      </ul>

      <h2>{t('s3Title')}</h2>
      <p>{t('s3Body')}</p>

      <h2>{t('s4Title')}</h2>
      <p>{t('s4Intro')}</p>
      <ul>
        <li>{t('s4Li1')}</li>
        <li>{t('s4Li2')}</li>
        <li>{t('s4Li3')}</li>
        <li>{t('s4Li4')}</li>
      </ul>

      <h2>{t('s5Title')}</h2>
      <p>{t('s5Body')}</p>
    </div>
  );
}
