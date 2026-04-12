<?php
declare(strict_types=1);

namespace App\controllers;

use App\controllers\Controller;
use App\core\AuditLogger;
use App\core\Auth;
use App\core\Database;
use App\core\R2StorageHelper;
use App\core\Util;
use App\core\Validator;
use Exception;

class DocumentController extends Controller {

    // Maximum file size (50 MB)
    private const MAX_FILE_SIZE = 52428800;

    // ─────────────────────────────────────────────
    // LIST
    // ─────────────────────────────────────────────

    public function index(): void {

        $this->checkPermission(['Admin', 'Member', 'Staff', 'Uploader', 'Tracker']);

        $page       = isset($_GET['page'])   ? (int)$_GET['page']  : 1;
        $limit      = isset($_GET['limit'])  ? (int)$_GET['limit'] : 10;
        $search     = $_GET['search']        ?? null;
        $docType    = $_GET['document_type'] ?? null;
        $visibility = $_GET['visibility']    ?? null;
        $dateFrom   = $_GET['date_from']     ?? null;
        $dateTo     = $_GET['date_to']       ?? null;
        $offset     = ($page - 1) * $limit;

        $forum_id_for_attachments = isset($_GET['forum_id_for_attachments'])
            ? (int)$_GET['forum_id_for_attachments']
            : 0;

        $agenda_id_for_attachments = isset($_GET['agenda_id_for_attachments'])
            ? (int)$_GET['agenda_id_for_attachments']
            : 0;

        $session_id_for_attachments = isset($_GET['session_id_for_attachments'])
            ? (int)$_GET['session_id_for_attachments']
            : 0;

        $baseQuery = "FROM documents WHERE 1=1";
        $params    = [];

        if ($search) {
            $keywords = preg_split('/[\s,]+/', trim($search), -1, PREG_SPLIT_NO_EMPTY);
            if (!empty($keywords)) {
                $searchConditions = [];
                foreach ($keywords as $keyword) {
                    $searchConditions[] = "(document_number LIKE ? OR title LIKE ? OR content LIKE ?)";
                    $params[] = "%{$keyword}%";
                    $params[] = "%{$keyword}%";
                    $params[] = "%{$keyword}%";
                }
                $baseQuery .= " AND (" . implode(" AND ", $searchConditions) . ")";
            }
        }

        if ($docType) {
            $baseQuery .= " AND document_type = ?";
            $params[]   = $docType;
        }

        if ($visibility) {
            $baseQuery .= " AND visibility = ?";
            $params[]   = $visibility;
        }

        if ($dateFrom && $dateTo) {
            $baseQuery .= " AND document_date BETWEEN ? AND ?";
            $params[]   = $dateFrom;
            $params[]   = $dateTo;
        } elseif ($dateFrom) {
            $baseQuery .= " AND document_date >= ?";
            $params[]   = $dateFrom;
        } elseif ($dateTo) {
            $baseQuery .= " AND document_date <= ?";
            $params[]   = $dateTo;
        }

        if ($forum_id_for_attachments > 0) {
            $baseQuery .= " AND id NOT IN(SELECT document_id FROM forum_documents WHERE forum_id = ?)";
            $params[]   = $forum_id_for_attachments;
        }

        if ($agenda_id_for_attachments > 0) {
            $baseQuery .= " AND id NOT IN(SELECT document_id FROM agenda_documents WHERE agenda_id = ?)";
            $params[]   = $agenda_id_for_attachments;
        }

        if ($session_id_for_attachments > 0) {
            $baseQuery .= " AND id NOT IN(SELECT document_id FROM session_documents WHERE session_id = ?)";
            $params[]   = $session_id_for_attachments;
        }

        $totalResult = Database::fetch("SELECT COUNT(*) as cnt " . $baseQuery, $params);
        $total       = $totalResult['cnt'];

        $query  = "SELECT id, document_number, title, file_path, file_size, visibility,
                          document_type, is_published, sort, document_date, created_at, updated_at
                   " . $baseQuery . "
                   ORDER BY sort ASC, document_number ASC, created_at DESC
                   LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        $documents = Database::fetchAll($query, $params);

        $this->response(true, 'Documents retrieved successfully', [
            'documents'  => $documents,
            'pagination' => [
                'current_page' => $page,
                'per_page'     => $limit,
                'total'        => $total,
                'total_pages'  => (int) ceil($total / $limit),
            ],
        ]);
    }

    // ─────────────────────────────────────────────
    // SHOW
    // ─────────────────────────────────────────────

