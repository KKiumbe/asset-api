/*
  Warnings:

  - A unique constraint covering the columns `[nationalID]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nationalID` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "county" TEXT,
ADD COLUMN     "nationalID" TEXT NOT NULL,
ADD COLUMN     "secondaryPhoneNumber" TEXT,
ADD COLUMN     "town" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_nationalID_key" ON "Customer"("nationalID");
