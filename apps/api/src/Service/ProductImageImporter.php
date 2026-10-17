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
            if (!$metadata instanceof \stdClass || array_diff(array_keys(get_object_vars($metadata)), [...self::FIELDS, 'alternate_images']) !== [] || array_diff(self::FIELDS, array_keys(get_object_vars($metadata))) !== []) {
                throw new \InvalidArgumentException("Image catalog entry $sku must contain the five image fields and optional alternate_images.");
            }
            $row = $this->validatedImage($metadata, $sku);
            $alternates = [];
            if (property_exists($metadata, 'alternate_images')) {
                if (!is_array($metadata->alternate_images) || count($metadata->alternate_images) !== 2) {
                    throw new \InvalidArgumentException("Image catalog entry $sku must contain exactly two alternate_images.");
                }
                foreach ($metadata->alternate_images as $position => $image) {
                    if (!$image instanceof \stdClass || count(get_object_vars($image)) !== count(self::FIELDS) || array_diff(array_keys(get_object_vars($image)), self::FIELDS) !== []) {
                        throw new \InvalidArgumentException("Image catalog entry $sku has invalid alternate image fields.");
                    }
                    $alternates[$position + 1] = $this->validatedImage($image, "$sku alternate ".($position + 1));
                }
                $urls = [$row['image_url'], ...array_column($alternates, 'image_url')];
                if (count(array_unique($urls)) !== count($urls)) {
                    throw new \InvalidArgumentException("Image catalog entry $sku has duplicate image URLs.");
                }
            }
            $rows[$sku] = ['primary' => $row, 'alternates' => $alternates];
        }

        return $this->db->transactional(function () use ($rows): array {
            $counts = ['total' => count($rows), 'updated' => 0, 'skipped' => 0, 'missing' => 0];
            foreach ($rows as $sku => $images) {
                $existing = $this->db->fetchAssociative('SELECT id, image_url FROM products WHERE sku = :sku', ['sku' => $sku]);
                if ($existing === false) {
                    ++$counts['missing'];
                } else {
                    $changed = false;
                    if ($existing['image_url'] === null) {
                        $changed = $this->db->executeStatement('UPDATE products SET image_url = :image_url, image_source_url = :image_source_url, image_attribution = :image_attribution, image_license = :image_license, image_license_url = :image_license_url, updated_at = :updated_at WHERE id = :id AND image_url IS NULL', [...$images['primary'], 'updated_at' => gmdate('Y-m-d H:i:s'), 'id' => $existing['id']]) === 1;
                    }
                    foreach ($images['alternates'] as $position => $image) {
                        $inserted = $this->db->executeStatement('INSERT OR IGNORE INTO product_images (product_id, position, image_url, image_source_url, image_attribution, image_license, image_license_url) VALUES (:product_id, :position, :image_url, :image_source_url, :image_attribution, :image_license, :image_license_url)', ['product_id' => $existing['id'], 'position' => $position, ...$image]);
                        $changed = $inserted === 1 || $changed;
                    }
                    ++$counts[$changed ? 'updated' : 'skipped'];
                }
            }

            return $counts;
        });
    }

    private function validatedImage(\stdClass $metadata, string $label): array
    {
        $row = [];
        foreach (self::FIELDS as $field) {
            $value = $metadata->{$field};
            if (!is_string($value) || trim($value) !== $value || $value === '' || mb_strlen($value) > 2048 || preg_match('/[\x00-\x1F\x7F]/', $value)) {
                throw new \InvalidArgumentException("Image catalog entry $label has invalid $field.");
            }
            $row[$field] = $value;
        }
        if (!$this->validUrl($row['image_url'], ['upload.wikimedia.org', 'thumb.wikimedia.org']) || !$this->validUrl($row['image_source_url'], ['commons.wikimedia.org']) || !$this->validUrl($row['image_license_url'])) {
            throw new \InvalidArgumentException("Image catalog entry $label has invalid HTTPS Commons or license URLs.");
        }
        return $row;
    }

    /** @param list<string>|null $hosts */
    private function validUrl(string $url, ?array $hosts = null): bool
    {
        $parts = parse_url($url);
        return is_array($parts)
            && ($parts['scheme'] ?? null) === 'https'
            && isset($parts['host'], $parts['path'])
            && ($hosts === null || in_array($parts['host'], $hosts, true))
            && !isset($parts['user']) && !isset($parts['pass']) && !isset($parts['port'])
            && filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
}
