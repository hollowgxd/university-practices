<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

final class ApiResponse
{
    public static function ok(array $data = []): JsonResponse { return response()->json(['ok' => true] + $data, 200); }

    public static function error(string $code, string $message, ?string $traceId = null): JsonResponse
    {
        return response()->json(['ok' => false, 'error' => ['code' => $code, 'message' => $message, 'trace_id' => $traceId ?: 'web-' . bin2hex(random_bytes(6))]], 200);
    }
}
