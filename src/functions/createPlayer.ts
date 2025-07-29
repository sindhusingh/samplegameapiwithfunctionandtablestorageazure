import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { CreatePlayerDto } from "../interfaces/player";
import { createPlayer, PlayerAlreadyExistsError } from "../shared/tableClient";
import { createResponse } from "../shared/responseHelper";

export async function createPlayerHandler(
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
    try {
        // 1. Validate Input
        const body = (await request.json()) as CreatePlayerDto;
        if (!body.playFabId) {
            return createResponse(false, 400, {
                errorMessage: "playFabId is required",
            });
        }

        // 2. Check for existing session (optional)
        const sessionTicket = request.headers.get("x-session-ticket");
        if (!sessionTicket) {
            return createResponse(false, 401, {
                errorMessage: "Missing PlayFab session ticket",
            });
        }

        // 3. Create Player
        const player = await createPlayer(body);

        // 4. Return Success
        return createResponse(true, 201, {
            data: {
                id: player.partitionKey,
                name: player.name,
                level: player.level,
                createdAt: player.createdAt,
            },
        });
    } catch (error) {
        context.error(`CreatePlayer failed: ${error}`);

        // Handle specific errors
        if (error instanceof PlayerAlreadyExistsError) {
            return createResponse(false, 409, {
                errorMessage: "Player already exists",
            });
        }

        // Generic server error
        return createResponse(false, 500);
    }
}

app.http("createPlayer", {
    methods: ["POST"],
    route: "players",
    authLevel: "anonymous",
    handler: createPlayerHandler,
});
