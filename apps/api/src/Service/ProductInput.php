<?php

declare(strict_types=1);

namespace App\Service;

use App\Http\ApiProblem;

final class ProductInput
{
    private const KEYS = ['name', 'sku', 'description', 'category', 'price', 'stock', 'weight_kg'];

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function normalize(array $input, bool $partial = false, bool $csv = false): array
    {
        $unknown = array_diff(array_keys($input), self::KEYS);
        if ($unknown !== []) {
            throw new ApiProblem(422, 'INVALID_FIELD', 'Unexpected request field.', [reset($unknown) => ['This field is not allowed.']]);
        }
        if ($partial && $input === []) {
            throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', ['body' => ['At least one field is required.']]);
        }

        $errors = [];
        foreach (['name', 'sku', 'category', 'price', 'stock', 'weight_kg'] as $required) {
            if (!$partial && !array_key_exists($required, $input)) {
                $errors[$required] = ['This field is required.'];
            }
        }

        $result = [];
        foreach ($input as $field => $value) {
            switch ($field) {
                case 'name':
                case 'category':
                    if (!is_string($value) || trim($value) === '') {
                        $errors[$field] = ['Must be a nonempty string.'];
                        break;
                    }
                    $text = trim($value);
                    if ($field === 'category') {
                        $text = preg_replace('/\s+/u', ' ', $text);
                    }
                    if (mb_strlen($text) > ($field === 'name' ? 200 : 100)) {
                        $errors[$field] = ['Value is too long.'];
                        break;
                    }
                    $result[$field] = $text;
                    break;
                case 'sku':
                    if (!is_string($value)) {
                        $errors[$field] = ['Must be a string.'];
                        break;
                    }
                    $sku = strtoupper(trim($value));
                    if ($sku === '' || strlen($sku) > 100 || !preg_match('/^[\x20-\x7E]+$/D', $sku)) {
                        $errors[$field] = ['Use 1–100 printable ASCII characters.'];
                        break;
                    }
                    $result[$field] = $sku;
                    break;
                case 'description':
                    if (!is_string($value) || mb_strlen($value) > 5000) {
                        $errors[$field] = ['Must be a string of at most 5000 characters.'];
                        break;
                    }
                    $result[$field] = trim($value);
                    break;
                case 'price':
                    if ($csv && is_string($value) && str_starts_with($value, '$')) {
                        $value = substr($value, 1);
                    }
                    if (!is_string($value) || !preg_match('/^(?:0|[1-9][0-9]{0,8})(?:\.[0-9]{1,2})?$/D', $value)) {
                        $errors[$field] = ['Must be a positive USD decimal string with at most two fractional digits.'];
                        break;
                    }
                    [$whole, $fraction] = array_pad(explode('.', $value, 2), 2, '');
                    $cents = (int) $whole * 100 + (int) str_pad($fraction, 2, '0');
                    if ($cents <= 0) {
                        $errors[$field] = ['Must be greater than zero.'];
                        break;
                    }
                    $result['price_cents'] = $cents;
                    break;
                case 'stock':
                    if ($csv && is_string($value) && preg_match('/^[0-9]+$/D', $value)) {
                        $digits = ltrim($value, '0') ?: '0';
                        $value = filter_var($digits, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
                    }
                    if (!is_int($value) || $value < 0) {
                        $errors[$field] = ['Must be a non-negative integer.'];
                        break;
                    }
                    $result[$field] = $value;
                    break;
                case 'weight_kg':
                    if (!is_string($value) || !preg_match('/^(?:0|[1-9][0-9]{0,6})(?:\.[0-9]{1,3})?$/D', $value)) {
                        $errors[$field] = ['Must be a non-negative decimal string with at most three fractional digits.'];
                        break;
                    }
                    [$whole, $fraction] = array_pad(explode('.', $value, 2), 2, '');
                    $result[$field] = $whole.'.'.str_pad($fraction, 3, '0');
                    break;
            }
        }

        if ($errors !== []) {
            throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', $errors);
        }
        if (!array_key_exists('description', $result) && !$partial) {
            $result['description'] = '';
        }

        return $result;
    }
}
