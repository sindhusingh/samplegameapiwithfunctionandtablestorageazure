import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { TableClient } from "@azure/data-tables";

// Define TypeScript interfaces
interface PlayerRequest {
    playFabId: string;
    name?: string;
    level?: number;
    email?: string;
}

interface PlayerEntity {
    partitionKey: string;
    rowKey: string;
    name: string;
    level: number;
    email: string;
    createdAt: string;
}

// 1. Initialize table client OUTSIDE functions (shared instance)
const tableClient = TableClient.fromConnectionString(
    process.env.AzureWebJobsStorage, // "UseDevelopmentStorage=true" locally
    "Players",
);

// 2. Table initialization (runs ONCE when Functions start)
async function initializeTable() {
    try {
        await tableClient.createTable();
        console.log("Players table ready");
    } catch (err) {
        if (err.details?.errorCode !== "TableAlreadyExists") {
            throw err;
        }
    }
}

// 3. Call initialization BEFORE functions start
initializeTable().catch(console.error);

// 4. Your function handler (separate from initialization)
export async function createPlayer(
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
    try {
        // 1. Validate headers
        const sessionTicket = request.headers.get("x-session-ticket");
        if (!sessionTicket) {
            return { status: 401, body: "Missing PlayFab session ticket" };
        }

        // 2. Parse and validate request body
        const body = (await request.json()) as PlayerRequest;
        if (!body.playFabId) {
            return { status: 400, body: "playFabId is required" };
        }

        // 3. Create player entity with proper typing
        const playerEntity: PlayerEntity = {
            partitionKey: body.playFabId,
            rowKey: body.playFabId,
            name: body.name || "Guest",
            level: body.level || 1,
            email: body.email || "",
            createdAt: new Date().toISOString(),
        };

        await tableClient.createEntity(playerEntity);

        return {
            status: 201,
            jsonBody: {
                success: true,
                playerId: playerEntity.rowKey,
            },
        };
    } catch (error) {
        context.error("Error:", error);
        return {
            status: 500,
            jsonBody: {
                error: "Internal server error",
                details: error.message,
            },
        };
    }
}

app.http("createPlayer", {
    methods: ["POST"],
    authLevel: "anonymous",
    handler: createPlayer,
});
