/**
 * Core player data stored in Table Storage
 */
export interface PlayerEntity {
    partitionKey: string; // playFabId
    rowKey: string; // playFabId
    name: string;
    level: number;
    email: string;
    createdAt: string;
    // Add metadata fields
    etag?: string; // Azure's concurrency tag
    timestamp?: Date; // Last modified time
}

/**
 * Data required to create a new player
 */
export interface CreatePlayerDto {
    playFabId: string;
    name?: string;
    level?: number;
    email?: string;
}

/**
 * Partial data for player updates
 */
export interface UpdatePlayerDto {
    name?: string;
    level?: number;
    email?: string;
}
