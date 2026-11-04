-- CreateEnum
CREATE TYPE "ApplicantType" AS ENUM ('Private', 'Business');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('ExcavationPermit', 'RoadUsePermit', 'RoadUsePermitEvent');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('Day', 'Evening', 'Night', 'AllDay');

-- CreateEnum
CREATE TYPE "CableSubtype" AS ENUM ('MainLine', 'ServiceLine', 'StreetCabinet', 'Other');

-- CreateEnum
CREATE TYPE "CableType" AS ENUM ('Telephone', 'Water', 'Power', 'Sewage', 'Gas', 'DistrictHeating', 'Coax', 'Fiber', 'Other');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SignPlan', 'Other');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('Along', 'Across');

-- CreateEnum
CREATE TYPE "ExecutionMethod" AS ENUM ('Excavation', 'ExistingPipe', 'Ploughing', 'ChainTrenching', 'SoilDisplacement', 'PipeCracking', 'PipeRamming', 'UndergroundDrilling', 'UndergroundDirectionalDrilling', 'Other');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('Banner', 'TemporarySign', 'PermanentSign', 'DrillingRig', 'Container', 'Crane', 'Truck', 'Lift', 'OfficeCabin', 'WelfareCabin', 'TrenchlessUnit', 'ReliningUnit', 'Scaffolding', 'LoadingTower', 'Tent', 'Stage', 'Grandstand', 'Other');

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('Application', 'Notice');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('ExcavationPermit', 'RoadUsePermit', 'RoadUsePermitEvent', 'Other');

-- CreateEnum
CREATE TYPE "RoadSection" AS ENUM ('Lane', 'EmergencyLane', 'BikeLane', 'Pavement', 'Roundabout', 'RoadVerge', 'Other');

-- CreateEnum
CREATE TYPE "RoadSide" AS ENUM ('Left', 'Right', 'Both', 'Middle');

-- CreateEnum
CREATE TYPE "RoadOwnership" AS ENUM ('Private', 'Municipality');

-- CreateEnum
CREATE TYPE "SignPlanType" AS ENUM ('MarkingCityArea', 'MarkingHighway', 'MarkingRuralArea', 'AuthorityMarkingPlan', 'AttachSpecificMarkingPlan');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Draft', 'InProgress', 'Approved', 'Rejected', 'ChangeRequired');

-- CreateEnum
CREATE TYPE "TrafficCalmingMeasureType" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I');

-- CreateEnum
CREATE TYPE "TrafficCalmingMeasureScope" AS ENUM ('OncomingTraffic', 'FollowingTraffic', 'Both');

-- CreateEnum
CREATE TYPE "TrafficChange" AS ENUM ('SpeedLimitWorkZone', 'SpeedLimitTrafficSafety', 'OnewayTraffic', 'TrafficLight', 'NoStoppingAndParking', 'UnconditionalObligationInIntersection');

-- CreateEnum
CREATE TYPE "Usage" AS ENUM ('AsphaltWork', 'Construction', 'Renovation', 'MaterialSpace', 'StreetFurnitureInstallation', 'BannerInstallation', 'SignInstallment', 'MarketStand', 'OutdoorServing', 'WaterDischarge', 'ProductDisplay', 'Other');

-- CreateEnum
CREATE TYPE "WorkCategory" AS ENUM ('Establishment', 'Repair', 'JointBay', 'CableError', 'Renovation', 'Decommission', 'AlarmError', 'Removal', 'Cleaning', 'TrialHole', 'Investigation', 'Other');

-- CreateEnum
CREATE TYPE "ActorRole" AS ENUM ('Supplier', 'Contractor', 'NetworkOperator', 'ProjectCoordinator', 'Private');

-- CreateTable
CREATE TABLE "Actor" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cvrNumber" TEXT,
    "role" "ActorRole" NOT NULL,
    "department" TEXT,
    "ContactPersonName" TEXT,
    "addressId" TEXT NOT NULL,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Address" (
    "uuid" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Administrator" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "Administrator_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ApplicantType" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cvrNumber" TEXT,
    "mitIdKey" TEXT NOT NULL,
    "skilteplanenKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addressId" TEXT NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Application" (
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "applicantReference" TEXT NOT NULL,
    "type" "ApplicationType" NOT NULL,
    "trafficChange" "TrafficChange" NOT NULL,
    "applicantId" TEXT NOT NULL,
    "caseWorkerId" TEXT,
    "roadUsePermitId" TEXT NOT NULL,
    "excavationPermitId" TEXT NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("caseNumber")
);

