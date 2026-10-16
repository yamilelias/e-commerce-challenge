<?php

declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Http\ApiProblem;
use App\Http\JsonInput;
use App\Service\CheckoutService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class OrderController
{
    public function __construct(private readonly CheckoutService $checkout, private readonly JsonInput $json)
    {
    }

    #[Route('/api/v1/orders', name: 'api_v1_orders_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $body = $this->json->read($request);
        $decoded = json_decode($request->getContent(), false, 512, JSON_THROW_ON_ERROR);
        if (isset($decoded->items) && !is_array($decoded->items)) {
            throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', ['items' => ['Expected a JSON array.']]);
        }
        $result = $this->checkout->checkout($body, $request->headers->get('Idempotency-Key'));

        return new JsonResponse(['data' => $result['data']], $result['status'], [
            'Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store',
        ]);
    }

    #[Route('/api/v1/orders/{reference}', name: 'api_v1_orders_receipt', methods: ['GET'], requirements: ['reference' => '[^/]+'])]
    public function receipt(Request $request, string $reference): JsonResponse
    {
        $query = $request->query->all();
        foreach (array_keys($query) as $key) {
            if ($key !== 'token') {
                throw new ApiProblem(400, 'BAD_QUERY', 'Unsupported query parameter.', [$key => ['This parameter is not allowed.']]);
            }
        }
        $token = $query['token'] ?? null;

        return new JsonResponse(['data' => $this->checkout->lookup($reference, is_string($token) ? $token : null)], 200, [
            'Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store',
            'Referrer-Policy' => 'no-referrer',
        ]);
    }
}
