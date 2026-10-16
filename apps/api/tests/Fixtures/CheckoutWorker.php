<?php

declare(strict_types=1);

require dirname(__DIR__, 2).'/vendor/autoload.php';

use App\Database\SqliteConnection;
use App\Http\ApiProblem;
use App\Service\CheckoutService;
use App\Service\FakePaymentGateway;
use App\Service\ReceiptTokenService;
use Doctrine\DBAL\DriverManager;

[$script, $path, $gate, $key] = $argv;
for ($i = 0; $i < 5000 && !is_file($gate); ++$i) {
    usleep(1000);
}
if (!is_file($gate)) {
    fwrite(STDERR, "Race gate timed out.\n");
    exit(1);
}

$db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'path' => $path, 'wrapperClass' => SqliteConnection::class]);
$checkout = new CheckoutService($db, new ReceiptTokenService(str_repeat('s', 32)), new FakePaymentGateway());
try {
    $result = $checkout->checkout([
        'buyer_name' => 'Race Test', 'buyer_email' => 'race@example.com',
        'items' => [['product_id' => 1, 'quantity' => 1]],
    ], $key);
    echo json_encode(['status' => $result['status']], JSON_THROW_ON_ERROR);
} catch (ApiProblem $problem) {
    echo json_encode(['status' => $problem->status, 'code' => $problem->errorCode], JSON_THROW_ON_ERROR);
}
