/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the `AgentConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_parentId_fkey";

-- DropForeignKey
ALTER TABLE "AgentConfig" DROP CONSTRAINT "AgentConfig_accountId_fkey";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "ownerId",
DROP COLUMN "parentId",
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "type" SET DEFAULT 'human';

-- DropTable
DROP TABLE "AgentConfig";

-- DropEnum
DROP TYPE "AgentStatus";
