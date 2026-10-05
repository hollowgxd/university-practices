<?php

namespace App\Services;

final class SpaceDataService
{
    public function __construct(private readonly RustApiClient $client) {}

    public function dashboard(): array
    {
        return [
            'iss' => $this->client->get('/last'),
            'summary' => $this->client->get('/space/summary'),
            'trend' => $this->client->get('/iss/trend'),
        ];
    }
}
