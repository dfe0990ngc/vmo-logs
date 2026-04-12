<?php
// core/Validator.php
declare(strict_types=1);

namespace App\core;

use Exception;

class Util{
    public static function normalizeDate($value){
        return (empty($value) || $value === '') ? null : $value;
    }

    public static function normalizeValue($value) {
        return (empty($value) || $value === '' || $value === 0) ? null : $value;
    }

    public static function memberFullName($id = null){
        if(!$id){
            return ['full_name' => ''];
        }

        $member = Database::fetch("
            SELECT
                m.*,
                CONCAT_WS(' ',IF(LENGTH(m.prefix) > 0,CONCAT(m.prefix,'.'),''),m.first_name,IF(LENGTH(m.middle_name) > 0,CONCAT(LEFT(m.middle_name,1),'.'),''),IF(LENGTH(m.suffix) > 0,CONCAT(m.last_name,','),m.last_name),m.suffix) as full_name
            FROM members m WHERE m.id = ?
        ",[$id]);

        return $member;
    }

    public static function document($id = null){
        if(!$id){
            return ['document_number' => '','title' => ''];
        }

        $doc = Database::fetch("SELECT d.* FROM documents d WHERE d.id = ?",[$id]);

        return $doc;
    }

    public static function term($id = null){
        if(!$id){
            return ['label' => ''];
        }

        $term = Database::fetch("SELECT t.* FROM terms t WHERE t.id = ?",[$id]);

        return $term;
    }
    
    /**
     * Helper method to serve image with proper headers
     */
    public static function serveImage(string $imagePath): void {

        // 1. Check if file exists first
        if (!file_exists($imagePath)) {
            http_response_code(204); // No Content
            exit;
        }

        $imageInfo = getimagesize($imagePath);

        // 2. Check if it's a valid image
        if ($imageInfo === false) {
            http_response_code(204); // No Content
            exit;
        }

        $mimeType = $imageInfo['mime'];
        $fileSize = filesize($imagePath);
        $lastModified = filemtime($imagePath);

        // Check if client has cached version
        $etag = md5_file($imagePath);
        $ifNoneMatch = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
        $ifModifiedSince = $_SERVER['HTTP_IF_MODIFIED_SINCE'] ?? '';

        // If client has valid cache, return 304 Not Modified
        if ($ifNoneMatch === $etag || strtotime($ifModifiedSince) === $lastModified) {
            http_response_code(304);
            exit;
        }

        // Clear any output buffers
        while (ob_get_level()) {
            ob_end_clean();
        }

        // Set headers
        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . $fileSize);
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastModified) . ' GMT');
        header('ETag: "' . $etag . '"');
        header('Cache-Control: public, max-age=31536000, immutable');
        header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');
        header('Content-Disposition: inline; filename="' . basename($imagePath) . '"');

        // Serve the file
        readfile($imagePath);
        exit;
    }

    // =========================================================================
    // BONUS: Send an email WITH a PDF attachment
    // =========================================================================

    /**
     * Example: send a document/report to a user via email with a PDF attached.
     *
     * Usage inside any controller:
     *
     *   $this->sendDocumentEmail(
     *       toEmail : 'john@example.com',
     *       toName  : 'John Doe',
     *       pdfPath : __DIR__ . '/../../storage/documents/report_2024.pdf'
     *   );
     */
    protected function sendDocumentEmail(
        string $toEmail,
        string $toName,
        string $pdfPath,
        string $displayName = '',
        string $template = '',
    ) {
        if($template == ''){
            return false;
        }

        try {
            $mailer = new Mailer();
            $sent = $mailer
                ->to($toEmail, $toName)
                ->subject('Your Document - ' . (APP_NAME  ?? 'App'))
                ->view($template, [
                    'appName'     => APP_NAME ?? 'App',
                    'userName'    => $toName,
                    'logoPath'    => __DIR__ . '/../storage/images/smart-sb.png',
                    'lguLogoPath' => __DIR__ . '/../storage/images/lgu.png',
                    'sbLogoPath'  => __DIR__ . '/../storage/images/sb.png',
                    'vmoLogoPath' => __DIR__ . '/../storage/images/vmo.jpg',
                ])
                // ↓ Attach a PDF (or any file)
                ->attach($pdfPath, $displayName ?: basename($pdfPath))
                ->send();

            return !!$sent;
        } catch (Exception $e) {
            error_log('Document email error: ' . $e->getMessage());
            return false;
        }
    }
}

