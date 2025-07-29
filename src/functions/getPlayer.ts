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
export async function getPlayer(
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
    const playFabId = request.params.playFabId;

    // Get ALL players with this PlayFabID (PartitionKey)
    const players = [];
    for await (const entity of tableClient.listEntities({
        queryOptions: { filter: `PartitionKey eq '${playFabId}'` },
    })) {
        players.push(entity);
    }

    if (players.length === 0) {
        return { status: 404, body: "Player not found" };
    }

    // Return the most recent player (assuming RowKey is timestamp-based)
    const latestPlayer = players.sort((a, b) =>
        b.rowKey.localeCompare(a.rowKey),
    )[0];
    return { jsonBody: latestPlayer };
}

app.http("getPlayer", {
    route: "players/{playFabId}",
    methods: ["GET"],
    authLevel: "anonymous",
    handler: getPlayer,
});
