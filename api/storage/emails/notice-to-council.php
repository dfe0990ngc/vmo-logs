<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title><?= htmlspecialchars($appName) ?> - Notice of Session</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">

    <!-- ✅ Preheader -->
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; color:#f4f4f4; line-height:1px;">
        Notice of Session &ndash; <?= htmlspecialchars($agenda['agenda_type']) ?> Session scheduled. Please review the details inside.
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>

    <style>
        @media screen and (max-width: 600px) {
            .container { width: 100% !important; border-radius: 0 !important; }
            .header-logo img { width: 60px !important; }
            .header-logos img { width: 30px !important; }
        }
    </style>

    <?php
        $baseUrl = rtrim(APP_URL ?: '', '/');

        $logoUrl   = $baseUrl . '/public/images/smart-sb-email-short.png';
        $lguUrl    = $baseUrl . '/public/images/lgu.png';
        $sbUrl     = $baseUrl . '/public/images/sb.png';
        $vmoUrl    = $baseUrl . '/public/images/vmo.jpg';

        $headerLogos = [
            ['uri' => $lguUrl, 'alt' => 'LGU'],
            ['uri' => $sbUrl,  'alt' => 'SB'],
            ['uri' => $vmoUrl, 'alt' => 'VMO'],
        ];

        // Normalize $documentLinks — ensure it's always an array
        $documentLinks = isset($documentLinks) && is_array($documentLinks) ? $documentLinks : [];
    ?>

    <table cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f4; padding: 40px 0;">
        <tr>
            <td align="center">

                <!-- Main Container -->
                <table class="container" cellpadding="0" cellspacing="0" width="600"
                    style="max-width:600px; width:100%; background-color:#ffffff; border-radius:8px; overflow:hidden;">

                    <!-- Header Banner -->
                    <tr>
                        <td align="center" style="background-color:#008ea2; padding: 30px 20px;">

                            <!-- App Logo -->
                            <?php if ($logoUrl): ?>
                            <div class="header-logo" style="margin-bottom:16px;">
                                <img src="<?= $logoUrl ?>"
                                     alt="<?= htmlspecialchars($appName) ?>"
                                     width="80" height="80"
                                     style="display:block; margin:0 auto; border-radius:50%;
                                            border:3px solid rgba(255,255,255,0.6);
                                            box-shadow:0 4px 12px rgba(0,0,0,0.2);" />
                            </div>
                            <?php endif; ?>

                            <!-- LGU / SB / VMO logos -->
                            <table cellpadding="0" cellspacing="0" class="header-logos" style="margin-bottom:16px;">
                                <tr>
                                    <?php foreach ($headerLogos as $logo): ?>
                                    <?php if (!empty($logo['uri'])): ?>
                                    <td align="center" style="padding: 0 10px;">
                                        <img src="<?= $logo['uri'] ?>"
                                             alt="<?= htmlspecialchars($logo['alt']) ?>"
                                             width="50" height="50"
                                             style="display:block; border-radius:50%; border:2px solid rgba(255,255,255,0.5);" />
                                    </td>
                                    <?php endif; ?>
                                    <?php endforeach; ?>
                                </tr>
                            </table>

                            <!-- App name -->
                            <p style="margin:0; color:#ffffff; font-size:13px; letter-spacing:1px; text-transform:uppercase; opacity:0.85;">
                                <?= htmlspecialchars($appName) ?>
                            </p>

                            <!-- Main heading -->
                            <h1 style="margin:8px 0 0 0; color:#ffffff; font-size:24px; font-weight:bold; letter-spacing:0.5px;">
                                Notice of Session
                            </h1>
                        </td>
                    </tr>

                    <!-- Type Badge -->
                    <tr>
                        <td align="center" style="background-color:#006d7d; padding: 10px 20px;">
                            <span style="display:inline-block; background-color:rgba(255,255,255,0.15);
                                         color:#ffffff; font-size:13px; font-weight:bold;
                                         padding:4px 16px; border-radius:20px; letter-spacing:0.5px;">
                                <?= htmlspecialchars($agenda['agenda_type']) ?> Session
                            </span>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 36px 36px 24px 36px; color:#333333; font-size:15px; line-height:1.7;">

                            <p style="margin:0 0 20px 0;">
                                Dear <strong><?= htmlspecialchars($memberName) ?></strong>,
                            </p>

                            <p style="margin:0 0 20px 0;">
                                You are hereby notified that a
                                <strong><?= ucfirst(htmlspecialchars($agenda['agenda_type'])) ?> Session</strong>
                                of the Sangguniang Bayan has been scheduled. Please review the details below
                                and make every effort to attend.
                            </p>

                            <!-- Session Details Card -->
                            <table cellpadding="0" cellspacing="0" width="100%"
                                style="background-color:#f0fafb; border-left:4px solid #008ea2;
                                       border-radius:0 6px 6px 0; margin: 24px 0;">
                                <tr>
                                    <td style="padding:20px 24px;">

                                        <p style="margin:0 0 4px 0; font-size:11px; text-transform:uppercase;
                                                   letter-spacing:1px; color:#008ea2; font-weight:bold;">
                                            Session Details
                                        </p>

                                        <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;">

                                            <!-- Agenda Number -->
                                            <?php if (!empty($agenda['agenda_number'])): ?>
                                            <tr>
                                                <td width="140" style="font-size:13px; color:#777; padding:5px 0;
                                                            vertical-align:top; white-space:nowrap;">
                                                    Agenda No.
                                                </td>
                                                <td style="font-size:14px; color:#222; font-weight:bold; padding:5px 0;">
                                                    <?= htmlspecialchars($agenda['agenda_number']) ?>
                                                </td>
                                            </tr>
                                            <?php endif; ?>

                                            <!-- Title -->
                                            <tr>
                                                <td width="140" style="font-size:13px; color:#777; padding:5px 0;
                                                            vertical-align:top; white-space:nowrap;">
                                                    Title
                                                </td>
                                                <td style="font-size:14px; color:#222; font-weight:bold; padding:5px 0;">
                                                    <?= htmlspecialchars($agenda['title']) ?>
                                                </td>
                                            </tr>

                                            <!-- Date -->
                                            <?php if (!empty($agenda['session_date'])): ?>
                                            <tr>
                                                <td width="140" style="font-size:13px; color:#777; padding:5px 0; white-space:nowrap;">
                                                    Date
                                                </td>
                                                <td style="font-size:14px; color:#222; padding:5px 0;">
                                                    <?= date('F j, Y', strtotime($agenda['session_date'])) ?>
                                                </td>
                                            </tr>
                                            <?php endif; ?>

                                            <!-- Time -->
                                            <?php if (!empty($agenda['session_time'])): ?>
                                            <tr>
                                                <td width="140" style="font-size:13px; color:#777; padding:5px 0; white-space:nowrap;">
                                                    Time
                                                </td>
                                                <td style="font-size:14px; color:#222; padding:5px 0;">
                                                    <?= date('g:i A', strtotime($agenda['session_time'])) ?>
                                                </td>
                                            </tr>
                                            <?php endif; ?>

                                            <!-- Status -->
                                            <tr>
                                                <td width="140" style="font-size:13px; color:#777; padding:5px 0; white-space:nowrap;">
                                                    Status
                                                </td>
                                                <td style="font-size:14px; padding:5px 0;">
                                                    <?php
                                                        $statusColors = [
                                                            'pending'     => '#f59e0b',
                                                            'scheduled'   => '#3b82f6',
                                                            'in_progress' => '#8b5cf6',
                                                            'approved'    => '#10b981',
                                                            'rejected'    => '#ef4444',
                                                            'deferred'    => '#6b7280',
                                                            'withdrawn'   => '#6b7280',
                                                        ];
                                                        $statusColor = $statusColors[$agenda['status']] ?? '#6b7280';
                                                    ?>
                                                    <span style="display:inline-block; background-color:<?= $statusColor ?>;
                                                                 color:#fff; font-size:11px; font-weight:bold;
                                                                 padding:2px 10px; border-radius:12px; text-transform:uppercase;
                                                                 letter-spacing:0.5px;">
                                                        <?= htmlspecialchars(str_replace('_', ' ', $agenda['status'])) ?>
                                                    </span>
                                                </td>
                                            </tr>

                                            <!-- SB Secretary -->
                                            <?php if (!empty($agenda['current_sb_sec'])): ?>
                                            <tr>
                                                <td width="140" style="font-size:13px; color:#777; padding:5px 0; white-space:nowrap;">
                                                    SB Secretary
                                                </td>
                                                <td style="font-size:14px; color:#222; padding:5px 0;">
                                                    <?= htmlspecialchars($agenda['current_sb_sec']) ?>
                                                </td>
                                            </tr>
                                            <?php endif; ?>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Optional note from sender -->
                            <?php if (!empty($noticeMessage)): ?>
                            <table cellpadding="0" cellspacing="0" width="100%"
                                style="background-color:#fffbeb; border:1px solid #fde68a;
                                       border-radius:6px; margin:0 0 24px 0;">
                                <tr>
                                    <td style="padding:16px 20px;">
                                        <p style="margin:0 0 6px 0; font-size:12px; font-weight:bold;
                                                   color:#92400e; text-transform:uppercase; letter-spacing:0.5px;">
                                            Additional Notice
                                        </p>
                                        <p style="margin:0; font-size:14px; color:#78350f; line-height:1.6;">
                                            <?= nl2br(htmlspecialchars($noticeMessage)) ?>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <?php endif; ?>

                            <!-- Document download links -->
                            <?php if (!empty($documentLinks)): ?>
                            <table cellpadding="0" cellspacing="0" width="100%"
                                style="background-color:#f0f9ff; border:1px solid #bae6fd;
                                       border-radius:6px; margin:0 0 24px 0;">
                                <tr>
                                    <td style="padding:16px 20px;">

                                        <p style="margin:0 0 12px 0; font-size:12px; font-weight:bold;
                                                   color:#0369a1; text-transform:uppercase; letter-spacing:0.5px;">
                                            &#128206;&nbsp; Agenda Document<?= count($documentLinks) > 1 ? 's' : '' ?>
                                        </p>

                                        <?php foreach ($documentLinks as $index => $doc): ?>
                                        <table cellpadding="0" cellspacing="0" width="100%"
                                            style="<?= $index > 0 ? 'margin-top:10px;' : '' ?>">
                                            <tr>
                                                <td style="vertical-align:middle; width:20px; padding-right:8px;">
                                                    <span style="font-size:16px; color:#0369a1;">&#8599;</span>
                                                </td>
                                                <td>
                                                    <a href="<?= htmlspecialchars($doc['url']) ?>"
                                                       target="_blank"
                                                       style="color:#0369a1; font-size:14px; font-weight:bold;
                                                              text-decoration:underline; word-break:break-all;">
                                                        <?= htmlspecialchars($doc['title']) ?>
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <?php endforeach; ?>

                                        <p style="margin:12px 0 0 0; font-size:11px; color:#64748b; line-height:1.5;">
                                            Click the link<?= count($documentLinks) > 1 ? 's' : '' ?> above
                                            to view or download the agenda document<?= count($documentLinks) > 1 ? 's' : '' ?>.
                                            Links are secure and will open in your browser.
                                        </p>

                                    </td>
                                </tr>
                            </table>
                            <?php endif; ?>

                            <p style="margin:0 0 6px 0; font-size:14px; color:#555;">
                                This is an official notice from the <?= htmlspecialchars($appName) ?> system.
                                Please do not reply directly to this email.
                            </p>

                            <p style="margin:24px 0 0 0;">
                                Respectfully,<br>
                                <strong style="color:#008ea2;"><?= htmlspecialchars($senderName ?? 'The SB Secretariat') ?></strong><br>
                                <span style="font-size:13px; color:#777;"><?= htmlspecialchars($appName) ?></span>
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8f9fa; padding:20px 36px; border-top:1px solid #e9ecef;
                                   text-align:center; font-size:12px; color:#9ca3af;">
                            <p style="margin:0;">
                                &copy; <?= date('Y') ?> <?= htmlspecialchars($appName) ?>. All rights reserved.
                            </p>
                            <p style="margin:6px 0 0 0; font-size:11px;">
                                This email was sent to <strong><?= htmlspecialchars($memberEmail) ?></strong>.
                                If you believe this was sent in error, please contact your SB administrator.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>