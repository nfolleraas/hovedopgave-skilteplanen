DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Application" a
    JOIN "ExcavationPermit" ep ON ep."caseNumber" = a."excavationPermitId"
    WHERE a."caseNumber" <> ep."caseNumber"
  ) OR EXISTS (
    SELECT 1
    FROM "Application" a
    JOIN "RoadUsePermit" rp ON rp."caseNumber" = a."roadUsePermitId"
    WHERE a."caseNumber" <> rp."caseNumber"
  ) THEN
    RAISE EXCEPTION 'Permit case numbers must match their application case number before migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Application" a
    JOIN "ExcavationPermit" ep ON ep."caseNumber" = a."excavationPermitId"
    JOIN "CableTask" ct ON ct."excavationPermitId" = ep."caseNumber"
    WHERE a."type" <> 'ExcavationPermit'
  ) OR EXISTS (
    SELECT 1
    FROM "Application" a
    JOIN "RoadUsePermit" rp ON rp."caseNumber" = a."roadUsePermitId"
    WHERE a."type" NOT IN ('RoadUsePermit', 'RoadUsePermitEvent')
      AND (
        EXISTS (SELECT 1 FROM "Material" m WHERE m."roadUsePermitId" = rp."caseNumber")
        OR EXISTS (SELECT 1 FROM "Permission" p WHERE p."roadUsePermitId" = rp."caseNumber")
      )
  ) THEN
    RAISE EXCEPTION 'Resolve dependent data for permit rows that do not match Application.type before migration';
  END IF;
END $$;

ALTER TABLE "Application" DROP CONSTRAINT "Application_roadUsePermitId_fkey";
ALTER TABLE "Application" DROP CONSTRAINT "Application_excavationPermitId_fkey";

DROP INDEX "Application_roadUsePermitId_key";
DROP INDEX "Application_excavationPermitId_key";

DELETE FROM "ExcavationPermit" ep
USING "Application" a
WHERE a."excavationPermitId" = ep."caseNumber"
  AND a."type" <> 'ExcavationPermit';

DELETE FROM "RoadUsePermit" rp
USING "Application" a
WHERE a."roadUsePermitId" = rp."caseNumber"
  AND a."type" NOT IN ('RoadUsePermit', 'RoadUsePermitEvent');

ALTER TABLE "Application"
  DROP COLUMN "roadUsePermitId",
  DROP COLUMN "excavationPermitId";

ALTER TABLE "ExcavationPermit"
  DROP COLUMN "title",
  DROP COLUMN "applicantReference",
  DROP COLUMN "type",
  ADD CONSTRAINT "ExcavationPermit_caseNumber_fkey"
    FOREIGN KEY ("caseNumber") REFERENCES "Application"("caseNumber") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoadUsePermit"
  DROP COLUMN "title",
  DROP COLUMN "applicantReference",
  DROP COLUMN "type",
  ADD CONSTRAINT "RoadUsePermit_caseNumber_fkey"
    FOREIGN KEY ("caseNumber") REFERENCES "Application"("caseNumber") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION "validate_permit_application_type"() RETURNS trigger AS $$
DECLARE
  application_type "ApplicationType";
BEGIN
  SELECT "type" INTO application_type
  FROM "Application"
  WHERE "caseNumber" = NEW."caseNumber"
  FOR UPDATE;

  IF TG_TABLE_NAME = 'ExcavationPermit' AND application_type <> 'ExcavationPermit' THEN
    RAISE EXCEPTION 'ExcavationPermit requires an Application of type ExcavationPermit' USING ERRCODE = '23514';
  END IF;

  IF TG_TABLE_NAME = 'RoadUsePermit' AND application_type NOT IN ('RoadUsePermit', 'RoadUsePermitEvent') THEN
    RAISE EXCEPTION 'RoadUsePermit requires an Application of type RoadUsePermit or RoadUsePermitEvent' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ExcavationPermit_application_type_check"
BEFORE INSERT OR UPDATE OF "caseNumber" ON "ExcavationPermit"
FOR EACH ROW EXECUTE FUNCTION "validate_permit_application_type"();

CREATE TRIGGER "RoadUsePermit_application_type_check"
BEFORE INSERT OR UPDATE OF "caseNumber" ON "RoadUsePermit"
FOR EACH ROW EXECUTE FUNCTION "validate_permit_application_type"();

CREATE FUNCTION "validate_application_permit_type_change"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ExcavationPermit" ep
    WHERE ep."caseNumber" = NEW."caseNumber"
  ) AND NEW."type" <> 'ExcavationPermit' THEN
    RAISE EXCEPTION 'Cannot change Application.type while its ExcavationPermit exists' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "RoadUsePermit" rp
    WHERE rp."caseNumber" = NEW."caseNumber"
  ) AND NEW."type" NOT IN ('RoadUsePermit', 'RoadUsePermitEvent') THEN
    RAISE EXCEPTION 'Cannot change Application.type while its RoadUsePermit exists' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Application_permit_type_check"
BEFORE UPDATE OF "type" ON "Application"
FOR EACH ROW EXECUTE FUNCTION "validate_application_permit_type_change"();