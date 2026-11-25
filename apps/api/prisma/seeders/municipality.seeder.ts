import type {
  Municipality,
  PrismaClient,
} from '../../src/generated/prisma/client.js';

const demoAddressId = '54f6636e-b097-45b7-9991-c83a59b01805';

/**
 * Creates a demo municipality for manual testing and preserves edits on reruns.
 */
export async function seedMunicipality(
  prisma: PrismaClient,
): Promise<Municipality> {
  return prisma.municipality.upsert({
    where: { addressId: demoAddressId },
    update: {},
    create: {
      name: 'Demokommune',
      region: 'Region Syddanmark',
      email: 'kommune@example.test',
      phoneNumber: '12345678',
      address: {
        connectOrCreate: {
          where: { uuid: demoAddressId },
          create: {
            uuid: demoAddressId,
            street: 'Flakhaven',
            houseNumber: '2',
            postalCode: '5000',
            city: 'Odense C',
          },
        },
      },
    },
  });
}

// Names and regions: https://www.dst.dk/da/Statistik/kommunekort/kommunefakta
// Fixed development IDs with synthetic contact and address data.
const municipalities = [
  { id: 10001, name: 'København', region: 'Hovedstaden' },
  { id: 10002, name: 'Frederiksberg', region: 'Hovedstaden' },
  { id: 10003, name: 'Ballerup', region: 'Hovedstaden' },
  { id: 10004, name: 'Gentofte', region: 'Hovedstaden' },
  { id: 10005, name: 'Gladsaxe', region: 'Hovedstaden' },
  { id: 10006, name: 'Helsingør', region: 'Hovedstaden' },
  { id: 10007, name: 'Hillerød', region: 'Hovedstaden' },
  { id: 10008, name: 'Hvidovre', region: 'Hovedstaden' },
  { id: 10041, name: 'Albertslund', region: 'Hovedstaden' },
  { id: 10042, name: 'Allerød', region: 'Hovedstaden' },
  { id: 10043, name: 'Bornholm', region: 'Hovedstaden' },
  { id: 10044, name: 'Brøndby', region: 'Hovedstaden' },
  { id: 10045, name: 'Dragør', region: 'Hovedstaden' },
  { id: 10046, name: 'Egedal', region: 'Hovedstaden' },
  { id: 10047, name: 'Fredensborg', region: 'Hovedstaden' },
  { id: 10048, name: 'Frederikssund', region: 'Hovedstaden' },
  { id: 10049, name: 'Furesø', region: 'Hovedstaden' },
  { id: 10050, name: 'Glostrup', region: 'Hovedstaden' },
  { id: 10051, name: 'Gribskov', region: 'Hovedstaden' },
  { id: 10052, name: 'Halsnæs', region: 'Hovedstaden' },
  { id: 10053, name: 'Herlev', region: 'Hovedstaden' },
  { id: 10054, name: 'Høje-Taastrup', region: 'Hovedstaden' },
  { id: 10055, name: 'Hørsholm', region: 'Hovedstaden' },
  { id: 10056, name: 'Ishøj', region: 'Hovedstaden' },
  { id: 10057, name: 'Lyngby-Taarbæk', region: 'Hovedstaden' },
  { id: 10058, name: 'Rudersdal', region: 'Hovedstaden' },
  { id: 10059, name: 'Rødovre', region: 'Hovedstaden' },
  { id: 10060, name: 'Tårnby', region: 'Hovedstaden' },
  { id: 10061, name: 'Vallensbæk', region: 'Hovedstaden' },
  { id: 10009, name: 'Roskilde', region: 'Sjælland' },
  { id: 10010, name: 'Køge', region: 'Sjælland' },
  { id: 10011, name: 'Greve', region: 'Sjælland' },
  { id: 10012, name: 'Holbæk', region: 'Sjælland' },
  { id: 10013, name: 'Kalundborg', region: 'Sjælland' },
  { id: 10014, name: 'Ringsted', region: 'Sjælland' },
  { id: 10015, name: 'Slagelse', region: 'Sjælland' },
  { id: 10016, name: 'Næstved', region: 'Sjælland' },
  { id: 10062, name: 'Faxe', region: 'Sjælland' },
  { id: 10063, name: 'Guldborgsund', region: 'Sjælland' },
  { id: 10064, name: 'Lejre', region: 'Sjælland' },
  { id: 10065, name: 'Lolland', region: 'Sjælland' },
  { id: 10066, name: 'Odsherred', region: 'Sjælland' },
  { id: 10067, name: 'Solrød', region: 'Sjælland' },
  { id: 10068, name: 'Sorø', region: 'Sjælland' },
  { id: 10069, name: 'Stevns', region: 'Sjælland' },
  { id: 10070, name: 'Vordingborg', region: 'Sjælland' },
  { id: 10017, name: 'Odense', region: 'Syddanmark' },
  { id: 10018, name: 'Svendborg', region: 'Syddanmark' },
  { id: 10019, name: 'Middelfart', region: 'Syddanmark' },
  { id: 10020, name: 'Faaborg-Midtfyn', region: 'Syddanmark' },
  { id: 10021, name: 'Kerteminde', region: 'Syddanmark' },
  { id: 10022, name: 'Billund', region: 'Syddanmark' },
  { id: 10023, name: 'Esbjerg', region: 'Syddanmark' },
  { id: 10024, name: 'Vejle', region: 'Syddanmark' },
  { id: 10071, name: 'Assens', region: 'Syddanmark' },
  { id: 10072, name: 'Fanø', region: 'Syddanmark' },
  { id: 10073, name: 'Fredericia', region: 'Syddanmark' },
  { id: 10074, name: 'Haderslev', region: 'Syddanmark' },
  { id: 10075, name: 'Kolding', region: 'Syddanmark' },
  { id: 10076, name: 'Langeland', region: 'Syddanmark' },
  { id: 10077, name: 'Nordfyns', region: 'Syddanmark' },
  { id: 10078, name: 'Nyborg', region: 'Syddanmark' },
  { id: 10079, name: 'Sønderborg', region: 'Syddanmark' },
  { id: 10080, name: 'Tønder', region: 'Syddanmark' },
  { id: 10081, name: 'Varde', region: 'Syddanmark' },
  { id: 10082, name: 'Vejen', region: 'Syddanmark' },
  { id: 10083, name: 'Ærø', region: 'Syddanmark' },
  { id: 10084, name: 'Aabenraa', region: 'Syddanmark' },
  { id: 10025, name: 'Aarhus', region: 'Midtjylland' },
  { id: 10026, name: 'Silkeborg', region: 'Midtjylland' },
  { id: 10027, name: 'Viborg', region: 'Midtjylland' },
  { id: 10028, name: 'Randers', region: 'Midtjylland' },
  { id: 10029, name: 'Herning', region: 'Midtjylland' },
  { id: 10030, name: 'Holstebro', region: 'Midtjylland' },
  { id: 10031, name: 'Horsens', region: 'Midtjylland' },
  { id: 10032, name: 'Skanderborg', region: 'Midtjylland' },
  { id: 10085, name: 'Favrskov', region: 'Midtjylland' },
  { id: 10086, name: 'Hedensted', region: 'Midtjylland' },
  { id: 10087, name: 'Ikast-Brande', region: 'Midtjylland' },
  { id: 10088, name: 'Lemvig', region: 'Midtjylland' },
  { id: 10089, name: 'Norddjurs', region: 'Midtjylland' },
  { id: 10090, name: 'Odder', region: 'Midtjylland' },
  { id: 10091, name: 'Ringkøbing-Skjern', region: 'Midtjylland' },
  { id: 10092, name: 'Samsø', region: 'Midtjylland' },
  { id: 10093, name: 'Skive', region: 'Midtjylland' },
  { id: 10094, name: 'Struer', region: 'Midtjylland' },
  { id: 10095, name: 'Syddjurs', region: 'Midtjylland' },
  { id: 10033, name: 'Aalborg', region: 'Nordjylland' },
  { id: 10034, name: 'Hjørring', region: 'Nordjylland' },
  { id: 10035, name: 'Frederikshavn', region: 'Nordjylland' },
  { id: 10036, name: 'Brønderslev', region: 'Nordjylland' },
  { id: 10037, name: 'Jammerbugt', region: 'Nordjylland' },
  { id: 10038, name: 'Thisted', region: 'Nordjylland' },
  { id: 10039, name: 'Rebild', region: 'Nordjylland' },
  { id: 10040, name: 'Vesthimmerlands', region: 'Nordjylland' },
  { id: 10096, name: 'Læsø', region: 'Nordjylland' },
  { id: 10097, name: 'Mariagerfjord', region: 'Nordjylland' },
  { id: 10098, name: 'Morsø', region: 'Nordjylland' },
];

/** Seeds the municipality choices with fixed IDs and preserves existing records. */
export async function seedMunicipalities(
  prisma: PrismaClient,
): Promise<{ id: number }[]> {
  return prisma.$transaction(async (tx) => {
    const seeded: { id: number }[] = [];
    for (const municipality of municipalities) {
      const existing = await tx.municipality.findUnique({
        where: { id: municipality.id },
        select: { id: true },
      });
      if (existing) {
        seeded.push(existing);
        continue;
      }

      const address = await tx.address.create({
        data: {
          street: 'Testvej',
          houseNumber: '1',
          postalCode: '0000',
          city: municipality.name,
        },
        select: { uuid: true },
      });
      const created = await tx.municipality.create({
        data: {
          ...municipality,
          email: `municipality-${municipality.id}@example.com`,
          phoneNumber: '00000000',
          addressId: address.uuid,
        },
        select: { id: true },
      });
      seeded.push(created);
    }
    return seeded;
  });
}
