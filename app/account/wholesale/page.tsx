import CommercialAccess from '@/components/CommercialAccess';

export const dynamic = 'force-dynamic';

function sellerLoginUrl() {
  try {
    const url = new URL(process.env.SELLERS_URL || '');
    const local = process.env.NODE_ENV !== 'production' && ['127.0.0.1', 'localhost'].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return null;
    return url.origin + '/login';
  } catch { return null; }
}

export default function WholesalePage() {
  return <CommercialAccess sellersUrl={sellerLoginUrl()} />;
}
