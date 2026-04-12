<?php
declare(strict_types=1);

namespace App\controllers;

use App\controllers\Controller;
use App\core\AuditLogger;
use App\core\Database;
use App\core\R2StorageHelper;
use App\core\Util;
use App\core\Validator;
use Exception;

class CommunicationController extends Controller {

    // Maximum file size (50 MB)
    private const MAX_FILE_SIZE = 52428800;

    // Valid ENUM values mirrored from the DB schema
    private const COMM_TYPES = [
        'MTOP', 'TRAVEL_ORDER', 'SB_RESOLUTION', 'SB_ORDINANCE',
        'APPLICATION_LEAVE', 'MEMO', 'NOTICE_HEARING', 'INVITATION',
        'ENDORSEMENT', 'DSSC', 'MADAC', 'DOE', 'SOLICITATION', 'TENT_REQUEST', 'OTHER',
    ];

    private const STATUSES = ['RECEIVED', 'FOR_SIGNING', 'SIGNED', 'RELEASED','PULLED_OUT'];

    // ─────────────────────────────────────────────
    // LIST (authenticated)
    // ─────────────────────────────────────────────

    public function index(): void {
        $this->checkPermission(['Admin', 'Staff']);
        $this->response(true, 'Records retrieved successfully', $this->buildList());
    }

    // LIST (public JSON — no auth)
    public function indexJSON(): void {
        $this->response(true, 'Records retrieved successfully', $this->buildList());
    }

    // ─────────────────────────────────────────────
    // SHOW
    // ─────────────────────────────────────────────

    public function show(?string $id = null): void {
        $this->checkPermission(['Admin', 'Staff']);

        if (!$id) $this->response(false, 'Communication ID is required', [], 400);

        $record = $this->getCommunication($id);
        if (empty($record)) $this->response(false, 'Communication not found', [], 404);

        $this->response(true, 'Record retrieved successfully', ['communication' => $record]);
    }

    // ─────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────

    public function create(): void {
        $this->checkPermission(['Admin', 'Staff']);

        // Support both application/json and multipart (FormData)
        $data = !empty($_POST) ? $_POST : $this->getJsonInput();

        $validator = new Validator();
        if (!$validator->validate($data, [
            'title'              => 'required|string|max:255',
            'communication_type' => 'required|in:' . implode(',', self::COMM_TYPES),
            'status'             => 'nullable|in:' . implode(',', self::STATUSES),
            'reference_no'       => 'nullable|string|max:100',
            'date_received'      => 'nullable|date',
        ])) {
            $this->response(false, $validator->getFirstError(), ['errors' => $validator->getErrors()], 422);
        }

        $uploadResult = $this->handleFileUpload();
        if (!$uploadResult['success']) {
            $uploadResult = [
                'success'   => false,
                'file_path' => null,       // R2 key (replaces local relative path)
                'file_size' => null,
            ];
        }

        $userID = $this->getAuthenticatedUser();
        $user   = Database::fetch('SELECT * FROM users WHERE user_id = ?', [$userID]);

        try {
            $id = Database::insert('communications', [
                'title'              => Validator::sanitize($data['title']),
                'communication_type' => $data['communication_type'],
                'status'             => $data['status']       ?? 'RECEIVED',
                'reference_no'       => $data['reference_no'] ?? null,
                'date_received'      => Util::normalizeValue($data['date_received'] ?? null),
                'date_logged'        => date('Y-m-d H:i:s'),
                'file_path'       => $uploadResult['file_path'],   // R2 key stored here
                'file_size'       => $uploadResult['file_size'],
                'created_by'         => $user['id'] ?? null,
                'updated_by'         => $user['id'] ?? null,
                'created_at'         => date('Y-m-d H:i:s'),
                'updated_at'         => date('Y-m-d H:i:s'),
            ]);

            $record = $this->getCommunication($id);

            AuditLogger::logCreate(
                'communications',
                $id,
                $record['title'],
                $record,
                "Created new communication: {$record['communication_type']} - {$record['title']}"
            );

            $this->response(true, 'Communication created successfully', ['communication' => $record], 201);

        } catch (Exception $e) {
            error_log('Communication creation error: ' . $e->getMessage());
            $this->response(false, 'Failed to create communication record', [], 500);
        }
    }

    // ─────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────

