<?php

declare(strict_types=1);

namespace App\Service;

use App\Http\ApiProblem;

final class CsvProductImporter
{
    private const COLUMNS = ['name', 'sku', 'description', 'category', 'price', 'stock', 'weight_kg'];
    private const ISSUE_LIMIT = 200;

    public function __construct(private readonly ProductInput $input, private readonly ProductService $products)
    {
    }

    /** @return array{total_rows:int,inserted:int,skipped:int,rejected:int,issues:array,truncated:bool} */
    public function importFile(string $path): array
    {
        $contents = @file_get_contents($path);
        if ($contents === false) {
            throw new ApiProblem(422, 'CSV_EMPTY', 'CSV file cannot be read.', ['file' => ['Choose a readable CSV file.']]);
        }
        if ($contents === '') {
            throw new ApiProblem(422, 'CSV_EMPTY', 'CSV file is empty.', ['file' => ['A header and at least one data row are required.']]);
        }
        if (!mb_check_encoding($contents, 'UTF-8') || !$this->hasValidQuotes($contents)) {
            throw new ApiProblem(422, 'CSV_INVALID', 'CSV file could not be parsed.', ['file' => ['Use valid UTF-8 CSV syntax.']]);
        }

        $stream = fopen('php://temp', 'w+');
        if ($stream === false) {
            throw new \RuntimeException('Unable to open CSV stream.');
        }
        try {
            if (fwrite($stream, $contents) !== strlen($contents)) {
                throw new \RuntimeException('Unable to buffer CSV input.');
            }
            rewind($stream);

            return $this->importStream($stream);
        } finally {
            fclose($stream);
        }
    }

    /** @param resource $stream */
    private function importStream($stream): array
    {
        $header = fgetcsv($stream, null, ',', '"', '');
        if ($header === false) {
            throw new ApiProblem(422, 'CSV_EMPTY', 'CSV file is empty.', ['file' => ['A header and at least one data row are required.']]);
        }
        $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $header[0]);
        $header = array_map(static fn ($value): string => trim((string) $value), $header);
        $sorted = $header;
        sort($sorted);
        $expected = self::COLUMNS;
        sort($expected);
        if (count($header) !== count(self::COLUMNS) || $sorted !== $expected) {
            throw new ApiProblem(422, 'CSV_HEADER_INVALID', 'CSV columns do not match the required schema.', [
                'file' => ['Expected name,sku,description,category,price,stock,weight_kg.'],
            ]);
        }

        $first = fgetcsv($stream, null, ',', '"', '');
        if ($first === false) {
            throw new ApiProblem(422, 'CSV_EMPTY', 'CSV file has no data rows.', ['file' => ['At least one data row is required.']]);
        }

        $result = ['total_rows' => 0, 'inserted' => 0, 'skipped' => 0, 'rejected' => 0, 'issues' => [], 'truncated' => false];
        $seen = [];
        $row = $first;
        do {
            ++$result['total_rows'];
            $rowNumber = $result['total_rows'] + 1;
            if ($this->isBlank($row)) {
                ++$result['skipped'];
                $this->issue($result, $rowNumber, 'row', 'EMPTY_ROW', 'Blank row skipped.');
            } elseif (count($row) !== count($header)) {
                ++$result['rejected'];
                $this->issue($result, $rowNumber, 'row', 'COLUMN_COUNT', 'CSV row has the wrong number of columns.');
            } else {
                $record = array_combine($header, array_map(static fn ($value): string => trim((string) $value), $row));
                try {
                    $values = $this->input->normalize($record, csv: true);
                    $sku = $values['sku'];
                    if (isset($seen[$sku])) {
                        ++$result['skipped'];
                        $this->issue($result, $rowNumber, 'sku', 'DUPLICATE_IN_FILE', 'Duplicate SKU in uploaded file.');
                    } else {
                        $seen[$sku] = true;
                        if ($this->products->skuExists($sku)) {
                            ++$result['skipped'];
                            $this->issue($result, $rowNumber, 'sku', 'SKU_EXISTS', 'SKU already exists.');
                        } else {
                            try {
                                $this->products->create($values, alreadyNormalized: true);
                                ++$result['inserted'];
                            } catch (ApiProblem $problem) {
                                if ($problem->errorCode !== 'SKU_CONFLICT') {
                                    throw $problem;
                                }
                                ++$result['skipped'];
                                $this->issue($result, $rowNumber, 'sku', 'SKU_EXISTS', 'SKU already exists.');
                            }
                        }
                    }
                } catch (ApiProblem $problem) {
                    if ($problem->status !== 422) {
                        throw $problem;
                    }
                    ++$result['rejected'];
                    foreach (self::COLUMNS as $field) {
                        if (!isset($problem->fields[$field])) {
                            continue;
                        }
                        foreach ($problem->fields[$field] as $message) {
                            $this->issue($result, $rowNumber, $field, 'INVALID_'.strtoupper($field), $message);
                        }
                    }
                }
            }
        } while (($row = fgetcsv($stream, null, ',', '"', '')) !== false);

        return $result;
    }

    /** @param array<int, string|null> $row */
    private function isBlank(array $row): bool
    {
        foreach ($row as $cell) {
            if ($cell !== null && trim($cell) !== '') {
                return false;
            }
        }

        return true;
    }

    /** @param array<string, mixed> $result */
    private function issue(array &$result, int $row, string $field, string $code, string $message): void
    {
        if (count($result['issues']) < self::ISSUE_LIMIT) {
            $result['issues'][] = compact('row', 'field', 'code', 'message');
        } else {
            $result['truncated'] = true;
        }
    }

    private function hasValidQuotes(string $csv): bool
    {
        $state = 'start';
        for ($i = 0, $length = strlen($csv); $i < $length; ++$i) {
            $char = $csv[$i];
            if ($state === 'quoted') {
                if ($char === '"') {
                    $state = 'after_quote';
                }
                continue;
            }
            if ($state === 'after_quote') {
                if ($char === '"') {
                    $state = 'quoted';
                    continue;
                }
                if ($char !== ',' && $char !== "\n" && $char !== "\r") {
                    return false;
                }
                $state = 'start';
                continue;
            }
            if ($char === '"') {
                if ($state !== 'start') {
                    return false;
                }
                $state = 'quoted';
            } elseif ($char === ',') {
                $state = 'start';
            } elseif ($char === "\n" || $char === "\r") {
                $state = 'start';
            } else {
                $state = 'unquoted';
            }
        }

        return $state !== 'quoted';
    }
}
