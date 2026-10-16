<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;

final class ProductImageImporter
{
    private const FIELDS = ['image_url', 'image_source_url', 'image_attribution', 'image_license', 'image_license_url'];

    public function __construct(private readonly Connection $db)
    {
    }

    /** @return array{total: int, updated: int, skipped: int, missing: int} */
    public function importFile(string $file): array
    {
        $contents = @file_get_contents($file);
        if ($contents === false) {
            throw new \InvalidArgumentException('Image catalog cannot be read.');
        }
        try {
            $catalog = json_decode($contents, false, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $error) {
            throw new \InvalidArgumentException('Image catalog is invalid JSON.', 0, $error);
        }
        if (!$catalog instanceof \stdClass) {
            throw new \InvalidArgumentException('Image catalog must be an object keyed by SKU.');
        }

        // Validate every entry before starting a transaction or changing a product.
        $rows = [];
        foreach ($catalog as $sku => $metadata) {
            if (!is_string($sku) || trim($sku) !== $sku || strtoupper($sku) !== $sku || $sku === '' || strlen($sku) > 100 || !preg_match('/^[\x20-\x7E]+$/D', $sku)) {
                throw new \InvalidArgumentException('Image catalog contains an invalid normalized SKU.');
            }
            if (!$metadata instanceof \stdClass || count(get_object_vars($metadata)) !== count(self::FIELDS) || array_diff(array_keys(get_object_vars($metadata)), self::FIELDS) !== []) {
                throw new \InvalidArgumentException("Image catalog entry $sku must contain exactly the five image fields.");
            }
            $row = [];
            foreach (self::FIELDS as $field) {
                $value = $metadata->{$field};
                if (!is_string($value) || trim($value) !== $value || $value === '' || mb_strlen($value) > 2048 || preg_match('/[\x00-\x1F\x7F]/', $value)) {
                    throw new \InvalidArgumentException("Image catalog entry $sku has invalid $field.");
                }
                $row[$field] = $value;
            }
            if (!$this->validUrl($row['image_url'], 'upload.wikimedia.org') || !$this->validUrl($row['image_source_url'], 'commons.wikimedia.org') || !$this->validUrl($row['image_license_url'])) {
                throw new \InvalidArgumentException("Image catalog entry $sku has invalid HTTPS Commons or license URLs.");
            }
            $rows[$sku] = $row;
        }

        return $this->db->transactional(function () use ($rows): array {
            $counts = ['total' => count($rows), 'updated' => 0, 'skipped' => 0, 'missing' => 0];
            foreach ($rows as $sku => $row) {
                $existing = $this->db->fetchAssociative('SELECT id, image_url FROM products WHERE sku = :sku', ['sku' => $sku]);
                if ($existing === false) {
                    ++$counts['missing'];
                } elseif ($existing['image_url'] !== null) {
                    ++$counts['skipped'];
                } else {
                    $affected = $this->db->executeStatement('UPDATE products SET image_url = :image_url, image_source_url = :image_source_url, image_attribution = :image_attribution, image_license = :image_license, image_license_url = :image_license_url, updated_at = :updated_at WHERE id = :id AND image_url IS NULL', [...$row, 'updated_at' => gmdate('Y-m-d H:i:s'), 'id' => $existing['id']]);
                    $counts[$affected === 1 ? 'updated' : 'skipped']++;
                }
            }

            return $counts;
        });
    }

    private function validUrl(string $url, ?string $host = null): bool
    {
        $parts = parse_url($url);
        return is_array($parts)
            && ($parts['scheme'] ?? null) === 'https'
            && isset($parts['host'], $parts['path'])
            && ($host === null || $parts['host'] === $host)
            && !isset($parts['user']) && !isset($parts['pass']) && !isset($parts['port'])
            && filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
}