    public function update(?string $id = null): void {
        $this->checkPermission(['Admin', 'Staff']);

        if (!$id) $this->response(false, 'Communication ID is required', [], 400);

        $existing = $this->getCommunication($id);
        if (empty($existing)) $this->response(false, 'Communication not found', [], 404);

        // Support both application/json and multipart (FormData)
        $data = !empty($_POST) ? $_POST : $this->getJsonInput();

        $validator = new Validator();
        if (!$validator->validate($data, [
            'title'              => 'nullable|string|max:255',
            'communication_type' => 'nullable|in:' . implode(',', self::COMM_TYPES),
            'status'             => 'nullable|in:' . implode(',', self::STATUSES),
            'reference_no'       => 'nullable|string|max:100',
            'date_received'      => 'nullable|date',
        ])) {
            $this->response(false, $validator->getFirstError(), ['errors' => $validator->getErrors()], 422);
        }

        $allowedFields = ['title', 'communication_type', 'status', 'reference_no', 'date_received'];

        $uploadResult = $this->handleFileUpload();

        if (!empty($uploadResult['success'])) {
            $allowedFields = array_merge($allowedFields, ['file_path', 'file_size']);

            $data['file_path'] = $uploadResult['file_path'] ?? null;
            $data['file_size'] = $uploadResult['file_size'] ?? null;
        }

        $updateData    = [];
        $changes       = [];

        foreach ($allowedFields as $field) {
            if (!array_key_exists($field, $data)) continue;

            $incoming = Util::normalizeValue($data[$field]);
            if ($incoming === '') $incoming = null;

            if ($incoming !== $existing[$field]) {
                $updateData[$field] = ($field === 'document_id' && $incoming !== null)
                    ? (int)$incoming
                    : $incoming;
                $changes[$field] = ['from' => $existing[$field], 'to' => $incoming];
            }
        }

        if (empty($updateData)) {
            $this->response(false, 'No fields to update', [], 400);
        }

        $userID = $this->getAuthenticatedUser();
        $user   = Database::fetch('SELECT * FROM users WHERE user_id = ?', [$userID]);

        $updateData['updated_by'] = $user['id'] ?? null;
        $updateData['updated_at'] = date('Y-m-d H:i:s');

        if (isset($updateData['title'])) {
            $updateData['title'] = Validator::sanitize($updateData['title']);
        }

        try {
            $rowCount = Database::update('communications', $updateData, 'id = :id', ['id' => $id]);
            $record   = $this->getCommunication($id);

            if ($rowCount > 0 || !empty($changes)) {
                $oldValues = array_combine(array_keys($changes), array_column($changes, 'from'));
                $newValues = array_combine(array_keys($changes), array_column($changes, 'to'));

                AuditLogger::logUpdate(
                    'communications',
                    (int)$id,
                    $record['title'],
                    $oldValues,
                    $newValues,
                    "Updated communication: {$record['communication_type']} - {$record['title']}"
                );

                // Remove old file
                if (!empty($existing['file_path']) && $uploadResult['success']) {
                    R2StorageHelper::delete($existing['file_path']);
                }

                $this->response(true, 'Communication updated successfully', ['communication' => $record]);
            } else {
                $this->response(false, 'No changes made to communication record', [], 304);
            }

        } catch (Exception $e) {
            error_log('Communication update error: ' . $e->getMessage());
            $this->response(false, 'Failed to update communication', [], 500);
        }
    }

    // ─────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────

    public function delete(?string $id = null): void {
        $this->checkPermission(['Admin']);

        if (!$id) $this->response(false, 'Communication ID is required', [], 400);

        $record = $this->getCommunication($id);
        if (empty($record)) $this->response(false, 'Communication not found', [], 404);

        // Delete file from R2
        if (!empty($record['file_path'])) {
            R2StorageHelper::delete($record['file_path']);
        }

        try {
            $stmt     = Database::query("DELETE FROM communications WHERE id = ?", [$id]);
            $rowCount = $stmt->rowCount();

            if ($rowCount > 0) {
                AuditLogger::logDelete(
                    'communications',
                    (int)$id,
                    $record['title'],
                    $record,
                    "Deleted communication: {$record['communication_type']} - {$record['title']}"
                );

                $this->response(true, 'Communication deleted successfully');
            } else {
                $this->response(false, 'Communication not found', [], 404);
            }
        } catch (Exception $e) {
            error_log('Communication deletion error: ' . $e->getMessage());
            if (str_contains($e->getMessage(), '1451')) {
                $this->response(false, 'Cannot delete this communication. It is linked to another record.', [], 409);
            } else {
                $this->response(false, 'Failed to delete communication', [], 500);
            }
        }
    }

    // ─────────────────────────────────────────────
    // FILTER OPTIONS (for dropdowns in the UI)
    // ─────────────────────────────────────────────

    public function filterOptions(): void {
        $this->checkPermission(['Admin', 'Staff']);

        $this->response(true, 'Filter options retrieved', [
            'communication_types' => self::COMM_TYPES,
            'statuses'            => self::STATUSES,
        ]);
    }

    // ─────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────

    // ─────────────────────────────────────────────
    // PUBLIC DOWNLOAD
    // ─────────────────────────────────────────────
    public function publicDownload(?string $id = null): void {
        if (!$id) {
            $this->response(false, 'Communicatioin ID is required', [], 400);
            exit;
        }

        $document = $this->getCommunication($id);
        if (empty($document)) {
            $this->response(false, 'Document not found', [], 404);
            exit;
        }

        if (empty($document['file_path'])) {
            $this->response(false, 'No file attached', [], 404);
            exit;
        }

        $fileBase = pathinfo($document['file_path'], PATHINFO_FILENAME);
        $fileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $fileBase) . '.pdf';

