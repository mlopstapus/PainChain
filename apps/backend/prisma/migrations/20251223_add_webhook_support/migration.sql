-- AlterTable
ALTER TABLE "connections" ADD COLUMN "webhook_secret" TEXT,
ADD COLUMN "last_webhook" TIMESTAMP(3);
