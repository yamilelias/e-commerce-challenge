<?php

declare(strict_types=1);

namespace App\Service;

use App\Http\ApiProblem;
use Doctrine\DBAL\Connection;

final class CheckoutService
{
    public function __construct(
        private readonly Connection $db,
        private readonly ReceiptTokenService $tokens,
        private readonly FakePaymentGateway $payment,
    ) {
    }

    /** @param array<string, mixed> $body @return array{status:int,data:array} */
    public function checkout(array $body, ?string $key): array
    {
        if (!is_string($key) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iD', $key)) {
            throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', ['Idempotency-Key' => ['A UUID v4 is required.']]);
        }
        $key = strtolower($key);
        $request = $this->normalize($body);
        $fingerprint = hash('sha256', json_encode($request, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));

        for ($attempt = 0; $attempt < 2; ++$attempt) {
            $begun = false;
            try {
                $this->db->executeStatement('BEGIN IMMEDIATE');
                $begun = true;
                $existing = $this->db->fetchAssociative('SELECT * FROM orders WHERE idempotency_key = :key', ['key' => $key]);
                if ($existing !== false) {
                    if (!hash_equals($existing['request_fingerprint'], $fingerprint)) {
                        throw new ApiProblem(409, 'IDEMPOTENCY_CONFLICT', 'Checkout key already belongs to another request.');
                    }
                    $this->db->executeStatement('COMMIT');
                    $begun = false;

                    return ['status' => 200, 'data' => $this->receipt($existing, true)];
                }

                $items = [];
                $total = 0;
                foreach ($request['items'] as $line) {
                    $product = $this->db->fetchAssociative('SELECT id, sku, name, price_cents FROM products WHERE id = :id AND is_active = 1', ['id' => $line['product_id']]);
                    if ($product === false) {
                        throw new ApiProblem(409, 'PRODUCT_UNAVAILABLE', 'One or more products are unavailable.', ['items' => ['Remove unavailable products and retry.']]);
                    }
                    $affected = $this->db->executeStatement(
                        'UPDATE products SET stock = stock - :quantity, updated_at = :updated WHERE id = :id AND is_active = 1 AND stock >= :quantity',
                        ['id' => $line['product_id'], 'quantity' => $line['quantity'], 'updated' => gmdate('Y-m-d H:i:s')],
                    );
                    if ($affected !== 1) {
                        throw new ApiProblem(409, 'INSUFFICIENT_STOCK', 'One or more items are out of stock.', ['items' => ['Check available quantities and retry.']]);
                    }
                    $unit = (int) $product['price_cents'];
                    if ($unit > intdiv(PHP_INT_MAX, $line['quantity'])) {
                        throw new \OverflowException('Order line total overflow.');
                    }
                    $lineTotal = $unit * $line['quantity'];
                    if ($total > PHP_INT_MAX - $lineTotal) {
                        throw new \OverflowException('Order total overflow.');
                    }
                    $total += $lineTotal;
                    $items[] = [
                        'product_id' => (int) $product['id'], 'sku' => $product['sku'], 'name' => $product['name'],
                        'quantity' => $line['quantity'], 'unit_price_cents' => $unit, 'line_total_cents' => $lineTotal,
                    ];
                }
                if (!$this->payment->pay($total)) {
                    throw new \RuntimeException('Fake payment failed.');
                }
                $now = gmdate('Y-m-d H:i:s');
                $reference = 'ORD-'.strtoupper(bin2hex(random_bytes(6)));
                $token = $this->tokens->derive($key);
                $this->db->insert('orders', [
                    'reference' => $reference, 'buyer_name' => $request['buyer_name'], 'buyer_email' => $request['buyer_email'],
                    'status' => 'paid', 'currency' => 'USD', 'total_cents' => $total, 'idempotency_key' => $key,
                    'request_fingerprint' => $fingerprint, 'receipt_token_hash' => $this->tokens->hash($token),
                    'created_at' => $now, 'paid_at' => $now,
                ]);
                $orderId = (int) $this->db->lastInsertId();
                foreach ($items as $item) {
                    $this->db->insert('order_items', [
                        'order_id' => $orderId, 'product_id' => $item['product_id'], 'sku_snapshot' => $item['sku'],
                        'name_snapshot' => $item['name'], 'quantity' => $item['quantity'],
                        'unit_price_cents' => $item['unit_price_cents'], 'line_total_cents' => $item['line_total_cents'],
                    ]);
                }
                $this->db->executeStatement('COMMIT');
                $begun = false;

                return ['status' => 201, 'data' => [
                    'reference' => $reference, 'status' => 'paid', 'currency' => 'USD', 'total_cents' => $total,
                    'buyer_name' => $request['buyer_name'], 'buyer_email' => $request['buyer_email'], 'items' => $items,
                    'created_at' => $this->iso($now), 'paid_at' => $this->iso($now), 'receipt_token' => $token,
                ]];
            } catch (\Throwable $error) {
                if ($begun) {
                    $this->db->executeStatement('ROLLBACK');
                }
                if ($attempt === 0 && $this->isBusy($error)) {
                    usleep(50000);
                    continue;
                }
                throw $error;
            }
        }

        throw new \RuntimeException('Checkout retry exhausted.');
    }

