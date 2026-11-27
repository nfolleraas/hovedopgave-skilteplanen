export default {
  locales: ['en', 'da'],
  output: 'locales/$LOCALE/$NAMESPACE.json',
  // The translation files are the source of truth. The parser cannot find keys
  // built at runtime (label maps, enum values, plurals), so it only adds the
  // static keys it finds and never removes existing ones. `locale:check`
  // verifies that both catalogs are complete and aligned.
  keepRemoved: true,
  createOldCatalogs: false,
};
