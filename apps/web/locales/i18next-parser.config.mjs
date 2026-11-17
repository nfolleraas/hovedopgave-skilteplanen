export default {
  locales: ['en', 'da'],
  output: 'locales/$LOCALE/$NAMESPACE.json',
  // Keys used through label maps, variables or enum values, which the parser
  // cannot find in the source. The parser tests keys as `translation:<key>`,
  // and tests a whole missing group (e.g. `areas.labels`) as one key, so each
  // pattern must match both the group and the keys inside it.
  keepRemoved: [
    /^translation:applicationWizard\.steps(\.|$)/,
    /^translation:applicationWizard\.(caseNotFound|loadError)$/,
    /^translation:areas\.labels(\.|$)/,
    /^translation:areas\.fields(\.|$)/,
    /^translation:areas\.errors(\.|$)/,
    /^translation:areas\.deleteDialog\.none$/,
    /^translation:mapStep\.resultCount_/,
    /^translation:devApplications\.statuses(\.|$)/,
    /^translation:wizard\.enums(\.|$)/,
    /^translation:wizard\.errors(\.|$)/,
    /^translation:wizard\.period\.intro(\.|$)/,
  ],
};
