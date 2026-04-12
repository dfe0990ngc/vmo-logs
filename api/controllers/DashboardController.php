<?php
declare(strict_types=1);

namespace App\controllers;

use App\core\Database;

class DashboardController extends Controller
{
    /* =====================================================
     *  ENTRY POINT
     * ===================================================== */

    public function index(): void
    {
        $this->checkPermission(['Admin', 'Staff']);

        $year     = $_GET['year']   ?? 'all';
        $month    = (int)($_GET['month']  ?? 0);
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo   = $_GET['date_to']   ?? null;

        $this->response(true, 'Dashboard data retrieved successfully', [
            'stats'                => $this->stats($year, $month, $dateFrom, $dateTo),
            'trends'               => $this->trends($year),
            'type_distribution'    => $this->typeDistribution($year, $month, $dateFrom, $dateTo),
            'status_distribution'  => $this->statusDistribution($year, $month, $dateFrom, $dateTo),
            'recent_activities'    => $this->recentActivities(),
        ]);
    }

    /* =====================================================
     *  ENTRY POINT: Welcome / Public Stats
     * ===================================================== */

    public function welcomeStats(): void
    {
        $this->response(true, 'Welcome stats data retrieved successfully',
            $this->stats('all', 0, null, null)
        );
    }

    /* =====================================================
     *  CORE FILTER HELPER
     * ===================================================== */

    /**
     * Returns [$whereSql, $params] to append to a base query on `communications`.
     * Alias is the table alias (default 'c').
     */
    private function filters(
        string  $year,
        int     $month,
        ?string $dateFrom,
        ?string $dateTo,
        string  $alias = 'c'
    ): array {
        $sql    = '';
        $params = [];
        $p      = $alias ? "{$alias}." : '';

        if ($year !== 'all') {
            $sql     .= " AND YEAR({$p}date_received) = ?";
            $params[] = $year;
        }

        if ($month > 0) {
            $sql     .= " AND MONTH({$p}date_received) = ?";
            $params[] = $month;
        }

        if ($dateFrom && $dateTo) {
            $sql     .= " AND {$p}date_received BETWEEN ? AND ?";
            $params[] = $dateFrom;
            $params[] = $dateTo;
        } elseif ($dateFrom) {
            $sql     .= " AND {$p}date_received >= ?";
            $params[] = $dateFrom;
        } elseif ($dateTo) {
            $sql     .= " AND {$p}date_received <= ?";
            $params[] = $dateTo;
        }

        return [$sql, $params];
    }

    private function count(
        string  $year,
        int     $month,
        ?string $dateFrom,
        ?string $dateTo,
        string  $extra = ''
    ): int {
        [$where, $params] = $this->filters($year, $month, $dateFrom, $dateTo);
        $sql = "SELECT COUNT(*) cnt FROM communications c WHERE 1=1 {$extra} {$where}";
        return (int) Database::fetch($sql, $params)['cnt'];
    }

    private function metric(int $current, int $previous): array
    {
        return [
            'value'  => $current,
            'change' => $previous === 0
                ? ($current > 0 ? 100 : 0)
                : (int) round((($current - $previous) / $previous) * 100),
            'trend'  => $current > $previous ? 'up' : ($current < $previous ? 'down' : 'stable'),
        ];
    }

    private function previousPeriod(string $year, int $month): array
    {
        if ($month > 1)  return [$year, $month - 1];
        if ($month === 1) return [(string)((int)$year - 1), 12];
        return [(string)((int)$year - 1), 0];
    }

    /* =====================================================
     *  STATS CARDS
     * ===================================================== */

