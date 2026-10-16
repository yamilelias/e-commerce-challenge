<?php

declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Http\ApiProblem;
use App\Security\AdminSession;
use App\Service\CsvProductImporter;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class ImportController
{
    public function __construct(private readonly AdminSession $admin, private readonly CsvProductImporter $importer)
    {
    }

    #[Route('/api/v1/products/import', name: 'api_v1_products_import', methods: ['POST'])]
    public function __invoke(Request $request): JsonResponse
    {
        $this->admin->requireAdmin($request, true);
        if (!str_starts_with((string) $request->headers->get('Content-Type'), 'multipart/form-data;')) {
            throw new ApiProblem(415, 'UNSUPPORTED_MEDIA_TYPE', 'Expected multipart/form-data.');
        }
        if ($request->files->all() === [] && (int) $request->headers->get('Content-Length', '0') > 2097152 + 65536) {
            throw new ApiProblem(413, 'FILE_TOO_LARGE', 'CSV file exceeds the upload limit.', ['file' => ['Maximum size is 2 MiB.']]);
        }
        if ($request->request->all() !== [] || array_keys($request->files->all()) !== ['file']) {
            throw new ApiProblem(422, 'VALIDATION_ERROR', 'Upload exactly one file field.', ['file' => ['Expected one file field named file.']]);
        }
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile) {
            throw new ApiProblem(422, 'VALIDATION_ERROR', 'Choose a CSV file.', ['file' => ['A file is required.']]);
        }
        if ($file->getError() === UPLOAD_ERR_INI_SIZE || $file->getError() === UPLOAD_ERR_FORM_SIZE) {
            throw new ApiProblem(413, 'FILE_TOO_LARGE', 'CSV file exceeds the upload limit.', ['file' => ['Maximum size is 2 MiB.']]);
        }
        if (!$file->isValid()) {
            throw new ApiProblem(422, 'CSV_INVALID', 'CSV upload failed.', ['file' => ['Upload could not be read.']]);
        }
        if (!preg_match('/\.csv$/iD', $file->getClientOriginalName())) {
            throw new ApiProblem(415, 'UNSUPPORTED_MEDIA_TYPE', 'Expected a .csv file.', ['file' => ['Filename must end in .csv.']]);
        }
        $size = $file->getSize();
        if ($size !== false && $size > 2097152) {
            throw new ApiProblem(413, 'FILE_TOO_LARGE', 'CSV file exceeds the upload limit.', ['file' => ['Maximum size is 2 MiB.']]);
        }
        if ($size === 0) {
            throw new ApiProblem(422, 'CSV_EMPTY', 'CSV file is empty.', ['file' => ['A header and at least one data row are required.']]);
        }

        return new JsonResponse(['data' => $this->importer->importFile($file->getPathname())], 200, [
            'Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store',
        ]);
    }
}
