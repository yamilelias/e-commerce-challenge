<?php

declare(strict_types=1);

namespace App\Service;

use App\Http\ApiProblem;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\DBAL\ParameterType;

final class ProductService
{
    private const SORTS = [
        'name_asc' => 'p.name ASC',
        'name_desc' => 'p.name DESC',
        'price_asc' => 'p.price_cents ASC',
        'price_desc' => 'p.price_cents DESC',
        'newest' => 'p.created_at DESC',
    ];

    public function __construct(private readonly Connection $db, private readonly ProductInput $input)
    {
    }

    /** @param array<string, mixed> $query */
    public function list(array $query, bool $admin = false): array
    {
        $allowed = $admin ? ['q', 'category', 'sort', 'page', 'per_page', 'status'] : ['q', 'category', 'sort', 'page', 'per_page'];
        foreach ($query as $key => $_) {
            if (!in_array($key, $allowed, true)) {
                throw new ApiProblem(400, 'BAD_QUERY', 'Unsupported query parameter.', [$key => ['This parameter is not allowed.']]);
            }
        }

        $page = $this->positiveQueryInt($query['page'] ?? '1', 'page');
        $perPage = $this->positiveQueryInt($query['per_page'] ?? '12', 'per_page');
        if ($perPage > 100) {
            throw new ApiProblem(400, 'BAD_QUERY', 'Invalid pagination.', ['per_page' => ['Must be at most 100.']]);
        }
        $sort = $query['sort'] ?? 'name_asc';
        if (!is_string($sort) || !isset(self::SORTS[$sort])) {
            throw new ApiProblem(400, 'BAD_QUERY', 'Invalid sort.', ['sort' => ['Unsupported sort value.']]);
        }
        $where = [];
        $params = [];
        if (!$admin) {
            $where[] = 'p.is_active = 1';
        } else {
            $status = $query['status'] ?? 'all';
            if (!is_string($status) || !in_array($status, ['all', 'active', 'inactive'], true)) {
                throw new ApiProblem(400, 'BAD_QUERY', 'Invalid status.', ['status' => ['Expected all, active or inactive.']]);
            }
            if ($status !== 'all') {
                $where[] = 'p.is_active = '.($status === 'active' ? '1' : '0');
            }
        }
        if (array_key_exists('q', $query)) {
            if (!is_string($query['q']) || mb_strlen(trim($query['q'])) > 100) {
                throw new ApiProblem(400, 'BAD_QUERY', 'Invalid search term.', ['q' => ['Must be a string of at most 100 characters.']]);
            }
            $term = trim($query['q']);
            if ($term !== '') {
                $where[] = "(LOWER(p.name) LIKE :q ESCAPE '!' OR LOWER(p.sku) LIKE :q ESCAPE '!')";
                $params['q'] = '%'.strtr(mb_strtolower($term), ['!' => '!!', '%' => '!%', '_' => '!_']).'%';
            }
        }
        if (array_key_exists('category', $query)) {
            if (!is_string($query['category']) || !preg_match('/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/uD', $query['category'])) {
                throw new ApiProblem(400, 'BAD_QUERY', 'Invalid category.', ['category' => ['Expected a category slug.']]);
            }
            $where[] = 'c.slug = :category';
            $params['category'] = $query['category'];
        }

        $filter = $where === [] ? '' : ' WHERE '.implode(' AND ', $where);
        $from = ' FROM products p JOIN categories c ON c.id = p.category_id';
        $total = (int) $this->db->fetchOne('SELECT COUNT(*)'.$from.$filter, $params);
        if ($page - 1 > intdiv(PHP_INT_MAX - $perPage, $perPage)) {
            throw new ApiProblem(400, 'BAD_QUERY', 'Invalid pagination.', ['page' => ['Page is too large.']]);
        }
        $offset = ($page - 1) * $perPage;
        $rows = $this->db->executeQuery(
            'SELECT p.*, c.name AS category_name, c.slug AS category_slug'.$from.$filter.' ORDER BY '.self::SORTS[$sort].', p.id ASC LIMIT :limit OFFSET :offset',
            [...$params, 'limit' => $perPage, 'offset' => $offset],
            ['limit' => ParameterType::INTEGER, 'offset' => ParameterType::INTEGER],
        )->fetchAllAssociative();

        return [
            'data' => array_map($this->productDto(...), $rows),
            'pagination' => ['page' => $page, 'per_page' => $perPage, 'total' => $total, 'pages' => (int) ceil($total / $perPage)],
        ];
    }

    public function categories(): array
    {
        $rows = $this->db->fetchAllAssociative('SELECT DISTINCT c.id, c.name, c.slug FROM categories c JOIN products p ON p.category_id = c.id AND p.is_active = 1 ORDER BY c.name ASC, c.id ASC');

        return array_map(static fn (array $row): array => ['id' => (int) $row['id'], 'name' => $row['name'], 'slug' => $row['slug']], $rows);
    }

    public function detail(int $id, bool $admin = false): array
    {
        $row = $this->db->fetchAssociative('SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = :id'.($admin ? '' : ' AND p.is_active = 1'), ['id' => $id]);
        if ($row === false) {
            throw new ApiProblem(404, 'NOT_FOUND', 'Product not found.');
        }

        return $this->productDto($row);
    }

