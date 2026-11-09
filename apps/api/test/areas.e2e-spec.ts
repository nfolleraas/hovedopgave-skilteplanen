import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { ApplicationType, Status } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TestApplications } from './support/test-applications.js';

// Functional tests for the areas feature (UC-034, UC-035, UC-036). They call
// the API over HTTP with the same validation as production and check the
// result in the development database.

const strandvej = {
  roadName: 'Strandvej',
  roadOwnership: 'Municipality',
  postalCode: '5000',
};

const kirkestraede = {
  roadName: 'Kirkestræde',
  roadOwnership: 'Private',
  postalCode: '5000',
};

const excavationDetails = {
  houseNumberFrom: '10',
  houseNumberTo: '24',
  roadSection: 'Pavement',
  roadSide: 'Right',
  direction: 'Along',
  lengthInMeters: 18,
  widthInMeters: 0.6,
  depthInMeters: 1.2,
};

const roadUseDetails = {
  alternativeDescription: 'Ud for havnen',
  roadSection: 'RoadVerge',
  roadSide: 'Left',
  lengthInMeters: 6,
  widthInMeters: 2.5,
};

describe('Areas API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let applications: TestApplications;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    applications = new TestApplications(prisma);
  });

  afterAll(async () => {
    await applications?.removeAll();
    await app?.close();
  });

  const api = () => request(app.getHttpServer());

  /** Creates areas through the road search endpoint and returns them. */
  async function createSearchedAreas(caseNumber: string, roads: object[]) {
    const response = await api()
      .post('/api/areas/bulk')
      .send({ applicationId: caseNumber, areas: roads })
      .expect(201);
    return response.body as { uuid: string }[];
  }

  async function countAreas(caseNumber: string): Promise<number> {
    return prisma.area.count({ where: { applicationId: caseNumber } });
  }

  describe('UC-034: create area', () => {
    it('creates one area per road chosen in the road search', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );

      const created = await createSearchedAreas(caseNumber, [
        strandvej,
        kirkestraede,
      ]);

      expect(created).toHaveLength(2);
      expect(created[0]).toMatchObject({
        applicationId: caseNumber,
        ...strandvej,
        roadSection: null,
        lengthInMeters: null,
        areaInSquareMeters: null,
      });

      const list = await api()
        .get('/api/areas')
        .query({ applicationId: caseNumber })
        .expect(200);
      expect(list.body.application).toEqual({
        caseNumber,
        type: ApplicationType.ExcavationPermit,
        status: Status.Draft,
      });
      expect(
        list.body.areas.map((area: { roadName: string }) => area.roadName),
      ).toEqual(expect.arrayContaining(['Strandvej', 'Kirkestræde']));
    });

    it('lets the applicant fill in the details of a searched road', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );
      const [area] = await createSearchedAreas(caseNumber, [strandvej]);

      const updated = await api()
        .patch(`/api/areas/${area.uuid}`)
        .send(excavationDetails)
        .expect(200);

      expect(updated.body).toMatchObject({
        ...strandvej,
        ...excavationDetails,
      });
      expect(updated.body.areaInSquareMeters).toBeCloseTo(10.8);

      const stored = await prisma.area.findUniqueOrThrow({
        where: { uuid: area.uuid },
        include: { areaDetail: true, areaSize: true },
      });
      expect(stored.areaDetail).toMatchObject({
        roadSection: 'Pavement',
        roadSide: 'Right',
        direction: 'Along',
      });
      expect(stored.areaSize?.areaInSquareMeters).toBeCloseTo(10.8);
    });

    it('creates a complete road entered manually (A3)', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );

      const response = await api()
        .post('/api/areas')
        .send({
          applicationId: caseNumber,
          ...strandvej,
          ...excavationDetails,
          roadSection: 'Other',
          roadSectionDescription: 'Parkeringsplads',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        roadSection: 'Other',
        roadSectionDescription: 'Parkeringsplads',
        depthInMeters: 1.2,
      });
      await api().get(`/api/areas/${response.body.uuid}`).expect(200);
    });

    it('creates road use areas without direction and depth (A1)', async () => {
      const caseNumber = await applications.create(
        ApplicationType.RoadUsePermit,
      );

      const response = await api()
        .post('/api/areas')
        .send({ applicationId: caseNumber, ...strandvej, ...roadUseDetails })
        .expect(201);

      expect(response.body).toMatchObject({
        direction: null,
        depthInMeters: null,
        areaInSquareMeters: 15,
      });
    });

    it('rejects direction and depth for road use areas (A1)', async () => {
      const caseNumber = await applications.create(
        ApplicationType.RoadUsePermit,
      );

      const response = await api()
        .post('/api/areas')
        .send({
          applicationId: caseNumber,
          ...strandvej,
          ...roadUseDetails,
          direction: 'Along',
          depthInMeters: 1,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        code: 'AREA_FIELDS_NOT_ALLOWED',
        invalidFields: ['direction', 'depthInMeters'],
      });
      expect(await countAreas(caseNumber)).toBe(0);
    });

    it('requires house numbers or an alternative description (F1)', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );
      const [area] = await createSearchedAreas(caseNumber, [strandvej]);

      const rejected = await api()
        .patch(`/api/areas/${area.uuid}`)
        .send({
          ...excavationDetails,
          houseNumberFrom: null,
          houseNumberTo: null,
        })
        .expect(400);
      expect(rejected.body).toMatchObject({
        code: 'AREA_INVALID',
        invalidFields: [
          'houseNumberFrom',
          'houseNumberTo',
          'alternativeDescription',
        ],
      });

      await api()
        .patch(`/api/areas/${area.uuid}`)
        .send({
          ...excavationDetails,
          houseNumberFrom: null,
          houseNumberTo: null,
          alternativeDescription: 'Ud for havnen',
        })
        .expect(200);
    });

    it('does not store half-filled details', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );

      const response = await api()
        .post('/api/areas')
        .send({ applicationId: caseNumber, ...strandvej, lengthInMeters: 5 })
        .expect(400);

      expect(response.body.code).toBe('AREA_INVALID');
      expect(await countAreas(caseNumber)).toBe(0);
    });

    it('saves no roads when one of them is invalid', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );

      await api()
        .post('/api/areas/bulk')
        .send({
          applicationId: caseNumber,
          areas: [strandvej, { ...kirkestraede, widthInMeters: 2 }],
        })
        .expect(400);

      expect(await countAreas(caseNumber)).toBe(0);
    });

    it.each([
      ['a postal code that is not 4 digits', { postalCode: '50' }],
      ['an unknown road status', { roadOwnership: 'State' }],
      ['a size of 0', { lengthInMeters: 0 }],
      ['a field that is not part of an area', { areaInSquareMeters: 99 }],
    ])('rejects %s', async (_name, change) => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );

      await api()
        .post('/api/areas')
        .send({ applicationId: caseNumber, ...strandvej, ...change })
        .expect(400);

      expect(await countAreas(caseNumber)).toBe(0);
    });

    it('requires at least one road', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );

      await api()
        .post('/api/areas/bulk')
        .send({ applicationId: caseNumber, areas: [] })
        .expect(400);
    });

    it('rejects areas for an unknown application', async () => {
      const response = await api()
        .post('/api/areas')
        .send({ applicationId: 'E2E-AREAS-MISSING', ...strandvej })
        .expect(404);

      expect(response.body.code).toBe('APPLICATION_NOT_FOUND');
      await api()
        .get('/api/areas')
        .query({ applicationId: 'E2E-AREAS-MISSING' })
        .expect(404);
    });
  });

  describe('UC-036: update area', () => {
    it('keeps saved details that are not part of the update', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );
      const [area] = await createSearchedAreas(caseNumber, [strandvej]);
      await api()
        .patch(`/api/areas/${area.uuid}`)
        .send(excavationDetails)
        .expect(200);

      const response = await api()
        .patch(`/api/areas/${area.uuid}`)
        .send({ lengthInMeters: 25 })
        .expect(200);

      expect(response.body).toMatchObject({
        ...excavationDetails,
        lengthInMeters: 25,
        areaInSquareMeters: 15,
      });
    });

    it('reuses the detail and size records on later updates', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );
      const [area] = await createSearchedAreas(caseNumber, [strandvej]);
      await api()
        .patch(`/api/areas/${area.uuid}`)
        .send(excavationDetails)
        .expect(200);
      const first = await prisma.area.findUniqueOrThrow({
        where: { uuid: area.uuid },
      });

      await api()
        .patch(`/api/areas/${area.uuid}`)
        .send({ roadSide: 'Both' })
        .expect(200);

      const second = await prisma.area.findUniqueOrThrow({
        where: { uuid: area.uuid },
      });
      expect(second.areaDetailId).toBe(first.areaDetailId);
      expect(second.areaSizeId).toBe(first.areaSizeId);
    });

    it('leaves the saved area unchanged when the update is invalid', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );
      const [area] = await createSearchedAreas(caseNumber, [strandvej]);
      await api()
        .patch(`/api/areas/${area.uuid}`)
        .send(excavationDetails)
        .expect(200);

      await api()
        .patch(`/api/areas/${area.uuid}`)
        .send({ roadSection: 'Other', lengthInMeters: 30 })
        .expect(400);

      const stored = await api().get(`/api/areas/${area.uuid}`).expect(200);
      expect(stored.body).toMatchObject({
        roadSection: 'Pavement',
        lengthInMeters: 18,
      });
    });

    it('rejects an unknown area', async () => {
      const response = await api()
        .patch('/api/areas/00000000-0000-0000-0000-000000000000')
        .send(excavationDetails)
        .expect(404);

      expect(response.body.code).toBe('AREA_NOT_FOUND');
    });
  });

  describe('UC-035: delete area', () => {
    it('deletes the area with its detail and size records', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );
      const [area] = await createSearchedAreas(caseNumber, [
        strandvej,
        kirkestraede,
      ]);
      await api()
        .patch(`/api/areas/${area.uuid}`)
        .send(excavationDetails)
        .expect(200);
      const stored = await prisma.area.findUniqueOrThrow({
        where: { uuid: area.uuid },
      });

      await api().delete(`/api/areas/${area.uuid}`).expect(204);

      await api().get(`/api/areas/${area.uuid}`).expect(404);
      expect(await countAreas(caseNumber)).toBe(1);
      expect(
        await prisma.areaDetail.count({
          where: { uuid: stored.areaDetailId ?? '' },
        }),
      ).toBe(0);
      expect(
        await prisma.areaSize.count({
          where: { uuid: stored.areaSizeId ?? '' },
        }),
      ).toBe(0);
    });

    it('keeps the last area of an application (F1)', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );
      const [area] = await createSearchedAreas(caseNumber, [strandvej]);

      const response = await api()
        .delete(`/api/areas/${area.uuid}`)
        .expect(400);

      expect(response.body.code).toBe('LAST_AREA');
      expect(await countAreas(caseNumber)).toBe(1);
    });

    it('rejects an unknown area', async () => {
      const response = await api()
        .delete('/api/areas/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.code).toBe('AREA_NOT_FOUND');
    });
  });

  describe('applications that cannot be edited (UC-035 F2)', () => {
    it('blocks creating, updating and deleting areas', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
      );
      const [area] = await createSearchedAreas(caseNumber, [
        strandvej,
        kirkestraede,
      ]);
      await applications.setStatus(caseNumber, Status.InProgress);

      const created = await api()
        .post('/api/areas')
        .send({ applicationId: caseNumber, ...strandvej })
        .expect(409);
      const updated = await api()
        .patch(`/api/areas/${area.uuid}`)
        .send(excavationDetails)
        .expect(409);
      const deleted = await api().delete(`/api/areas/${area.uuid}`).expect(409);

      for (const response of [created, updated, deleted]) {
        expect(response.body.code).toBe('APPLICATION_NOT_EDITABLE');
      }
      expect(await countAreas(caseNumber)).toBe(2);
    });

    it('allows changes when the case worker requires changes', async () => {
      const caseNumber = await applications.create(
        ApplicationType.ExcavationPermit,
        Status.ChangeRequired,
      );
      const [area] = await createSearchedAreas(caseNumber, [
        strandvej,
        kirkestraede,
      ]);

      await api()
        .patch(`/api/areas/${area.uuid}`)
        .send(excavationDetails)
        .expect(200);
      await api().delete(`/api/areas/${area.uuid}`).expect(204);
    });
  });

  it('supports the whole wizard flow for an excavation permit', async () => {
    const caseNumber = await applications.create(
      ApplicationType.ExcavationPermit,
    );

    // Map step: two roads from the search.
    const [first, second] = await createSearchedAreas(caseNumber, [
      strandvej,
      kirkestraede,
    ]);
    // Areas step: one manual road, then details for every area.
    const manual = await api()
      .post('/api/areas')
      .send({
        applicationId: caseNumber,
        roadName: 'Ny vej',
        roadOwnership: 'Private',
        postalCode: '5200',
      })
      .expect(201);
    for (const uuid of [first.uuid, second.uuid, manual.body.uuid]) {
      await api()
        .patch(`/api/areas/${uuid}`)
        .send(excavationDetails)
        .expect(200);
    }
    // The applicant removes one road again.
    await api().delete(`/api/areas/${second.uuid}`).expect(204);

    const list = await api()
      .get('/api/areas')
      .query({ applicationId: caseNumber })
      .expect(200);
    expect(list.body.areas).toHaveLength(2);
    for (const area of list.body.areas) {
      expect(area).toMatchObject(excavationDetails);
    }
    expect(
      list.body.areas.map((area: { roadName: string }) => area.roadName).sort(),
    ).toEqual(['Ny vej', 'Strandvej']);
  });
});
