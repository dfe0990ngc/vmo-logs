<?php

declare(strict_types=1);

namespace App\Controllers;

use App\controllers\Controller;
use App\core\AuditLogger;
use App\Core\Database;
use App\core\R2StorageHelper;
use App\core\Validator;
use Exception;

class CommunicationController extends Controller
{
    private string $table = 'communications';
    private const MAX_FILE_SIZE = 52428800;

    /**
     * Get all communications with pagination, filtering, and search
     * GET /api/communications
     */
    public function index(): void
    {
        try {
            $page   = isset($_GET['page'])  ? max(1, (int)$_GET['page'])             : 1;
            $limit  = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit']))  : 10;
            $offset = ($page - 1) * $limit;

            [$where, $params, $hasSearch] = $this->buildFilters();

            $total = (int) Database::fetch(
                "SELECT COUNT(*) cnt FROM {$this->table} $where",
                $params
            )['cnt'];

            $orderClause = $hasSearch
                ? "ORDER BY relevance DESC, date_received DESC, id DESC"
                : "ORDER BY date_received DESC, id DESC";

            $selectClause = $hasSearch
                ? "SELECT *, MATCH(title, reference_no) AGAINST(? IN BOOLEAN MODE) as relevance FROM {$this->table}"
                : "SELECT * FROM {$this->table}";

            $queryParams = $hasSearch
                ? [$_GET['search'], ...$params, $limit, $offset]
                : [...$params, $limit, $offset];

            $communications = Database::fetchAll(
                "$selectClause $where $orderClause LIMIT ? OFFSET ?",
                $queryParams
            );

            $this->response(true, 'Communications retrieved successfully', [
                'data'       => $communications,
                'pagination' => [
                    'page'  => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => (int) ceil($total / $limit),
                ],
            ]);
        } catch (Exception $e) {
            $this->error('Failed to retrieve communications', $e);
        }
    }

    /**
     * Get communications for public AJAX (no auth required)
     * GET /api/ajax-communications
     */
    public function indexJSON(): void
    {
        try {
            $page   = isset($_GET['page'])  ? max(1, (int)$_GET['page'])            : 1;
            $limit  = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 10;
            $offset = ($page - 1) * $limit;

            [$where, $params, $hasSearch] = $this->buildFilters(withDate: false);

            $total = (int) Database::fetch(
                "SELECT COUNT(*) cnt FROM {$this->table} $where",
                $params
            )['cnt'];

            $orderClause = $hasSearch
                ? "ORDER BY relevance DESC, date_received DESC"
                : "ORDER BY date_received DESC";

            $selectClause = $hasSearch
                ? "SELECT id, title, communication_type, status, reference_no, date_received, file_name,file_path, MATCH(title, reference_no) AGAINST(? IN BOOLEAN MODE) as relevance FROM {$this->table}"
                : "SELECT id, title, communication_type, status, reference_no, date_received, file_name, file_path FROM {$this->table}";

            $queryParams = $hasSearch
                ? [$_GET['search'], ...$params, $limit, $offset]
                : [...$params, $limit, $offset];

            $communications = Database::fetchAll(
                "$selectClause $where $orderClause LIMIT ? OFFSET ?",
                $queryParams
            );

            $this->response(true, 'Communications retrieved successfully', [
                'data'       => $communications,
                'pagination' => [
                    'page'  => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => (int) ceil($total / $limit),
                ],
            ]);
        } catch (Exception $e) {
            $this->error('Failed to retrieve communications', $e);
        }
    }

    /**
     * Get single communication by ID
     * GET /api/communications/{id}
     */
    public function show(int $id): void
    {
        try {
            $communication = Database::fetch(
                "SELECT * FROM {$this->table} WHERE id = ?",
                [$id]
            );

            if (!$communication) {
                http_response_code(404);
                $this->response(false, 'Communication not found');
                return;
            }

            $this->response(true, 'Communication retrieved successfully', $communication);
        } catch (Exception $e) {
            $this->error('Failed to retrieve communication', $e);
        }
    }

    /**
     * Create new communication
     * POST /api/communications
     */
    public function create(): void
    {
        try {
            $data = $this->getJsonInput();
            // Fallback to $_POST if JSON input is empty (for FormData)
            if (empty($data)) {
                $data = $_POST;
            }

            $userId = $this->getAuthenticatedUser();
            $user = Database::fetch(
                "SELECT id,user_id,user_type FROM users WHERE user_id = ?",
                [$userId]
            );

            if (!$data || empty($data['title'])) {
                http_response_code(400);
                $this->response(false, 'Title is required');
                return;
            }

            $uploadResult = $this->handleFileUpload();

            $commId = Database::insert($this->table, [
                'title'              => $data['title'],
                'communication_type' => $data['communication_type'] ?? 'OTHER',
                'status'             => $data['status'] ?? 'RECEIVED',
                'reference_no'       => $data['reference_no'] ?? null,
                'date_received'      => $data['date_received'] ?? date('Y-m-d H:i:s'),
                'created_at'         => date('Y-m-d H:i:s'),
                'file_path'          => $uploadResult['file_path'] ?? null,
                'file_size'          => $uploadResult['file_size'] ?? null,
                'created_by'         => $user['id'] ?? null,
            ]);

            AuditLogger::logCreate(
                'COMMUNICATION',
                $commId,
                $data['communication_type'] ?? 'OTHER',
                $data,
                "Created new communication record: {$data['title']} (ID: $commId)"
            );

            http_response_code(201);
            $this->response(true, 'Communication created successfully', ['id' => $commId]);
        } catch (Exception $e) {
            $this->error('Failed to create communication', $e);
        }
    }