    public function show(?string $id = null): void {
        $this->checkPermission(['Admin', 'Member', 'Staff', 'Uploader', 'Tracker']);

        if (!$id) {
            $this->response(false, 'Document ID is required', [], 400);
        }

        $document = $this->getDocument($id);
        if (empty($document)) {
            $this->response(false, 'Document not found', [], 404);
        }

        $this->response(true, 'Document retrieved successfully', ['document' => $document]);
    }

    // ─────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────

    public function create(): void {
        $this->checkPermission(['Admin', 'Staff', 'Uploader']);

        $data = $_POST;

        $validator = new Validator();
        if (!$validator->validate($data, [
            'title'         => 'required|string',
            'document_type' => 'required|in:agenda,session,minutes,ordinance,resolution,report,forum,attachment',
            'visibility'    => 'nullable|in:public,private,internal',
            'document_date' => 'nullable|date',
        ])) {
            $this->response(false, $validator->getFirstError(), [
                'errors' => $validator->getErrors()
            ], 422);
        }

        $uploadResult = $this->handleFileUpload();
        if (!$uploadResult['success']) {
            $this->response(false, $uploadResult['message'], [], 422);
        }

        $userID = $this->getAuthenticatedUser();
        $user   = Database::fetch('SELECT * FROM users WHERE user_id = ?', [$userID]);

        $metadata = [
            'uploaded_by' => $user['user_id'],
            'uploaded_at' => date('Y-m-d H:i:s'),
        ];

        try {
            $documentData = [
                'document_number' => $data['document_number'] ?? null,
                'title'           => Validator::sanitize($data['title']),
                'content'         => $data['content'] ?? null,
                'file_path'       => $uploadResult['file_path'],   // R2 key stored here
                'file_size'       => $uploadResult['file_size'],
                'visibility'      => $data['visibility'] ?? 'public',
                'document_type'   => $data['document_type'],
                'metadata'        => json_encode($metadata),
                'is_published'    => isset($data['is_published']) ? (int)$data['is_published'] : 1,
                'sort'            => isset($data['sort']) ? (int)$data['sort'] : 0,
                'document_date'   => Util::normalizeValue($data['document_date']),
                'created_at'      => date('Y-m-d H:i:s'),
            ];

            $id       = Database::insert('documents', $documentData);
            $document = $this->getDocument($id);

            AuditLogger::logCreate(
                'documents',
                $id,
                $document['document_number'],
                $document,
                "Uploaded new document: {$document['document_type']} - {$document['document_number']}"
            );

            $this->response(true, 'Document created successfully', [
                'document' => $document
            ], 201);

        } catch (Exception $e) {
            // Roll back the R2 upload if DB insert failed
            if (!empty($uploadResult['file_path'])) {
                R2StorageHelper::delete($uploadResult['file_path']);
            }

            error_log('Document creation error: ' . $e->getMessage());
            $this->response(false, 'Failed to create document', [], 500);
        }
    }

    // ─────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────

