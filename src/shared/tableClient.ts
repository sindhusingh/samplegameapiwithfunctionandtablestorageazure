import { TableClient } from "@azure/data-tables";
import { PlayerEntity, UpdatePlayerDto } from "../interfaces/player";

// Custom error classes
export class PlayerAlreadyExistsError extends Error {
    constructor(playFabId: string) {
        super(`Player ${playFabId} already exists`);
        this.name = "PlayerAlreadyExistsError";
    }
}

export class PlayerNotFoundError extends Error {
    constructor(playFabId: string) {
        super(`Player ${playFabId} not found`);
        this.name = "PlayerNotFoundError";
    }
}

export class PlayerUpdateConflictError extends Error {
    constructor(playFabId: string) {
        super(`Conflict updating player ${playFabId}`);
        this.name = "PlayerUpdateConflictError";
    }
}

export class NotModifiedError extends Error {
    constructor() {
        super("Content not modified");
        this.name = "NotModifiedError";
    }
}

const tableClient = TableClient.fromConnectionString(
    process.env.AzureWebJobsStorage!,
    "Players",
    {
        retryOptions: { maxRetries: 3 },
    },
);

async function initializeTable() {
    try {
        await tableClient.createTable();
        console.log("Players table created");
    } catch (err) {
        if (err.details?.errorCode !== "TableAlreadyExists") {
            throw err;
        }
    }
}

// Call initialization BEFORE functions start
initializeTable().catch(console.error);

function sanitizeEntity<T extends Record<string, any>>(entity: T): T {
    const result: any = {};
    for (const [key, value] of Object.entries(entity)) {
        // Skip OData metadata
        if (key.startsWith("odata.")) continue;

        // Simplify property values
        result[key] = value?.value ?? value;
    }
    return result as T;
}

// Helper for consistent error handling
async function handleTableOperation<T>(
    operation: () => Promise<T>,
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (error.statusCode === 404) {
            throw new PlayerNotFoundError(
                error.details.odataError.message.replace(
                    /.*PartitionKey='(.*?)', RowKey='(.*?)'.*/,
                    "$1",
                ),
            );
        }

        if (error.statusCode === 412) {
            throw new PlayerUpdateConflictError(
                error.details.odataError.message.replace(
                    /.*PartitionKey='(.*?)', RowKey='(.*?)'.*/,
                    "$1",
                ),
            );
        }

        console.error("Table Storage Error:", error);
        throw new Error("Database operation failed");
    }
}

export async function createPlayer(playerData: {
    playFabId: string;
    name?: string;
    level?: number;
    email?: string;
}): Promise<PlayerEntity> {
    return handleTableOperation(async () => {
        // 1. Check for existing player first (for idempotency)
        try {
            const existing = await tableClient.getEntity(
                playerData.playFabId,
                playerData.playFabId,
            );

            throw new PlayerAlreadyExistsError(playerData.playFabId);
        } catch (err) {
            if (!(err instanceof PlayerNotFoundError)) throw err;
        }

        // 2. Create new entity
        const entity: PlayerEntity = {
            partitionKey: playerData.playFabId,
            rowKey: playerData.playFabId,
            name: playerData.name || "Guest",
            level: playerData.level ?? 1,
            email: playerData.email ?? "",
            createdAt: new Date().toISOString(),
        };

        // 3. Insert with conflict prevention
        await tableClient.createEntity(entity);
        return entity;
    });
}

export async function updatePlayer(
    playFabId: string,
    updates: UpdatePlayerDto,
    etag?: string,
): Promise<PlayerEntity> {
    return handleTableOperation(async () => {
        // 1. Get current entity for merge
        const existing = await tableClient.getEntity<PlayerEntity>(
            playFabId,
            playFabId,
        );

        // 2. Apply updates
        const updatedEntity = {
            ...existing,
            ...updates,
            partitionKey: playFabId, // Ensure keys aren't overwritten
            rowKey: playFabId,
        };

        // 3. Save with optimistic concurrency
        await tableClient.updateEntity(updatedEntity, "Merge", {
            etag: etag || existing.etag,
        });

        return updatedEntity;
    });
}

export async function getPlayer(
    playFabId: string,
    options?: {
        consistentRead?: boolean; // For strong consistency
        ifNoneMatch?: string; // For caching
    },
): Promise<PlayerEntity | null> {
    return handleTableOperation(async () => {
        try {
            const response = await tableClient.getEntity<PlayerEntity>(
                playFabId,
                playFabId,
                {
                    disableTypeConversion: false,
                    ...(options?.consistentRead && { consistency: "strong" }),
                },
            );

            // Handle caching headers
            if (options?.ifNoneMatch === response.etag) {
                throw new NotModifiedError();
            }

            return sanitizeEntity(response);
        } catch (error) {
            if (error.statusCode === 304) throw error; // NotModified
            if (error.statusCode === 404) return null;
            throw error;
        }
    });
}
