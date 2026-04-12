<?php
declare(strict_types=1);

namespace App\core;

use PDO;
use PDOException;
use Exception;
use PDOStatement;

class Database
{
    private static ?PDO $instance = null;

    private function __construct() {}

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $host    = DB_HOST ?: '127.0.0.1';
            $port    = DB_PORT ?: '3306';
            $name    = DB_NAME ?: '';
            $charset = DB_CHARSET ?: 'utf8mb4';
            $user    = DB_USER ?: '';
            $pass    = DB_PASS ?: '';
            $ssl     = DB_SSL ?: 'false';

            if ($user === '' || $name === '') {
                error_log("DB ENV DEBUG → HOST=$host USER=$user NAME=$name");
                throw new Exception('Database credentials are missing. Check Render environment variables.');
            }

            $dsn = "mysql:host={$host};port={$port};dbname={$name};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_PERSISTENT         => false,
            ];

            // ─────────────────────────────────────────────
            // SSL (Required for Aiven)
            // ─────────────────────────────────────────────
            if (filter_var($ssl, FILTER_VALIDATE_BOOLEAN)) {
                $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
            }

            try {
                self::$instance = new PDO($dsn, (string)$user, (string)$pass, $options);
            } catch (PDOException $e) {
                error_log("PDO ERROR: " . $e->getMessage());
                throw new Exception('Database connection failed.');
            }
        }

        return self::$instance;
    }

    public static function query(string $sql, array $params = []): PDOStatement
    {
        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function fetch(string $sql, array $params = []): ?array
    {
        $result = self::query($sql, $params)->fetch();
        return $result ?: null;
    }

    public static function fetchAll(string $sql, array $params = []): array
    {
        return self::query($sql, $params)->fetchAll();
    }

    public static function insert(string $table, array $data): int
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));

        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        self::query($sql, $data);

        return (int) self::getInstance()->lastInsertId();
    }

    public static function update(string $table, array $data, string $where, array $whereParams = []): int
    {
        $set = [];
        foreach (array_keys($data) as $column) {
            $set[] = "{$column} = :{$column}";
        }

        $sql = "UPDATE {$table} SET " . implode(', ', $set) . " WHERE {$where}";
        $stmt = self::query($sql, array_merge($data, $whereParams));

        return $stmt->rowCount();
    }

    public static function disconnect(): void
    {
        self::$instance = null;
    }
}