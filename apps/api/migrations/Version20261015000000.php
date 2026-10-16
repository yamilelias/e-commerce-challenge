<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261015000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create the frozen category, product, order and order item schema';
    }

    public function up(Schema $schema): void
    {
        $this->abortIf($this->connection->getDatabasePlatform()->getName() !== 'sqlite', 'This migration requires SQLite.');

        $this->addSql('CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name VARCHAR(100) NOT NULL, slug VARCHAR(120) NOT NULL, CONSTRAINT category_name_length CHECK (length(name) BETWEEN 1 AND 100), CONSTRAINT category_slug_length CHECK (length(slug) BETWEEN 1 AND 120))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_CATEGORIES_SLUG ON categories (slug)');

        $this->addSql("CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, category_id INTEGER NOT NULL, name VARCHAR(200) NOT NULL, sku VARCHAR(100) NOT NULL, description TEXT NOT NULL DEFAULT '', price_cents INTEGER NOT NULL, stock INTEGER NOT NULL, weight_kg DECIMAL(10,3) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, CONSTRAINT FK_PRODUCTS_CATEGORY FOREIGN KEY (category_id) REFERENCES categories (id), CONSTRAINT product_name_length CHECK (length(name) BETWEEN 1 AND 200), CONSTRAINT product_sku_length CHECK (length(sku) BETWEEN 1 AND 100), CONSTRAINT product_price_positive CHECK (price_cents > 0), CONSTRAINT product_stock_nonnegative CHECK (stock >= 0), CONSTRAINT product_weight_nonnegative CHECK (weight_kg >= 0), CONSTRAINT product_active_boolean CHECK (is_active IN (0, 1)))");
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PRODUCTS_SKU ON products (sku)');
        $this->addSql('CREATE INDEX IDX_PRODUCTS_ACTIVE_CATEGORY_ID ON products (is_active, category_id, id)');

        $this->addSql("CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, reference VARCHAR(40) NOT NULL, buyer_name VARCHAR(200) NOT NULL, buyer_email VARCHAR(254) NOT NULL, status VARCHAR(16) NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'USD', total_cents INTEGER NOT NULL, idempotency_key VARCHAR(100) NOT NULL, request_fingerprint VARCHAR(64) NOT NULL, receipt_token_hash VARCHAR(64) NOT NULL, created_at TEXT NOT NULL, paid_at TEXT DEFAULT NULL, CONSTRAINT order_reference_length CHECK (length(reference) BETWEEN 1 AND 40), CONSTRAINT order_buyer_name_length CHECK (length(buyer_name) BETWEEN 1 AND 200), CONSTRAINT order_status CHECK (status IN ('pending', 'paid', 'failed')), CONSTRAINT order_currency CHECK (currency = 'USD'), CONSTRAINT order_total_nonnegative CHECK (total_cents >= 0), CONSTRAINT order_fingerprint_length CHECK (length(request_fingerprint) = 64), CONSTRAINT order_receipt_hash_length CHECK (length(receipt_token_hash) = 64))");
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ORDERS_REFERENCE ON orders (reference)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ORDERS_IDEMPOTENCY_KEY ON orders (idempotency_key)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ORDERS_RECEIPT_TOKEN_HASH ON orders (receipt_token_hash)');

        $this->addSql('CREATE TABLE order_items (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, order_id INTEGER NOT NULL, product_id INTEGER DEFAULT NULL, sku_snapshot VARCHAR(100) NOT NULL, name_snapshot VARCHAR(200) NOT NULL, quantity INTEGER NOT NULL, unit_price_cents INTEGER NOT NULL, line_total_cents INTEGER NOT NULL, CONSTRAINT FK_ORDER_ITEMS_ORDER FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE, CONSTRAINT FK_ORDER_ITEMS_PRODUCT FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL, CONSTRAINT order_item_quantity_positive CHECK (quantity > 0), CONSTRAINT order_item_price_positive CHECK (unit_price_cents > 0), CONSTRAINT order_item_total_positive CHECK (line_total_cents > 0), CONSTRAINT order_item_snapshot_sku_length CHECK (length(sku_snapshot) BETWEEN 1 AND 100), CONSTRAINT order_item_snapshot_name_length CHECK (length(name_snapshot) BETWEEN 1 AND 200))');
        $this->addSql('CREATE INDEX IDX_ORDER_ITEMS_ORDER ON order_items (order_id)');
        $this->addSql('CREATE INDEX IDX_ORDER_ITEMS_PRODUCT ON order_items (product_id)');
    }

    public function down(Schema $schema): void
    {
        $this->abortIf($this->connection->getDatabasePlatform()->getName() !== 'sqlite', 'This migration requires SQLite.');
        $this->addSql('DROP TABLE order_items');
        $this->addSql('DROP TABLE orders');
        $this->addSql('DROP TABLE products');
        $this->addSql('DROP TABLE categories');
    }
}