-- CreateTable
CREATE TABLE "AreaDetail" (
    "uuid" TEXT NOT NULL,
    "roadSection" "RoadSection" NOT NULL,
    "roadSectionDescription" TEXT,
    "roadSide" "RoadSide" NOT NULL,
    "direction" "Direction" NOT NULL,

    CONSTRAINT "AreaDetail_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "AreaSize" (
    "uuid" TEXT NOT NULL,
    "lengthInMeters" DOUBLE PRECISION NOT NULL,
    "widthInMeters" DOUBLE PRECISION NOT NULL,
    "depthInMeters" DOUBLE PRECISION NOT NULL,
    "areaInCubicMeters" DOUBLE PRECISION NOT NULL,
    "areaId" TEXT NOT NULL,

    CONSTRAINT "AreaSize_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Area" (
    "uuid" TEXT NOT NULL,
    "roadName" TEXT NOT NULL,
    "roadOwnership" "RoadOwnership" NOT NULL,
    "postalCode" TEXT NOT NULL,
    "houseNumberTo" TEXT,
    "houseNumberFrom" TEXT,
    "alternativeDescription" TEXT,
    "areaDetailId" TEXT NOT NULL,
    "areaSizeId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "CableTask" (
    "id" TEXT NOT NULL,
    "cableType" "CableType" NOT NULL,
    "cableTypesDescription" TEXT,
    "cableSubtypes" "CableSubtype"[],
    "cableSubtypesDescription" TEXT,
    "workCategories" "WorkCategory"[],
    "workCategoriesDescription" TEXT,
    "executionMethods" "ExecutionMethod"[],
    "executionMethodsDescription" TEXT,
    "excavationPermitId" TEXT NOT NULL,

    CONSTRAINT "CableTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseWorker" (
    "employeeNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "isSuperUser" BOOLEAN NOT NULL DEFAULT false,
    "municipalityId" INTEGER NOT NULL,

    CONSTRAINT "CaseWorker_pkey" PRIMARY KEY ("employeeNumber")
);

-- CreateTable
CREATE TABLE "ContactPerson" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "availability" "Availability" NOT NULL,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "ContactPerson_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Document" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationId" TEXT NOT NULL,
    "signPlanId" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "ExcavationPermit" (
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "applicantReference" TEXT NOT NULL,
    "type" "ApplicationType" NOT NULL,
    "permitType" "PermitType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExcavationPermit_pkey" PRIMARY KEY ("caseNumber")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "uuid" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "IsRead" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "caseWorkerId" TEXT NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Material" (
    "uuid" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "roadUsePermitId" TEXT NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicantId" TEXT NOT NULL,
    "caseWorkerId" TEXT NOT NULL,
    "municipalityId" INTEGER NOT NULL,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Message" (
    "uuid" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageThreadId" TEXT NOT NULL,
    "applicantId" TEXT,
    "caseWorkerId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Municipality" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "uuid" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "applicantId" TEXT,
    "caseWorkerId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "foodSale" BOOLEAN NOT NULL,
    "alcoholSale" BOOLEAN NOT NULL,
    "music" BOOLEAN NOT NULL,
    "roadUsePermitId" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadUsePermit" (
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "applicantReference" TEXT NOT NULL,
    "type" "ApplicationType" NOT NULL,
    "isEvent" BOOLEAN NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "eventStart" TIMESTAMP(3) NOT NULL,
    "eventEnd" TIMESTAMP(3) NOT NULL,
    "usage" "Usage" NOT NULL,
    "usageDescription" TEXT,

    CONSTRAINT "RoadUsePermit_pkey" PRIMARY KEY ("caseNumber")
);

-- CreateTable
CREATE TABLE "SignPlan" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signPlanType" "SignPlanType" NOT NULL,
    "group" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentUuid" TEXT,

    CONSTRAINT "SignPlan_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "TrafficCalmingMeasure" (
    "id" TEXT NOT NULL,
    "type" "TrafficCalmingMeasureType" NOT NULL,
    "protectionLevel" TEXT NOT NULL,
    "scope" "TrafficCalmingMeasureScope" NOT NULL,
    "description" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "TrafficCalmingMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ActorToApplication" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActorToApplication_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_addressId_key" ON "Applicant"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_applicantId_key" ON "Application"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_caseWorkerId_key" ON "Application"("caseWorkerId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_roadUsePermitId_key" ON "Application"("roadUsePermitId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_excavationPermitId_key" ON "Application"("excavationPermitId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaSize_areaId_key" ON "AreaSize"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "Area_areaDetailId_key" ON "Area"("areaDetailId");

-- CreateIndex
CREATE UNIQUE INDEX "Area_areaSizeId_key" ON "Area"("areaSizeId");

-- CreateIndex
CREATE UNIQUE INDEX "Area_applicationId_key" ON "Area"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "CableTask_excavationPermitId_key" ON "CableTask"("excavationPermitId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseWorker_municipalityId_key" ON "CaseWorker"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactPerson_applicationId_key" ON "ContactPerson"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_applicationId_key" ON "Document"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_signPlanId_key" ON "Document"("signPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_applicationId_key" ON "Feedback"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_caseWorkerId_key" ON "Feedback"("caseWorkerId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_roadUsePermitId_key" ON "Material"("roadUsePermitId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageThread_applicantId_key" ON "MessageThread"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageThread_caseWorkerId_key" ON "MessageThread"("caseWorkerId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageThread_municipalityId_key" ON "MessageThread"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_messageThreadId_key" ON "Message"("messageThreadId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_applicantId_key" ON "Message"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_caseWorkerId_key" ON "Message"("caseWorkerId");

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_addressId_key" ON "Municipality"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_applicantId_key" ON "Notification"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_caseWorkerId_key" ON "Notification"("caseWorkerId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_roadUsePermitId_key" ON "Permission"("roadUsePermitId");

-- CreateIndex
CREATE UNIQUE INDEX "SignPlan_applicationId_key" ON "SignPlan"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficCalmingMeasure_applicationId_key" ON "TrafficCalmingMeasure"("applicationId");

-- CreateIndex
CREATE INDEX "_ActorToApplication_B_index" ON "_ActorToApplication"("B");

-- AddForeignKey
ALTER TABLE "Actor" ADD CONSTRAINT "Actor_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_caseWorkerId_fkey" FOREIGN KEY ("caseWorkerId") REFERENCES "CaseWorker"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_roadUsePermitId_fkey" FOREIGN KEY ("roadUsePermitId") REFERENCES "RoadUsePermit"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_excavationPermitId_fkey" FOREIGN KEY ("excavationPermitId") REFERENCES "ExcavationPermit"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_areaDetailId_fkey" FOREIGN KEY ("areaDetailId") REFERENCES "AreaDetail"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_areaSizeId_fkey" FOREIGN KEY ("areaSizeId") REFERENCES "AreaSize"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CableTask" ADD CONSTRAINT "CableTask_excavationPermitId_fkey" FOREIGN KEY ("excavationPermitId") REFERENCES "ExcavationPermit"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseWorker" ADD CONSTRAINT "CaseWorker_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPerson" ADD CONSTRAINT "ContactPerson_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_signPlanId_fkey" FOREIGN KEY ("signPlanId") REFERENCES "SignPlan"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_caseWorkerId_fkey" FOREIGN KEY ("caseWorkerId") REFERENCES "CaseWorker"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_roadUsePermitId_fkey" FOREIGN KEY ("roadUsePermitId") REFERENCES "RoadUsePermit"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_caseWorkerId_fkey" FOREIGN KEY ("caseWorkerId") REFERENCES "CaseWorker"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "MessageThread"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_caseWorkerId_fkey" FOREIGN KEY ("caseWorkerId") REFERENCES "CaseWorker"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Municipality" ADD CONSTRAINT "Municipality_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_caseWorkerId_fkey" FOREIGN KEY ("caseWorkerId") REFERENCES "CaseWorker"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_roadUsePermitId_fkey" FOREIGN KEY ("roadUsePermitId") REFERENCES "RoadUsePermit"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignPlan" ADD CONSTRAINT "SignPlan_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficCalmingMeasure" ADD CONSTRAINT "TrafficCalmingMeasure_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("caseNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActorToApplication" ADD CONSTRAINT "_ActorToApplication_A_fkey" FOREIGN KEY ("A") REFERENCES "Actor"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActorToApplication" ADD CONSTRAINT "_ActorToApplication_B_fkey" FOREIGN KEY ("B") REFERENCES "Application"("caseNumber") ON DELETE CASCADE ON UPDATE CASCADE;
