export default {
  locales: ['en', 'da'],
  output: 'locales/$LOCALE/$NAMESPACE.json',
  // Keys used through label maps or built from enum values, which the
  // parser cannot find in the source.
  keepRemoved: [
    /^applicationWizard\.steps\./,
    /^areas\.labels\./,
    /^areas\.fields\./,
    /^areas\.errors\./,
    /^mapStep\.resultCount_/,
  ],
};