    public function lookup(string $reference, ?string $token): array
    {
        if (!is_string($token) || !preg_match('/^[0-9a-f]{64}$/D', $token)) {
            throw new ApiProblem(400, 'BAD_QUERY', 'Invalid receipt token.', ['token' => ['Expected a 64-character lowercase token.']]);
        }
        $order = $this->db->fetchAssociative('SELECT * FROM orders WHERE reference = :reference', ['reference' => $reference]);
        if ($order === false || !hash_equals($order['receipt_token_hash'], $this->tokens->hash($token))) {
            throw new ApiProblem(404, 'NOT_FOUND', 'Order not found.');
        }

        return $this->receipt($order, false);
    }

    /** @param array<string, mixed> $body */
    private function normalize(array $body): array
    {
        foreach (array_keys($body) as $field) {
            if (!in_array($field, ['buyer_name', 'buyer_email', 'items'], true)) {
                throw new ApiProblem(422, 'INVALID_FIELD', 'Unexpected request field.', [$field => ['This field is not allowed.']]);
            }
        }
        $name = $body['buyer_name'] ?? null;
        $email = $body['buyer_email'] ?? null;
        $inputItems = $body['items'] ?? null;
        $errors = [];
        if (!is_string($name) || ($name = trim($name)) === '' || mb_strlen($name) > 200) {
            $errors['buyer_name'] = ['Must be a nonempty string of at most 200 characters.'];
        }
        if (!is_string($email) || ($email = mb_strtolower(trim($email))) === '' || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['buyer_email'] = ['Must be a valid email address of at most 254 characters.'];
        }
        if (!is_array($inputItems) || !array_is_list($inputItems) || count($inputItems) < 1 || count($inputItems) > 50) {
            $errors['items'] = ['Choose between 1 and 50 items.'];
        }
        if ($errors !== []) {
            throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', $errors);
        }
        $coalesced = [];
        foreach ($inputItems as $index => $item) {
            if (!is_array($item) || array_keys($item) !== ['product_id', 'quantity'] && array_keys($item) !== ['quantity', 'product_id']) {
                throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', ["items[$index]" => ['Expected product_id and quantity only.']]);
            }
            if (!is_int($item['product_id']) || $item['product_id'] <= 0) {
                throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', ["items[$index].product_id" => ['Expected a positive integer.']]);
            }
            if (!is_int($item['quantity']) || $item['quantity'] < 1 || $item['quantity'] > 999) {
                throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', ["items[$index].quantity" => ['Expected an integer from 1 to 999.']]);
            }
            $id = $item['product_id'];
            $coalesced[$id] = ($coalesced[$id] ?? 0) + $item['quantity'];
            if ($coalesced[$id] > 999) {
                throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', ["items[$index].quantity" => ['Combined quantity must be at most 999.']]);
            }
        }
        ksort($coalesced, SORT_NUMERIC);
        $items = [];
        foreach ($coalesced as $id => $quantity) {
            $items[] = ['product_id' => (int) $id, 'quantity' => $quantity];
        }

        return ['buyer_name' => $name, 'buyer_email' => $email, 'items' => $items];
    }

    /** @param array<string, mixed> $order */
    private function receipt(array $order, bool $withToken): array
    {
        $rows = $this->db->fetchAllAssociative('SELECT product_id, sku_snapshot, name_snapshot, quantity, unit_price_cents, line_total_cents FROM order_items WHERE order_id = :id ORDER BY product_id ASC, id ASC', ['id' => $order['id']]);
        $items = array_map(static fn (array $row): array => [
            'product_id' => $row['product_id'] === null ? null : (int) $row['product_id'],
            'sku' => $row['sku_snapshot'], 'name' => $row['name_snapshot'], 'quantity' => (int) $row['quantity'],
            'unit_price_cents' => (int) $row['unit_price_cents'], 'line_total_cents' => (int) $row['line_total_cents'],
        ], $rows);
        $data = [
            'reference' => $order['reference'], 'status' => $order['status'], 'currency' => $order['currency'],
            'total_cents' => (int) $order['total_cents'], 'buyer_name' => $order['buyer_name'], 'buyer_email' => $order['buyer_email'],
            'items' => $items, 'created_at' => $this->iso($order['created_at']),
            'paid_at' => $order['paid_at'] === null ? null : $this->iso($order['paid_at']),
        ];
        if ($withToken) {
            $data['receipt_token'] = $this->tokens->derive($order['idempotency_key']);
        }

        return $data;
    }

    private function iso(string $date): string
    {
        return (new \DateTimeImmutable($date, new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');
    }

    private function isBusy(\Throwable $error): bool
    {
        return str_contains(strtolower($error->getMessage()), 'database is locked')
            || str_contains(strtolower($error->getMessage()), 'database is busy');
    }
}