        AuditLogger::logAccess(
            'Document Downloads',
            $id ? (int)$id : 0,
            ucfirst($document['communication_type']) . '#: ' . $document['file_name']
        );

        R2StorageHelper::streamToBrowser(
            $document['file_path'],
            $fileName,
            'application/pdf',
            true
        );
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
    
    private function buildList(): array {
        $page     = isset($_GET['page'])   ? max(1, (int)$_GET['page'])  : 1;
        $limit    = isset($_GET['limit'])  ? max(1, (int)$_GET['limit']) : 10;
        $search   = $_GET['search'] ?? null;
        $type     = $_GET['communication_type'] ?? null;
        $status   = $_GET['status'] ?? null;
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo   = $_GET['date_to'] ?? null;
        $offset   = ($page - 1) * $limit;

        $baseQuery = "FROM communications c
            LEFT JOIN users cu ON cu.id = c.created_by
            LEFT JOIN users uu ON uu.id = c.updated_by
            LEFT JOIN documents d ON d.id = c.document_id
            WHERE 1=1";

        $params = [];

        // ── FULLTEXT SEARCH ───────────────────────────────────────────────
        $scoreSelect = "0 AS score"; // default if no search

        if (!empty($search)) {
            $baseQuery .= " AND MATCH(c.title, c.reference_no) AGAINST(? IN BOOLEAN MODE)";
            $params[] = $search;

            $scoreSelect = "MATCH(c.title, c.reference_no) AGAINST(? IN BOOLEAN MODE) AS score";
            $params[] = $search; // second binding for SELECT
        }

        // ── Filters ───────────────────────────────────────────────────────
        if ($type && in_array($type, self::COMM_TYPES, true)) {
            $baseQuery .= " AND c.communication_type = ?";
            $params[]   = $type;
        }

        if ($status && in_array($status, self::STATUSES, true)) {
            $baseQuery .= " AND c.status = ?";
            $params[]   = $status;
        }

        // ── Date range ────────────────────────────────────────────────────
        if ($dateFrom && $dateTo) {
            $baseQuery .= " AND c.date_received BETWEEN ? AND ?";
            $params[]   = $dateFrom;
            $params[]   = $dateTo;
        } elseif ($dateFrom) {
            $baseQuery .= " AND c.date_received >= ?";
            $params[]   = $dateFrom;
        } elseif ($dateTo) {
            $baseQuery .= " AND c.date_received <= ?";
            $params[]   = $dateTo;
        }

        // ── Total count ───────────────────────────────────────────────────
        $total = (int) Database::fetch(
            "SELECT COUNT(*) AS cnt " . $baseQuery,
            array_slice($params, 0, !empty($search) ? count($params) - 1 : count($params)) // remove duplicate search param
        )['cnt'];

        // ── Main query ────────────────────────────────────────────────────
        $query = "SELECT
                c.id,
                c.title,
                c.communication_type,
                c.status,
                c.reference_no,
                c.date_received,
                c.date_logged,
                c.document_id,
                d.file_name  AS document_file_name,
                d.file_path  AS document_file_path,
                c.created_by,
                cu.name      AS created_by_name,
                c.updated_by,
                uu.name      AS updated_by_name,
                c.created_at,
                c.updated_at,
                {$scoreSelect}
            " . $baseQuery;

        // ── Sorting ───────────────────────────────────────────────────────
        if (!empty($search)) {
            $query .= " ORDER BY score DESC, c.date_received DESC, c.id DESC";
        } else {
            $query .= " ORDER BY c.date_received DESC, c.id DESC";
        }

        $query .= " LIMIT ? OFFSET ?";

        $params[] = $limit;
        $params[] = $offset;

        $records = Database::fetchAll($query, $params);

        return [
            'communications' => $records,
            'pagination' => [
                'current_page' => $page,
                'per_page'     => $limit,
                'total'        => $total,
                'total_pages'  => (int) ceil($total / $limit),
            ],
        ];
    }

    private function getCommunication(int|string $id): array {
        $record = Database::fetch("
            SELECT
                c.id,
                c.title,
                c.communication_type,
                c.status,
                c.reference_no,
                c.date_received,
                c.date_logged,
                c.document_id,
                d.file_name  AS document_file_name,
                d.file_path  AS document_file_path,
                c.created_by,
                cu.name      AS created_by_name,
                c.updated_by,
                uu.name      AS updated_by_name,
                c.created_at,
                c.updated_at
            FROM communications c
            LEFT JOIN users cu ON cu.id = c.created_by
            LEFT JOIN users uu ON uu.id = c.updated_by
            LEFT JOIN documents d  ON d.id  = c.document_id
            WHERE c.id = ?
            LIMIT 1
        ", [$id]);

        return $record ?? [];
    }
}