    public function update(?string $id = null): void {
        $this->checkPermission(['Admin', 'Staff', 'Uploader']);

        if (!$id) {
            $this->response(false, 'Document ID is required', [], 400);
        }

        $existing = $this->getDocument($id);
        $changes  = [];

        if (empty($existing)) {
            $this->response(false, 'Document not found', [], 404);
        }

        $data = $_POST;

        if (isset($data['document_type']) || isset($data['visibility'])) {
            $validator = new Validator();
            if (!$validator->validate($data, [
                'document_type' => 'nullable|in:agenda,session,minutes,ordinance,resolution,report,forum,attachment',
                'visibility'    => 'nullable|in:public,private,internal',
                'document_date' => 'nullable|date',
            ])) {
                $this->response(false, $validator->getFirstError(), [
                    'errors' => $validator->getErrors()
                ], 422);
            }
        }

        $updateData    = [];
        $allowedFields = [
            'document_number', 'title', 'content', 'visibility',
            'document_type', 'is_published', 'sort', 'document_date',
        ];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $updateData[$field] = in_array($field, ['is_published', 'sort'], true)
                    ? (int)$data[$field]
                    : Util::normalizeValue($data[$field]);

                $changes[$field] = [
                    'from' => $existing[$field],
                    'to'   => $data[$field],
                ];
            }
        }

        // Handle optional file replacement
        if (isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE) {
            $uploadResult = $this->handleFileUpload();
            if (!$uploadResult['success']) {
                $this->response(false, $uploadResult['message'], [], 422);
            }

            // Delete old file from R2
            if (!empty($existing['file_path'])) {
                R2StorageHelper::delete($existing['file_path']);
            }

            $updateData['file_path'] = $uploadResult['file_path'];
            $updateData['file_size'] = $uploadResult['file_size'];
        }

        // Merge metadata
        $existingMetadata = [];
        if (!empty($existing['metadata'])) {
            $existingMetadata = json_decode($existing['metadata'], true) ?? [];
        }

        $requestMetadata = [];
        if (!empty($data['metadata']) && is_array($data['metadata'])) {
            $requestMetadata = $data['metadata'];
        }

        $userID = $this->getAuthenticatedUser();
        $user   = Database::fetch('SELECT * FROM users WHERE user_id = ?', [$userID]);

        $systemMetadata = [
            'updated_by' => $user['user_id'],
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        $updateData['metadata']   = json_encode(array_merge($existingMetadata, $requestMetadata, $systemMetadata));
        $updateData['updated_at'] = date('Y-m-d H:i:s');

        if (empty($updateData)) {
            $this->response(false, 'No fields to update', [], 400);
        }

        try {
            $normalizeDate = fn($v) => (empty($v) || $v === '') ? null : $v;

            $sanitized                  = Validator::sanitizeArray($updateData);
            $sanitized['document_date'] = $normalizeDate($sanitized['document_date'] ?? null);

            $rowCount = Database::update('documents', $sanitized, 'id = :id', ['id' => $id]);
            $document = $this->getDocument($id);

            if ($rowCount > 0 || !empty($changes)) {
                $oldValues = [];
                $newValues = [];
                foreach ($changes as $field => $change) {
                    $oldValues[$field] = $change['from'];
                    $newValues[$field] = $change['to'];
                }

                AuditLogger::logUpdate(
                    'documents',
                    (int)$id,
                    $document['document_number'],
                    $oldValues,
                    $newValues,
                    "Updated document: {$document['document_type']} - {$document['document_number']}"
                );

                $this->response(true, 'Document updated successfully', ['document' => $document]);
            } else {
                $this->response(false, 'No changes made to document record', [], 304);
            }

        } catch (Exception $e) {
            error_log('Document update error: ' . $e->getMessage());
            $this->response(false, 'Failed to update document', [], 500);
        }
    }

    // ─────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────

    public function delete(?string $id = null): void {
        $this->checkPermission(['Admin']);

        if (!$id) {
            $this->response(false, 'Document ID is required', [], 400);
        }

        $document = $this->getDocument($id);
        if (empty($document)) {
            $this->response(false, 'Document not found', [], 404);
        }

        try {
            // Delete file from R2
            if (!empty($document['file_path'])) {
                R2StorageHelper::delete($document['file_path']);
            }

            $stmt     = Database::query("DELETE FROM documents WHERE id = ?", [$id]);
            $rowCount = $stmt->rowCount();

            $docNum = isset($document['document_number']) ? $document['document_number'] : 'Unknown Document';
            $docType = isset($document['document_type']) ? $document['document_type'] : 'Unknown Type';

            if ($rowCount > 0) {
                AuditLogger::logDelete(
                    'documents',
                    (int)$id,
                    $docNum,
                    $document,
                    "Deleted document: {$docType} - {$docNum}"
                );

                $this->response(true, 'Document deleted successfully');
            } else {
                $this->response(false, 'Document not found', [], 404);
            }
        } catch (Exception $e) {
            error_log('Document deletion error: ' . $e->getMessage());
            if (str_contains($e->getMessage(), '1451')) {
                $this->response(false, 'Cannot delete this document. It is linked to another record.', [], 500);
            } else {
                $this->response(false, 'Failed to delete document', [], 500);
            }
        }
    }

    // ─────────────────────────────────────────────
    // DOWNLOAD (authenticated + token)
    // ─────────────────────────────────────────────
    public function download(?string $id = null): void
    {
        if (!$id) {
            $this->response(false, 'Document ID is required', [], 400);
            return;
        }

        $document = $this->getDocument($id);
        if (empty($document)) {
            $this->response(false, 'Document not found', [], 404);
            return;
        }

        // Short-lived download token (iOS / direct navigation)
        $queryToken = $_GET['_token'] ?? null;
        if ($queryToken) {
            if (!Auth::verifyDownloadToken($queryToken, (int)$id)) {
                $this->response(false, 'Invalid or expired download token', [], 401);
                return;
            }
        } else {
            if ($document['visibility'] === 'private') {
                $this->checkPermission(['Admin', 'Member', 'Staff', 'Uploader', 'Tracker']);
            } elseif ($document['visibility'] === 'internal') {
                $this->checkPermission(['Admin']);
            }
        }

        if (empty($document['file_path'])) {
            $this->response(false, 'No file attached to this document', [], 404);
            return;
        }

        AuditLogger::logAccess(
            'Document Downloads',
            (int)$id,
            ucfirst($document['document_type']) . '#: ' . $document['document_number']
        );

        // ✅ Redirect to R2 presigned URL — no proxying
        R2StorageHelper::redirectToPresigned($document['file_path'], ttl: 300);
    }

    // public function download(?string $id = null): void {
    //     if (!$id) {
    //         $this->response(false, 'Document ID is required', [], 400);
    //         exit;
    //     }

    //     $document = $this->getDocument($id);
    //     if (empty($document)) {
    //         $this->response(false, 'Document not found', [], 404);
    //         exit;
    //     }

    //     // Short-lived download token (for iOS / direct navigation)
    //     $queryToken = $_GET['_token'] ?? null;
    //     if ($queryToken) {
    //         $payload = Auth::verifyDownloadToken($queryToken, (int)$id);
    //         if (!$payload) {
    //             $this->response(false, 'Invalid or expired download token', [], 401);
    //             exit;
    //         }
    //     } else {
    //         if ($document['visibility'] === 'private') {
    //             $this->checkPermission(['Admin', 'Member', 'Staff', 'Uploader', 'Tracker']);
    //         } elseif ($document['visibility'] === 'internal') {
    //             $this->checkPermission(['Admin']);
    //         }
    //     }

    //     if (empty($document['file_path'])) {
    //         $this->response(false, 'No file attached to this document', [], 404);
    //         exit;
    //     }

    //     $fileBase = $document['document_number']
    //         ?: pathinfo($document['file_path'], PATHINFO_FILENAME);
    //     $fileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $fileBase) . '.pdf';

    //     AuditLogger::logAccess(
    //         'Document Downloads',
    //         $id ? (int)$id : 0,
    //         ucfirst($document['document_type']) . '#: ' . $document['document_number']
    //     );

    //     // Stream directly from R2 to browser
    //     R2StorageHelper::streamToBrowser(
    //         $document['file_path'],
    //         $fileName,
    //         'application/pdf',
    //         true   // inline
    //     );
    // }

    // ─────────────────────────────────────────────
    // DOWNLOAD TOKEN
    // ─────────────────────────────────────────────

    public function getDownloadToken(?string $id = null): void {
        if (!$id) {
            $this->response(false, 'Document ID is required', [], 400);
            exit;
        }

        $document = $this->getDocument($id);
        if (empty($document)) {
            $this->response(false, 'Document not found', [], 404);
            exit;
        }

        if (empty($document['file_path'])) {
            $this->response(false, 'No file attached', [], 404);
            exit;
        }

        if ($document['visibility'] === 'private') {
            $this->checkPermission(['Admin', 'Member', 'Staff', 'Uploader', 'Tracker']);
        } elseif ($document['visibility'] === 'internal') {
            $this->checkPermission(['Admin']);
        }

        $token = Auth::generateDownloadToken((int)$id);
        $this->response(true, 'Token generated', ['token' => $token, 'expires_in' => 300]);
    }

    // ─────────────────────────────────────────────
    // PUBLIC DOWNLOAD
    // ─────────────────────────────────────────────

    public function publicDownload(?string $id = null): void {
        if (!$id) {
            $this->response(false, 'Document ID is required', [], 400);
            exit;
        }

        $document = $this->getDocument($id);
        if (empty($document)) {
            $this->response(false, 'Document not found', [], 404);
            exit;
        }

        if (empty($document['file_path'])) {
            $this->response(false, 'No file attached', [], 404);
            exit;
        }

        if ($document['visibility'] !== 'public') {
            $this->response(false, 'This document is not publicly accessible. Please contact the SB team.', [], 422);
            exit;
        }

        $fileBase = $document['document_number']
            ?: pathinfo($document['file_path'], PATHINFO_FILENAME);
        $fileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $fileBase) . '.pdf';

        AuditLogger::logAccess(
            'Document Downloads',
            $id ? (int)$id : 0,
            ucfirst($document['document_type']) . '#: ' . $document['document_number']
        );

        R2StorageHelper::streamToBrowser(
            $document['file_path'],
            $fileName,
            'application/pdf',
            true
        );
    }

    // ─────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────

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

    private function getDocument($id): array {
        $document = Database::fetch("
            SELECT id, document_number, title, file_path, file_size,
                   visibility, document_type, is_published, sort,
                   document_date, created_at, updated_at
            FROM documents WHERE id = ?
        ", [$id]);

        return $document ?? [];
    }
}