export const releaseFiles = [
  'AGENTS.md', '.gitignore', 'package.json', 'docs/releases/sellers.md',
  'scripts/sellers-release-policy.mjs', 'scripts/check-sellers-release.mjs', 'tests/sellers-release.test.mjs',
  'app/account/wholesale/page.tsx', 'components/CommercialAccess.tsx', 'components/WholesaleApplication.tsx',
  'components/CatalogPage.tsx', 'components/HomeSteamPage.tsx', 'components/HomeProductCard.tsx', 'components/ProductCardCatalog.tsx', 'lib/catalog/activeProduct.ts', 'components/catalog/ProductQuickView.tsx', 'components/BottomNav.tsx', 'middleware.ts',
  'app/api/sellers/route.ts', 'lib/server/catalog.ts', 'lib/server/sellerCatalog.ts', 'lib/server/sellerOrderContract.ts',
  'scripts/merge-admin-catalog.mjs', 'scripts/read-admin-catalog.mjs', 'scripts/sellerCatalogReader.mjs', 'scripts/sellers-catalog-local.mjs',
  'tests/sellerOrderContract.test.mjs',
];
const allowed = new Set(releaseFiles);
export function outsideRelease(paths) { return paths.filter(path => !allowed.has(path)); }
export function guideAdditions(diff) {return diff.split(/\r?\n/).filter(line=>line.startsWith('+')&&!line.startsWith('+++')&&/(?:\bgu[ií]a\b|\/guia(?:\/|[?"'])|onAskGuide|GuiaViewport)/i.test(line));}



