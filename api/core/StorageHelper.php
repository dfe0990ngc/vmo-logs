<?php
declare(strict_types=1);

namespace App\core;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;
use Exception;

class StorageHelper
{
    private static ?S3Client $client = null;
    private static string $bucket = '';
    private static ?string $publicBaseUrl = null;
    private static string $driver = 's3';

    private static function client(): S3Client
    {
        if (self::$client !== null) {
            return self::$client;
        }

        self::$driver = self::cfg('STORAGE_DRIVER', 's3');

        $endpoint = self::cfg('STORAGE_ENDPOINT', self::cfg('R2_ENDPOINT', ''));
        $accessKey = self::cfg('STORAGE_ACCESS_KEY', self::cfg('R2_ACCESS_KEY', ''));
        $secretKey = self::cfg('STORAGE_SECRET_KEY', self::cfg('R2_SECRET_KEY', ''));
        self::$bucket = self::cfg('STORAGE_BUCKET', self::cfg('R2_BUCKET', ''));
        self::$publicBaseUrl = self::normalizeUrl(
            self::cfg('STORAGE_PUBLIC_URL', self::cfg('R2_PUBLIC_URL', ''))
        );

        $region = self::cfg('STORAGE_REGION', self::$driver === 'r2' ? 'auto' : 'us-east-1');
        $usePathStyle = self::toBool(self::cfg('STORAGE_USE_PATH_STYLE', 'true'));

        if (!$endpoint || !$accessKey || !$secretKey || !self::$bucket) {
            throw new Exception(
                'Storage configuration is incomplete. ' .
                'Set STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, and STORAGE_BUCKET.'
            );
        }

        self::$client = new S3Client([
            'version'                 => 'latest',
            'region'                  => $region,
            'endpoint'                => $endpoint,
            'credentials'             => [
                'key'    => $accessKey,
                'secret' => $secretKey,
            ],
            'use_path_style_endpoint' => $usePathStyle,
        ]);

        return self::$client;
    }

    private static function cfg(string $key, mixed $default = null): mixed
    {
        if (defined($key)) {
            return constant($key);
        }

        $env = getenv($key);
        if ($env !== false) {
            return $env;
        }

        return $default;
    }

