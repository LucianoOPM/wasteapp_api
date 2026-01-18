-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "was_used" BOOLEAN NOT NULL DEFAULT false;
