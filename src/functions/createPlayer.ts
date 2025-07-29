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
        // 1. Validate input
        const body = (await request.json()) as CreatePlayerDto;
        if (!body.playFabId) {
            return { status: 400, body: "playFabId is required" };
        }

        // 2. Create player
        const player = await createPlayer(body.playFabId, {
            name: body.name,
            level: body.level,
            email: body.email,
        });

        // 3. Return success
        return {
            status: 201,
            jsonBody: createResponse({
                success: true,
                data: { id: player.partitionKey, name: player.name },
                metadata: { etag: player.etag },
            }),
            headers: { Location: `/players/${player.partitionKey}` },
        };
    } catch (error) {
        // 4. Handle specific errors
        if (error instanceof PlayerAlreadyExistsError) {
            return {
                status: 409,
                jsonBody: {
                    error: "Player already exists",
                    existingId: error.message.split(" ")[1],
                },
            };
        }

        context.error("Create failed:", error);
        return {
            status: 500,
            jsonBody: {
                error: "Internal server error",
                correlationId: context.invocationId,
            },
        };
    }
}

app.http("createPlayer", {
    methods: ["POST"],
    route: "players",
    authLevel: "anonymous",
    handler: createPlayerHandler,
});
