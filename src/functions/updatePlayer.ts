import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

// Initialize Table Client
const tableClient = TableClient.fromConnectionString(
    process.env.AzureWebJobsStorage, 
    "Players"
);

// Type definitions
interface PlayerUpdateRequest {
    name?: string;
    level?: number;
    email?: string;
    createdAt?: string;
}

export async function updatePlayer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // 1. Validate session ticket
        const sessionTicket = request.headers.get('x-session-ticket');
        if (!sessionTicket) {
            return { status: 401, body: "Missing PlayFab session ticket" };
        }

        // 2. Get player ID from route
        const playFabId = request.params.playFabId;
        if (!playFabId) {
            return { status: 400, body: "playFabId is required in URL" };
        }

        // 3. Parse update fields
        const updateData: PlayerUpdateRequest = await request.json();
        if (!updateData.name && !updateData.level && !updateData.email) {
            return { status: 400, body: "No valid fields to update" };
        }

        // 4. Get existing player
        const existingPlayer: PlayerUpdateRequest = await tableClient.getEntity<PlayerUpdateRequest>(playFabId, playFabId);

        // 5. Merge changes
        const updatedPlayer = {
            partitionKey: playFabId,
            rowKey: playFabId,
            ...existingPlayer,
            ...updateData,
            // Preserve original createdAt if exists
            createdAt: existingPlayer.createdAt || new Date().toISOString()
        };

        // 6. Save updates
        await tableClient.updateEntity(updatedPlayer, "Merge");

        return { 
            status: 200,
            jsonBody: {
                success: true,
                player: updatedPlayer
            }
        };

    } catch (error) {
        context.error("Update failed:", error);
        
        if (error.statusCode === 404) {
            return { status: 404, body: "Player not found" };
        }

        return { 
            status: 500,
            jsonBody: {
                error: "Update failed",
                details: error.message
            }
        };
    }
}

app.http('updatePlayer', {
    route: 'players/{playFabId}',
    methods: ['PATCH', 'PUT'],
    authLevel: 'anonymous',
    handler: updatePlayer
});