import LanguagePicker from '@/components/LanguangePicker';
import {getTranslations} from 'next-intl/server';

interface MetadataProps {
    params: { locale: string };
}

export async function generateMetadata({ params }: MetadataProps): Promise<{title: string}> {
    const t = await getTranslations('HomePage');
    return {
        title: t('title'),
    };
}

export default async function HomePage() {
  const t = await getTranslations('HomePage');
  return (
    <>
      <h1>
        {t('title')}
      </h1>
        <LanguagePicker />
    </>
  );
}