    private static function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return in_array(strtolower((string) $value), ['1', 'true', 'yes', 'on'], true);
    }

    private static function normalizeUrl(?string $url): ?string
    {
        if (!$url) {
            return null;
        }

        return rtrim($url, '/');
    }

    public static function upload(
        string $localPath,
        string $objectKey,
        string $contentType = 'application/pdf',
        string $acl = 'private'
    ): array {
        try {
            $params = [
                'Bucket'      => self::$bucket,
                'Key'         => $objectKey,
                'SourceFile'  => $localPath,
                'ContentType' => $contentType,
            ];

            if ($acl !== '') {
                $params['ACL'] = $acl;
            }

            self::client()->putObject($params);

            return [
                'success'   => true,
                'key'       => $objectKey,
                'file_path' => $objectKey,
                'url'       => self::publicUrl($objectKey),
                'message'   => 'File uploaded successfully',
            ];
        } catch (AwsException $e) {
            error_log('Storage upload error: ' . $e->getMessage());

            return [
                'success'   => false,
                'key'       => $objectKey,
                'file_path' => $objectKey,
                'url'       => null,
                'message'   => 'Upload failed: ' . ($e->getAwsErrorMessage() ?: $e->getMessage()),
            ];
        }
    }

    public static function uploadContent(
        string $content,
        string $objectKey,
        string $contentType = 'application/pdf',
        string $acl = 'private'
    ): array {
        try {
            $params = [
                'Bucket'      => self::$bucket,
                'Key'         => $objectKey,
                'Body'        => $content,
                'ContentType' => $contentType,
            ];

            if ($acl !== '') {
                $params['ACL'] = $acl;
            }

            self::client()->putObject($params);

            return [
                'success'   => true,
                'key'       => $objectKey,
                'file_path' => $objectKey,
                'url'       => self::publicUrl($objectKey),
                'message'   => 'Content uploaded successfully',
            ];
        } catch (AwsException $e) {
            error_log('Storage uploadContent error: ' . $e->getMessage());

            return [
                'success'   => false,
                'key'       => $objectKey,
                'file_path' => $objectKey,
                'url'       => null,
                'message'   => 'Upload failed: ' . ($e->getAwsErrorMessage() ?: $e->getMessage()),
            ];
        }
    }

    public static function uploadFromRequest(
        array $fileEntry,
        string $folder = 'documents',
        array $allowedMime = ['application/pdf'],
        int $maxBytes = 10485760
    ): array {
        if (($fileEntry['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $errors = [
                UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit',
                UPLOAD_ERR_FORM_SIZE  => 'File exceeds form upload limit',
                UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION  => 'Upload stopped by PHP extension',
            ];

            return [
                'success'   => false,
                'key'       => '',
                'file_path' => '',
                'file_size' => 0,
                'url'       => null,
                'message'   => $errors[$fileEntry['error']] ?? 'Unknown upload error',
            ];
        }

        if (($fileEntry['size'] ?? 0) > $maxBytes) {
            return [
                'success'   => false,
                'key'       => '',
                'file_path' => '',
                'file_size' => 0,
                'url'       => null,
                'message'   => 'File size exceeds the maximum allowed size',
            ];
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $fileEntry['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedMime, true)) {
            return [
                'success'   => false,
                'key'       => '',
                'file_path' => '',
                'file_size' => 0,
                'url'       => null,
                'message'   => 'Invalid file type: ' . $mimeType,
            ];
        }

        $ext = strtolower(pathinfo($fileEntry['name'], PATHINFO_EXTENSION));
        $ext = $ext !== '' ? $ext : 'bin';

        // same key logic as your current R2 helper
        $objectKey = trim($folder, '/') . '/' . uniqid('doc_', true) . '_' . time() . '.' . $ext;

        $result = self::upload($fileEntry['tmp_name'], $objectKey, $mimeType);

        return array_merge($result, [
            'file_size'     => (int) $fileEntry['size'],
            'original_name' => $fileEntry['name'] ?? null,
            'mime_type'     => $mimeType,
        ]);
    }

    public static function streamToBrowser(
        string $objectKey,
        string $fileName,
        string $contentType = 'application/pdf',
        bool $inline = true
    ): void {
        try {
            $result = self::client()->getObject([
                'Bucket' => self::$bucket,
                'Key'    => $objectKey,
            ]);

            $disposition = $inline ? 'inline' : 'attachment';
            $safeName = preg_replace('/[^a-zA-Z0-9_\-.]/', '_', $fileName);

            header('Content-Type: ' . $contentType);
            header("Content-Disposition: {$disposition}; filename=\"{$safeName}\"");
            header('Content-Length: ' . ($result['ContentLength'] ?? 0));
            header('Cache-Control: no-store');
            header('Pragma: public');

            if (ob_get_level()) {
                ob_end_clean();
            }

            $body = $result['Body'];
            while (!$body->eof()) {
                echo $body->read(65536);
                flush();
            }
        } catch (AwsException $e) {
            error_log('Storage streamToBrowser error: ' . $e->getMessage());
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'File not found in storage']);
        }

        exit;
    }

    public static function presignedUrl(string $objectKey, int $seconds = 300): ?string
    {
        try {
            $cmd = self::client()->getCommand('GetObject', [
                'Bucket' => self::$bucket,
                'Key'    => $objectKey,
            ]);

            return (string) self::client()
                ->createPresignedRequest($cmd, "+{$seconds} seconds")
                ->getUri();
        } catch (AwsException $e) {
            error_log('Storage presignedUrl error: ' . $e->getMessage());
            return null;
        }
    }

    public static function redirectToPresigned(string $objectKey, int $ttl = 300): never
    {
        $url = self::presignedUrl($objectKey, $ttl);

        if (!$url) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'File not found']);
            exit;
        }

        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('Location: ' . $url, true, 302);
        exit;
    }

    public static function delete(string $objectKey): bool
    {
        if ($objectKey === '') {
            return false;
        }

        try {
            self::client()->deleteObject([
                'Bucket' => self::$bucket,
                'Key'    => $objectKey,
            ]);
            return true;
        } catch (AwsException $e) {
            error_log('Storage delete error: ' . $e->getMessage());
            return false;
        }
    }

    public static function deleteBatch(array $objectKeys): bool
    {
        if (empty($objectKeys)) {
            return true;
        }

        $objects = array_map(
            static fn(string $key): array => ['Key' => $key],
            $objectKeys
        );

        try {
            self::client()->deleteObjects([
                'Bucket' => self::$bucket,
                'Delete' => ['Objects' => $objects],
            ]);
            return true;
        } catch (AwsException $e) {
            error_log('Storage deleteBatch error: ' . $e->getMessage());
            return false;
        }
    }

    public static function exists(string $objectKey): bool
    {
        try {
            self::client()->headObject([
                'Bucket' => self::$bucket,
                'Key'    => $objectKey,
            ]);
            return true;
        } catch (AwsException $e) {
            return false;
        }
    }

    public static function publicUrl(string $objectKey): ?string
    {
        if (!self::$publicBaseUrl) {
            return null;
        }

        return self::$publicBaseUrl . '/' . ltrim($objectKey, '/');
    }
}