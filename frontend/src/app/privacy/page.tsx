import { getTranslations } from 'next-intl/server';

export default async function PrivacyPolicy() {
  const t = await getTranslations('Privacy');

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1>{t('title')}</h1>
      <p>{t('lastUpdated')} {new Date().toLocaleDateString()}</p>

      <h2>{t('s1Title')}</h2>
      <p>{t('s1Body')}</p>

      <h2>{t('s2Title')}</h2>
      <p>{t('s2Intro')}</p>
      <ul>
        <li><strong>{t('s2Li1')}</strong></li>
        <li><strong>{t('s2Li2')}</strong></li>
        <li><strong>{t('s2Li3')}</strong></li>
        <li><strong>{t('s2Li4')}</strong></li>
      </ul>

      <h2>{t('s3Title')}</h2>
      <p>{t('s3Intro')}</p>
      <ul>
        <li>{t('s3Li1')}</li>
        <li>{t('s3Li2')}</li>
        <li>{t('s3Li3')}</li>
      </ul>

      <h2>{t('s4Title')}</h2>
      <p>{t('s4Body')}</p>

      <h2>{t('s5Title')}</h2>
      <p>{t('s5Intro')}</p>
      <ul>
        <li>{t('s5Li1')}</li>
        <li>{t('s5Li2')}</li>
        <li>{t('s5Li3')}</li>
        <li>{t('s5Li4')}</li>
        <li>{t('s5Li5')}</li>
        <li>{t('s5Li6')}</li>
        <li>{t('s5Li7')}</li>
      </ul>

      <p>{t('s5Outro')}</p>
    </div>
  );
}
