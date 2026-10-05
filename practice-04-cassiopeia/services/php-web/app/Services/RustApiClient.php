<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

final class RustApiClient
{
    public function __construct(private readonly string $baseUrl = '') {}

    public function get(string $path, array $query = []): array
    {
        $base = $this->baseUrl ?: (string) env('RUST_BASE', 'http://rust_iss:3000');
        $response = Http::acceptJson()
            ->timeout((int) env('UPSTREAM_TIMEOUT_SECONDS', 10))
            ->retry((int) env('UPSTREAM_RETRIES', 2), 150, throw: false)
            ->get(rtrim($base, '/') . '/' . ltrim($path, '/'), $query);
        if (!$response->successful()) {
            return ['ok' => false, 'error' => ['code' => 'UPSTREAM_' . $response->status(), 'message' => 'Rust service request failed', 'trace_id' => request()->header('X-Trace-Id', 'web-' . bin2hex(random_bytes(6)))]];
        }
        return $response->json() ?: ['ok' => false, 'error' => ['code' => 'UPSTREAM_INVALID_JSON', 'message' => 'Empty upstream response', 'trace_id' => 'web-' . bin2hex(random_bytes(6))]];
    }
}
