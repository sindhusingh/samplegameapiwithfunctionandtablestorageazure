import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { getPlayer } from "../shared/tableClient";
import { createResponse } from "../shared/responseHelper";

export async function getPlayerHandler(
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
    try {
        const playFabId = request.params.playFabId;
        if (!playFabId) {
            return createResponse(false, 400, {
                errorMessage: "playFabId is required",
            });
        }

        const player = await getPlayer(playFabId);
        if (!player) {
            return createResponse(false, 404);
        }

        return createResponse(true, 200, {
            data: {
                id: player.partitionKey,
                name: player.name,
                level: player.level,
                email: player.email,
            },
        });
    } catch (error) {
        context.error(`GetPlayer failed: ${error}`);
        return createResponse(false, 500);
    }
}

app.http("getPlayer", {
    methods: ["GET"],
    route: "players/{playFabId}",
    authLevel: "anonymous",
    handler: getPlayerHandler,
});
