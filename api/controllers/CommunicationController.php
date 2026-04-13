<?php

declare(strict_types=1);

namespace App\Controllers;

use App\controllers\Controller;
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

            [$where, $params] = $this->buildFilters();

            $total = (int) Database::fetch(
                "SELECT COUNT(*) cnt FROM {$this->table} $where",
                $params
            )['cnt'];

            $communications = Database::fetchAll(
                "SELECT * FROM {$this->table} $where ORDER BY date_received DESC, id DESC LIMIT ? OFFSET ?",
                [...$params, $limit, $offset]
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

            [$where, $params] = $this->buildFilters(withDate: false);

            $total = (int) Database::fetch(
                "SELECT COUNT(*) cnt FROM {$this->table} $where",
                $params
            )['cnt'];

            $communications = Database::fetchAll(
                "SELECT id, title, communication_type, status, reference_no, date_received, file_name
                 FROM {$this->table} $where ORDER BY date_received DESC LIMIT ? OFFSET ?",
                [...$params, $limit, $offset]
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
            
            $userId   = $_SERVER['HTTP_X_USER_ID']   ?? null;
            $userName = $_SERVER['HTTP_X_USER_NAME'] ?? 'Unknown';

            if (!$data || empty($data['title'])) {
                http_response_code(400);
                $this->response(false, 'Title is required');
                return;
            }

            $uploadResult = $this->handleFileUpload();

            $commId = Database::insert($this->table,[
                'title' => $data['title'],
                'communication_type' => $data['communication_type'] ?? 'OTHER',
                'status' => $data['status'] ?? 'RECEIVED',
                'reference_no' => $data['reference_no'] ?? null,
                'date_received' => $data['date_received'] ?? date('Y-m-d'),
                'created_at' => date('Y-m-d H:i:s'),
                'file_path' => $uploadResult['file_path'] ?? null,
                'file_size' => $uploadResult['file_size'] ?? null,
                'created_by' => $userId,
            ]);

            $this->logAuditTrail($userId, $userName, 'CREATE', 'COMMUNICATION', $commId,
                $data['title'], null, $data);

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

            $userId   = $_SERVER['HTTP_X_USER_ID']   ?? null;
            $userName = $_SERVER['HTTP_X_USER_NAME'] ?? 'Unknown';

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
                'title' => 'nullable|string|max:255',
                'communication_type' => 'nullable|string|max:50',
                'status' => 'nullable|string|max:50',
                'reference_no' => 'nullable|string|max:100',
                'date_received' => 'nullable|date_format:Y-m-d',
            ];

            $messages = [
                'title.max' => 'Title must not exceed 255 characters',
                'communication_type.max' => 'Communication type must not exceed 50 characters',
                'status.max' => 'Status must not exceed 50 characters',
                'reference_no.max' => 'Reference number must not exceed 100 characters',
                'date_received.date_format' => 'Date received must be in Y-m-d format',
            ];

            $validator = new Validator();
            $validator->setDatabase(Database::getInstance());

            if (!$validator->validate($data, $rules, $messages)) {
                $this->response(false, 'Validation failed', [
                    'errors' => $validator->getErrors()
                ], 422);
            }

            // Build update data
            $updateData = [];
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
            $updateData['updated_by'] = $userId;

            Database::update($this->table, $updateData, 'id = :id', ['id' => $id]);

            $this->logAuditTrail($userId, $userName, 'UPDATE', 'COMMUNICATION', $id,
                $data['title'] ?? $oldData['title'], $oldData, array_merge($oldData, $data ?? []));

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
            $userId   = $_SERVER['HTTP_X_USER_ID']   ?? null;
            $userName = $_SERVER['HTTP_X_USER_NAME'] ?? 'Unknown';

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

            $this->logAuditTrail($userId, $userName, 'DELETE', 'COMMUNICATION', $id,
                $communication['title'], $communication, null);

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
                'statuses' => $statuses ?: ['RECEIVED','FOR_SIGNING','SIGNED','RELEASED'],
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
     */
    private function buildFilters(bool $withDate = true): array
    {
        $clauses = [];
        $params  = [];

        if (!empty($_GET['search'])) {
            $search    = '%' . $_GET['search'] . '%';
            $clauses[] = '(title LIKE ? OR reference_no LIKE ?)';
            $params[]  = $search;
            $params[]  = $search;
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

        return [$where, $params];
    }
    
    /**
     * Validate the uploaded file and push it to R2.
     * Returns the same shape as the old local handleFileUpload()
     * so the rest of the controller stays unchanged.
     */
    private function handleFileUpload(): array {
        if (!isset($_FILES['file'])) {
            return ['success' => false, 'message' => 'No file uploaded'];
        }

        $result = R2StorageHelper::uploadFromRequest(
            $_FILES['file'],
            'documents',                  // R2 folder prefix
            ['application/pdf'],          // allowed MIME types
            self::MAX_FILE_SIZE
        );

        if (!$result['success']) {
            return $result;
        }

        return [
            'success'   => true,
            'file_path' => $result['key'],       // R2 key (replaces local relative path)
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

    /**
     * Log an entry to audit_trails.
     */
    private function logAuditTrail(
        mixed  $userId,
        string $userName,
        string $action,
        string $entity,
        mixed  $entityId,
        string $entityName,
        mixed  $oldValues,
        mixed  $newValues
    ): void {
        try {
            Database::query("
                INSERT INTO audit_trails (
                    user_id, user_name, user_type, action, entity_type,
                    entity_id, entity_name, old_values, new_values,
                    ip_address, user_agent, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ", [
                $userId,
                $userName,
                'Staff',
                $action,
                $entity,
                $entityId,
                $entityName,
                json_encode($oldValues),
                json_encode($newValues),
                $_SERVER['REMOTE_ADDR']     ?? 'Unknown',
                $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
            ]);
        } catch (Exception $e) {
            error_log('Audit trail logging failed: ' . $e->getMessage());
        }
    }
}