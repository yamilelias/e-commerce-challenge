<?php

declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\ProductService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class CatalogController
{
    public function __construct(private readonly ProductService $products)
    {
    }

    #[Route('/api/v1/categories', name: 'api_v1_categories', methods: ['GET'])]
    public function categories(): JsonResponse
    {
        return new JsonResponse(['data' => $this->products->categories()], 200, ['Content-Type' => 'application/json; charset=utf-8']);
    }

    #[Route('/api/v1/products', name: 'api_v1_products_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        return new JsonResponse($this->products->list($request->query->all()), 200, ['Content-Type' => 'application/json; charset=utf-8']);
    }

    #[Route('/api/v1/products/{id}', name: 'api_v1_products_detail', methods: ['GET'], requirements: ['id' => '[^/]+'])]
    public function detail(string $id): JsonResponse
    {
        return new JsonResponse(['data' => $this->products->detail($this->products->parseId($id))], 200, ['Content-Type' => 'application/json; charset=utf-8']);
    }
}