    /**
     * Update communication
     * POST /api/communications/{id}
     */
    public function update(int $id): void
    {
        try {
            $data = $this->getJsonInput();
            // Fallback to $_POST if JSON input is empty (for FormData)
            if (empty($data)) {
                $data = $_POST;
            }

            // Sanitize input
            $data = Validator::sanitizeArray($data);

            // Normalize date_received: replace ISO 8601 'T' separator with a space
            // and strip any extra trailing time segments (e.g. '2026-04-13 07:56:00:00')
            if (!empty($data['date_received'])) {
                $data['date_received'] = str_replace('T', ' ', $data['date_received']);
                $data['date_received'] = preg_replace('/(\d{2}:\d{2}:\d{2}):\d+$/', '$1', $data['date_received']);
            }

            $userId = $this->getAuthenticatedUser();
            $user = Database::fetch(
                "SELECT id,user_id,user_type FROM users WHERE user_id = ?",
                [$userId]
            );

            $oldData = Database::fetch(
                "SELECT * FROM {$this->table} WHERE id = ?",
                [$id]
            );

            if (!$oldData) {
                $this->response(false, 'Communication not found', [], 404);
                return;
            }

            // Validation rules (all optional for updates)
            $rules = [
                'title'              => 'nullable|string|max:255',
                'communication_type' => 'nullable|string|max:50',
                'status'             => 'nullable|string|max:50',
                'reference_no'       => 'nullable|string|max:100',
                'date_received'      => 'nullable|date_format:Y-m-d H:i:s',
            ];

            $messages = [
                'title.max'                 => 'Title must not exceed 255 characters',
                'communication_type.max'    => 'Communication type must not exceed 50 characters',
                'status.max'                => 'Status must not exceed 50 characters',
                'reference_no.max'          => 'Reference number must not exceed 100 characters',
                'date_received.date_format' => 'Date received must be in Y-m-d H:i:s format',
            ];

            $validator = new Validator();
            $validator->setDatabase(Database::getInstance());

            if (!$validator->validate($data, $rules, $messages)) {
                $this->response(false, 'Validation failed', [
                    'errors' => $validator->getErrors()
                ], 422);
                return;
            }

            // Build update data
            $updateData    = [];
            $allowedFields = ['title', 'communication_type', 'status', 'reference_no', 'date_received'];

            foreach ($allowedFields as $field) {
                if (isset($data[$field]) && $data[$field] !== $oldData[$field]) {
                    $updateData[$field] = $data[$field];
                }
            }

            // Handle file upload
            if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
                $this->deleteFile($oldData['file_path']);
                $uploadResult = $this->handleFileUpload();

                $updateData['file_path'] = $uploadResult['file_path'] ?? null;
                $updateData['file_size'] = $uploadResult['file_size'] ?? null;
            }

            if (empty($updateData)) {
                $this->response(true, 'No changes made to communication', ['communication' => $oldData]);
                return;
            }

            $updateData['updated_at'] = date('Y-m-d H:i:s');
            $updateData['updated_by'] = $user['id'] ?? null;

            Database::update($this->table, $updateData, 'id = :id', ['id' => $id]);

            AuditLogger::logUpdate(
                'COMMUNICATION',
                $id,
                $updateData['communication_type'] ?? $oldData['communication_type'],
                $oldData,
                $updateData,
                $data['title'] ?? $oldData['title']
            );

            $communication = Database::fetch(
                "SELECT * FROM {$this->table} WHERE id = ?",
                [$id]
            );

            $this->response(true, 'Communication updated successfully', ['communication' => $communication]);
        } catch (Exception $e) {
            error_log('Communication update error: ' . $e->getMessage());
            $this->error('Failed to update communication', $e);
        }
    }

    /**
     * Delete communication
     * DELETE /api/communications/{id}
     */
    public function delete(int $id): void
    {
        try {
            $communication = Database::fetch(
                "SELECT * FROM {$this->table} WHERE id = ?",
                [$id]
            );

            if (!$communication) {
                http_response_code(404);
                $this->response(false, 'Communication not found');
                return;
            }

            $this->deleteFile($communication['file_path']);

            Database::query(
                "DELETE FROM {$this->table} WHERE id = ?",
                [$id]
            );

            AuditLogger::logDelete(
                'COMMUNICATION',
                $id,
                $communication['communication_type'],
                $communication,
                "Deleted communication record: {$communication['title']} (ID: $id)"
            );

            $this->response(true, 'Communication deleted successfully');
        } catch (Exception $e) {
            $this->error('Failed to delete communication', $e);
        }
    }

    /**
     * Public download endpoint for files (no auth required)
     * GET /api/communications/{id}/public-download
     */
    public function publicDownload(int $id): void
    {
        try {
            $communication = Database::fetch(
                "SELECT file_path, file_name FROM {$this->table} WHERE id = ?",
                [$id]
            );

            if (!$communication || !$communication['file_path']) {
                http_response_code(404);
                $this->response(false, 'File not found');
                return;
            }

            $fileBase = pathinfo($communication['file_path'], PATHINFO_FILENAME);
            $fileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $fileBase) . '.pdf';

            R2StorageHelper::streamToBrowser(
                $communication['file_path'],
                $fileName,
                'application/pdf',
                true
            );
        } catch (Exception $e) {
            $this->error('Failed to download file', $e);
        }
    }

    /**
     * Get filter options for dropdowns
     * GET /api/communications/filter-options
     */
    public function filterOptions(): void
    {
        try {
            $types    = array_column(
                Database::fetchAll("SELECT DISTINCT communication_type FROM {$this->table} ORDER BY communication_type"),
                'communication_type'
            );
            $statuses = array_column(
                Database::fetchAll("SELECT DISTINCT status FROM {$this->table} ORDER BY status"),
                'status'
            );

            $this->response(true, 'Filter options retrieved successfully', [
                'types'    => $types    ?: ['MTOP','TRAVEL_ORDER','SB_RESOLUTION','SB_ORDINANCE',
                                            'APPLICATION_LEAVE','MEMO','NOTICE_HEARING','INVITATION',
                                            'ENDORSEMENT','DSSC','MADAC','DOE','SOLICITATION',
                                            'TENT_REQUEST','OTHER'],
                'statuses' => $statuses ?: ['RECEIVED','RELEASED','COMPLETED','PULLED_OUT'],
            ]);
        } catch (Exception $e) {
            $this->error('Failed to retrieve filter options', $e);
        }
    }

    /* =====================================================
     *  PRIVATE HELPERS
     * ===================================================== */

    /**
     * Build WHERE clause + params from $_GET filters.
     * When $withDate is false, date_from/date_to are ignored (public endpoint).
     * Returns: [$where, $params, $hasSearch]
     */
    private function buildFilters(bool $withDate = true): array
    {
        $clauses   = [];
        $params    = [];
        $hasSearch = false;

        if (!empty($_GET['search'])) {
            $clauses[]  = "MATCH(title, reference_no) AGAINST(? IN BOOLEAN MODE)";
            $params[]   = $_GET['search'];
            $hasSearch  = true;
        }

        if (!empty($_GET['type'])) {
            $clauses[] = 'communication_type = ?';
            $params[]  = $_GET['type'];
        }

        if (!empty($_GET['status'])) {
            $clauses[] = 'status = ?';
            $params[]  = $_GET['status'];
        }

        if ($withDate) {
            if (!empty($_GET['date_from'])) {
                $clauses[] = 'DATE(date_received) >= ?';
                $params[]  = $_GET['date_from'];
            }
            if (!empty($_GET['date_to'])) {
                $clauses[] = 'DATE(date_received) <= ?';
                $params[]  = $_GET['date_to'];
            }
        }

        $where = $clauses ? 'WHERE ' . implode(' AND ', $clauses) : '';

        return [$where, $params, $hasSearch];
    }

    /**
     * Validate the uploaded file and push it to R2.
     */
    private function handleFileUpload(): array
    {
        if (!isset($_FILES['file'])) {
            return ['success' => false, 'message' => 'No file uploaded'];
        }

        $result = R2StorageHelper::uploadFromRequest(
            $_FILES['file'],
            'documents',
            ['application/pdf'],
            self::MAX_FILE_SIZE
        );

        if (!$result['success']) {
            return $result;
        }

        return [
            'success'   => true,
            'file_path' => $result['key'],
            'file_size' => $result['file_size'],
        ];
    }

    /**
     * Delete a stored file by its relative path (silently ignores missing files).
     */
    private function deleteFile(?string $relativePath): void
    {
        if ($relativePath) {
            $full = __DIR__ . '/../../' . $relativePath;
            if (file_exists($full)) {
                unlink($full);
            }
        }
    }

    /**
     * Emit a JSON error response.
     */
    private function error(string $message, Exception $e): void
    {
        http_response_code(500);
        $this->response(false, $message, ['error' => $e->getMessage()]);
    }
}