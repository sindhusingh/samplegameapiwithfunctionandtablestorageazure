import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import {
    getPlayer,
    NotModifiedError,
    PlayerNotFoundError,
} from "../shared/tableClient";
import { createResponse } from "../shared/responseHelper";

export async function getPlayerHandler(
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
    try {
        const playFabId = request.params.playFabId;
        if (!playFabId) {
            return { status: 400, body: "playFabId is required" };
        }

        // Check caching headers
        const ifNoneMatch = request.headers.get("if-none-match");

        const player = await getPlayer(playFabId, {
            consistentRead: true, // Ensure latest data
            ifNoneMatch,
        });

        if (!player) {
            throw new PlayerNotFoundError(playFabId);
        }

        // Handle caching
        if (player instanceof NotModifiedError) {
            return { status: 304 };
        }

        return {
            status: 200,
            jsonBody: createResponse({
                success: true,
                data: { player },
                metadata: { etag: player.etag },
            }),
            headers: {
                ETag: player.etag,
                "Cache-Control": "max-age=60",
                "Last-Modified": new Date(player.createdAt).toUTCString(),
            },
        };
    } catch (error) {
        if (error instanceof PlayerNotFoundError) {
            return { status: 404, jsonBody: { error: error.message } };
        }

        if (error instanceof NotModifiedError) {
            return { status: 304 };
        }

        context.error(`Get failed: ${error}`, {
            invocationId: context.invocationId,
        });
        return {
            status: 500,
            jsonBody: {
                error: "Internal server error",
                correlationId: context.invocationId,
            },
        };
    }
}

app.http("getPlayer", {
    methods: ["GET"],
    route: "players/{playFabId}",
    authLevel: "anonymous",
    handler: getPlayerHandler,
});
