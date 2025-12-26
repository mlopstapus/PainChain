-- CreateTable
CREATE TABLE "change_events" (
    "id" SERIAL NOT NULL,
    "connection_id" INTEGER NOT NULL,
    "external_id" TEXT,
    "source" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "url" TEXT,
    "status" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "event_metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT,
    "last_sync" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_connections" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "connection_id" INTEGER NOT NULL,

    CONSTRAINT "team_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "change_events_connection_id_idx" ON "change_events"("connection_id");

-- CreateIndex
CREATE INDEX "change_events_source_idx" ON "change_events"("source");

-- CreateIndex
CREATE INDEX "change_events_event_type_idx" ON "change_events"("event_type");

-- CreateIndex
CREATE INDEX "change_events_timestamp_idx" ON "change_events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "change_events_connection_id_external_id_key" ON "change_events"("connection_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "team_connections_team_id_connection_id_key" ON "team_connections"("team_id", "connection_id");

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_connections" ADD CONSTRAINT "team_connections_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_connections" ADD CONSTRAINT "team_connections_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