    private function stats(string $year, int $month, ?string $dateFrom, ?string $dateTo): array
    {
        [$py, $pm] = $this->previousPeriod($year, $month);

        $current = [
            'total'       => $this->count($year, $month, $dateFrom, $dateTo),
            'received'    => $this->count($year, $month, $dateFrom, $dateTo, "AND c.status = 'RECEIVED'"),
            'for_signing' => $this->count($year, $month, $dateFrom, $dateTo, "AND c.status = 'FOR_SIGNING'"),
            'signed'      => $this->count($year, $month, $dateFrom, $dateTo, "AND c.status = 'SIGNED'"),
            'released'    => $this->count($year, $month, $dateFrom, $dateTo, "AND c.status = 'RELEASED'"),
        ];

        $previous = [
            'total'       => $this->count($py, $pm, null, null),
            'received'    => $this->count($py, $pm, null, null, "AND c.status = 'RECEIVED'"),
            'for_signing' => $this->count($py, $pm, null, null, "AND c.status = 'FOR_SIGNING'"),
            'signed'      => $this->count($py, $pm, null, null, "AND c.status = 'SIGNED'"),
            'released'    => $this->count($py, $pm, null, null, "AND c.status = 'RELEASED'"),
        ];

        $totalUsers = (int) Database::fetch("SELECT COUNT(*) cnt FROM users")['cnt'];
        $totalDocs  = (int) Database::fetch("SELECT COUNT(*) cnt FROM communications WHERE file_path IS NOT NULL")['cnt'];

        return [
            'total_communications' => $this->metric($current['total'],       $previous['total']),
            'received'             => $this->metric($current['received'],    $previous['received']),
            'for_signing'          => $this->metric($current['for_signing'], $previous['for_signing']),
            'signed'               => $this->metric($current['signed'],      $previous['signed']),
            'released'             => $this->metric($current['released'],    $previous['released']),
            'total_users'          => ['value' => $totalUsers, 'change' => 0, 'trend' => 'stable'],
            'total_documents'      => ['value' => $totalDocs,  'change' => 0, 'trend' => 'stable'],
        ];
    }

    /* =====================================================
     *  MONTHLY TRENDS (LINE CHART)
     * ===================================================== */

    private function trends(string $year): array
    {
        $y = $year === 'all' ? date('Y') : $year;

        $rows = Database::fetchAll("
            SELECT MONTH(date_received) AS m, status, COUNT(*) AS cnt
            FROM communications
            WHERE YEAR(date_received) = ?
              AND date_received IS NOT NULL
            GROUP BY m, status
        ", [$y]);

        $months = [];
        $labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        foreach ($labels as $i => $label) {
            $months[$i] = [
                'month'       => $label,
                'received'    => 0,
                'for_signing' => 0,
                'signed'      => 0,
                'released'    => 0,
            ];
        }

        foreach ($rows as $r) {
            $idx = (int)$r['m'] - 1;
            $key = strtolower($r['status']); // 'RECEIVED' → 'received' etc.
            if (isset($months[$idx][$key])) {
                $months[$idx][$key] = (int)$r['cnt'];
            }
        }

        return array_values($months);
    }

    /* =====================================================
     *  TYPE DISTRIBUTION (PIE / BAR)
     * ===================================================== */

    private function typeDistribution(string $year, int $month, ?string $dateFrom, ?string $dateTo): array
    {
        [$where, $params] = $this->filters($year, $month, $dateFrom, $dateTo);

        $rows = Database::fetchAll("
            SELECT communication_type AS type, COUNT(*) AS value
            FROM communications c
            WHERE 1=1 {$where}
            GROUP BY communication_type
            ORDER BY value DESC
        ", $params);

        return array_map(fn($r) => [
            'type'  => $r['type'],
            'value' => (int)$r['value'],
        ], $rows);
    }

    /* =====================================================
     *  STATUS DISTRIBUTION (PIE)
     * ===================================================== */

    private function statusDistribution(string $year, int $month, ?string $dateFrom, ?string $dateTo): array
    {
        [$where, $params] = $this->filters($year, $month, $dateFrom, $dateTo);

        $rows = Database::fetchAll("
            SELECT status AS name, COUNT(*) AS value
            FROM communications c
            WHERE 1=1 {$where}
            GROUP BY status
            ORDER BY FIELD(status, 'RECEIVED','FOR_SIGNING','SIGNED','RELEASED')
        ", $params);

        return array_map(fn($r) => [
            'name'  => $r['name'],
            'value' => (int)$r['value'],
        ], $rows);
    }

    /* =====================================================
     *  RECENT ACTIVITIES (from audit_trails)
     * ===================================================== */

    private function recentActivities(): array
    {
        $rows = Database::fetchAll("
            SELECT
                at.id,
                at.action,
                at.entity,
                at.entity_id,
                at.description,
                u.name      AS user_name,
                u.user_type,
                at.created_at AS time
            FROM audit_trails at
            LEFT JOIN users u ON u.id = at.user_id
            ORDER BY at.created_at DESC
            LIMIT 10
        ");

        return array_map(fn($r) => [
            'id'          => $r['id'],
            'action'      => $r['action'],
            'entity'      => $r['entity'],
            'entity_id'   => $r['entity_id'],
            'description' => $r['description'],
            'user_name'   => $r['user_name'],
            'user_type'   => $r['user_type'],
            'time'        => $r['time'],
        ], $rows);
    }
}
