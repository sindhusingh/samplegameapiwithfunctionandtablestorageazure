import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { createResponse } from "../shared/responseHelper";
import { UpdatePlayerDto } from "../interfaces/player";
import { PlayerNotFoundError, updatePlayer } from "../shared/tableClient";

export async function updatePlayerHandler(
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
    try {
        // 1. Validate Input
        const playFabId = request.params.playFabId;
        if (!playFabId) {
            return createResponse(false, 400, {
                errorMessage: "playFabId is required in URL",
            });
        }

        const updates = (await request.json()) as UpdatePlayerDto;
        if (!updates.name && !updates.level && !updates.email) {
            return createResponse(false, 400, {
                errorMessage:
                    "At least one field (name, level, or email) must be provided",
            });
        }

        // 2. Verify Session (optional)
        const sessionTicket = request.headers.get("x-session-ticket");
        if (!sessionTicket) {
            return createResponse(false, 401, {
                errorMessage: "Missing PlayFab session ticket",
            });
        }

        // 3. Apply Updates
        const updatedPlayer = await updatePlayer(playFabId, updates);

        // 4. Return Success
        return createResponse(true, 200, {
            data: {
                id: updatedPlayer.partitionKey,
                name: updatedPlayer.name,
                level: updatedPlayer.level,
                email: updatedPlayer.email,
                updatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        context.error(`UpdatePlayer failed: ${error}`);

        if (error instanceof PlayerNotFoundError) {
            return createResponse(false, 404, {
                errorMessage: "Player not found",
            });
        }

        return createResponse(false, 500);
    }
}

app.http("updatePlayer", {
    methods: ["PATCH"],
    route: "players/{playFabId}",
    authLevel: "anonymous",
    handler: updatePlayerHandler,
});
