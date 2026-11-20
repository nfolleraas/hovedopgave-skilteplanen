const fetchFromNetwork = globalThis.fetch;

globalThis.fetch = (input, options) => {
  const url = new URL(input instanceof Request ? input.url : input);

  if (
    url.origin === 'https://adressevaelger.dk' &&
    url.pathname === '/adresser/soeg'
  ) {
    const fixture = url.searchParams.get('tekst')?.startsWith('Vestergade');
    return Promise.resolve(
      Response.json({
        status: 'ok',
        fund: fixture
          ? [
              {
                id: 'test-house',
                husnummer: 'test-house',
                type: 'husnummer',
                titel: 'Vestergade 1, 8000 Aarhus C',
              },
            ]
          : [],
      }),
    );
  }

  return fetchFromNetwork(input, options);
};
