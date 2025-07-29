import {
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { UpdatePlayerDto } from "../interfaces/player";
import {
    PlayerNotFoundError,
    PlayerUpdateConflictError,
    updatePlayer,
} from "../shared/tableClient";
import { createResponse } from "../shared/responseHelper";

export async function updatePlayerEndpoint(
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
    try {
        const playFabId = request.params.playFabId;
        const updates = (await request.json()) as UpdatePlayerDto;
        const etag = request.headers.get("if-match");

        const updatedPlayer = await updatePlayer(
            playFabId,
            updates,
            etag || undefined,
        );

        return {
            status: 200,
            jsonBody: createResponse({
                success: true,
                data: { level: updatedPlayer.level },
                metadata: { etag: updatedPlayer.etag },
            }),
        };
    } catch (error) {
        if (error instanceof PlayerNotFoundError) {
            return { status: 404, body: error.message };
        }

        if (error instanceof PlayerUpdateConflictError) {
            return {
                status: 409,
                body: "Conflict detected - please refresh and retry",
            };
        }

        context.error("Update failed:", error);
        return { status: 500, body: "Internal server error" };
    }
}