    public function parseId(string $id): int
    {
        if (!preg_match('/^[1-9][0-9]*$/D', $id) || filter_var($id, FILTER_VALIDATE_INT) === false) {
            throw new ApiProblem(400, 'BAD_QUERY', 'Invalid product ID.', ['id' => ['Expected a positive integer.']]);
        }

        return (int) $id;
    }

    public function skuExists(string $sku): bool
    {
        return $this->db->fetchOne('SELECT 1 FROM products WHERE sku = :sku', ['sku' => $sku]) !== false;
    }

    /** @param array<string, mixed> $data */
    public function create(array $data, bool $alreadyNormalized = false): array
    {
        $values = $alreadyNormalized ? $data : $this->input->normalize($data);
        if ($this->skuExists($values['sku'])) {
            throw self::skuConflict();
        }
        try {
            $id = $this->db->transactional(function () use ($values): int {
                $categoryId = $this->categoryId($values['category']);
                $now = gmdate('Y-m-d H:i:s');
                $this->db->insert('products', [
                    'category_id' => $categoryId, 'name' => $values['name'], 'sku' => $values['sku'],
                    'description' => $values['description'], 'price_cents' => $values['price_cents'],
                    'stock' => $values['stock'], 'weight_kg' => $values['weight_kg'],
                    'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
                ]);

                return (int) $this->db->lastInsertId();
            });
        } catch (UniqueConstraintViolationException) {
            throw self::skuConflict();
        }

        return $this->detail($id, true);
    }

    /** @param array<string, mixed> $data */
    public function update(int $id, array $data): array
    {
        $values = $this->input->normalize($data, partial: true);
        $this->activeId($id);
        if (isset($values['sku']) && $this->db->fetchOne('SELECT id FROM products WHERE sku = :sku AND id <> :id', ['sku' => $values['sku'], 'id' => $id]) !== false) {
            throw self::skuConflict();
        }
        try {
            $this->db->transactional(function () use ($id, $values): void {
                $changes = $values;
                if (isset($changes['category'])) {
                    $changes['category_id'] = $this->categoryId($changes['category']);
                    unset($changes['category']);
                }
                $changes['updated_at'] = gmdate('Y-m-d H:i:s');
                $affected = $this->db->update('products', $changes, ['id' => $id, 'is_active' => 1]);
                if ($affected !== 1) {
                    throw new ApiProblem(404, 'NOT_FOUND', 'Product not found.');
                }
            });
        } catch (UniqueConstraintViolationException) {
            throw self::skuConflict();
        }

        return $this->detail($id, true);
    }

    public function delete(int $id): void
    {
        $affected = $this->db->update('products', ['is_active' => 0, 'updated_at' => gmdate('Y-m-d H:i:s')], ['id' => $id, 'is_active' => 1]);
        if ($affected !== 1) {
            throw new ApiProblem(404, 'NOT_FOUND', 'Product not found.');
        }
    }

    private function activeId(int $id): void
    {
        if ($this->db->fetchOne('SELECT 1 FROM products WHERE id = :id AND is_active = 1', ['id' => $id]) === false) {
            throw new ApiProblem(404, 'NOT_FOUND', 'Product not found.');
        }
    }

    private function categoryId(string $name): int
    {
        $slug = trim(preg_replace('/[^\p{L}\p{N}]+/u', '-', mb_strtolower($name)), '-');
        if ($slug === '' || mb_strlen($slug) > 120) {
            throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', ['category' => ['Category cannot form a valid slug.']]);
        }
        $id = $this->db->fetchOne('SELECT id FROM categories WHERE slug = :slug', ['slug' => $slug]);
        if ($id !== false) {
            return (int) $id;
        }
        $this->db->insert('categories', ['name' => $name, 'slug' => $slug]);

        return (int) $this->db->lastInsertId();
    }

    /** @param array<string, mixed> $row */
    private function productDto(array $row): array
    {
        [$whole, $fraction] = array_pad(explode('.', (string) $row['weight_kg'], 2), 2, '');
        $utc = new \DateTimeZone('UTC');

        return [
            'id' => (int) $row['id'], 'name' => $row['name'], 'sku' => $row['sku'],
            'description' => $row['description'],
            'category' => ['id' => (int) $row['category_id'], 'name' => $row['category_name'], 'slug' => $row['category_slug']],
            'price_cents' => (int) $row['price_cents'], 'currency' => 'USD', 'stock' => (int) $row['stock'],
            'weight_kg' => $whole.'.'.str_pad($fraction, 3, '0'), 'is_active' => (bool) $row['is_active'],
            'image_url' => $row['image_url'], 'image_source_url' => $row['image_source_url'],
            'image_attribution' => $row['image_attribution'], 'image_license' => $row['image_license'],
            'image_license_url' => $row['image_license_url'],
            'created_at' => (new \DateTimeImmutable($row['created_at'], $utc))->format('Y-m-d\TH:i:s\Z'),
            'updated_at' => (new \DateTimeImmutable($row['updated_at'], $utc))->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    private function positiveQueryInt(mixed $value, string $field): int
    {
        if (!is_string($value) || !preg_match('/^[1-9][0-9]*$/D', $value) || filter_var($value, FILTER_VALIDATE_INT) === false) {
            throw new ApiProblem(400, 'BAD_QUERY', 'Invalid pagination.', [$field => ['Expected a positive base-10 integer.']]);
        }

        return (int) $value;
    }

    private static function skuConflict(): ApiProblem
    {
        return new ApiProblem(409, 'SKU_CONFLICT', 'SKU already exists.', ['sku' => ['SKU already exists.']]);
    }
}
