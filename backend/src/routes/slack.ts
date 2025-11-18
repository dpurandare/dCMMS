/**
 * Slack Integration API (DCMMS-072)
 *
 * Endpoints:
 * - GET /api/v1/slack/install - Start OAuth installation
 * - GET /api/v1/slack/oauth/callback - OAuth callback
 * - POST /api/v1/slack/interactive - Interactive actions webhook
 * - GET /api/v1/slack/workspaces - List Slack workspaces
 * - POST /api/v1/slack/channels - Add channel mapping
 * - GET /api/v1/slack/channels - List channel mappings
 * - DELETE /api/v1/slack/channels/:id - Remove channel mapping
 * - POST /api/v1/slack/test - Send test message
 */

import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { WebClient } from '@slack/web-api';
import { db } from '../db';
import SlackService from '../services/slack.service';

const router = express.Router();

// Slack OAuth configuration
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/v1/slack/oauth/callback';

// ==========================================
// Validation Middleware
// ==========================================

const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ==========================================
// OAuth Installation Routes
// ==========================================

/**
 * GET /api/v1/slack/install
 * Start Slack OAuth installation
 */
router.get('/install', (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

  // Build Slack OAuth URL
  const scopes = [
    'chat:write',
    'users:read',
    'users:read.email',
    'channels:read',
    'groups:read',
    'im:read',
    'commands',
  ];

  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${scopes.join(',')}&redirect_uri=${encodeURIComponent(SLACK_REDIRECT_URI)}&state=${tenantId}`;

  // Redirect to Slack OAuth page
  res.redirect(authUrl);
});

/**
 * GET /api/v1/slack/oauth/callback
 * OAuth callback handler
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const tenantId = state as string;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Missing authorization code',
    });
  }

  try {
    // Exchange code for token
    const slackClient = new WebClient();
    const result = await slackClient.oauth.v2.access({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code: code as string,
      redirect_uri: SLACK_REDIRECT_URI,
    });

    if (!result.ok || !result.access_token) {
      throw new Error('OAuth token exchange failed');
    }

    // Save workspace to database
    const workspaceResult = await db.query(
      `
      INSERT INTO slack_workspaces (
        tenant_id,
        team_id,
        team_name,
        team_domain,
        bot_token,
        bot_user_id,
        app_id,
        scope,
        installed_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (team_id) DO UPDATE SET
        bot_token = EXCLUDED.bot_token,
        bot_user_id = EXCLUDED.bot_user_id,
        scope = EXCLUDED.scope,
        active = true,
        updated_at = NOW()
      RETURNING id, team_id, team_name
    `,
      [
        tenantId,
        result.team?.id,
        result.team?.name,
        result.team?.domain || null,
        result.access_token,
        result.bot_user_id,
        result.app_id,
        result.scope,
        result.authed_user?.id || null,
      ]
    );

    const workspace = workspaceResult.rows[0];

    // Success - redirect to settings page
    res.send(`
      <html>
        <body>
          <h1>✅ Slack Integration Successful!</h1>
          <p>Workspace: <strong>${workspace.team_name}</strong></p>
          <p>You can close this window and return to the app.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Slack OAuth error:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>❌ Slack Integration Failed</h1>
          <p>Error: ${error.message}</p>
          <p>Please try again or contact support.</p>
        </body>
      </html>
    `);
  }
});

// ==========================================
// Interactive Actions Webhook
// ==========================================

/**
 * POST /api/v1/slack/interactive
 * Handle Slack interactive actions (button clicks)
 */
router.post('/interactive', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    // Verify Slack signature
    const slackService = new SlackService();
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const body = req.body.toString();

    if (!slackService.verifySlackRequest(body, timestamp, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse payload
    const payload = JSON.parse(new URLSearchParams(body).get('payload') || '{}');

    // Handle action
    await slackService.handleInteractiveAction(payload);

    // Acknowledge receipt
    res.status(200).send();
  } catch (error: any) {
    console.error('Slack interactive error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Workspace Management Routes
// ==========================================

/**
 * GET /api/v1/slack/workspaces
 * List Slack workspaces
 */
router.get('/workspaces', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

    const result = await db.query(
      `
      SELECT
        id,
        team_id AS "teamId",
        team_name AS "teamName",
        team_domain AS "teamDomain",
        bot_user_id AS "botUserId",
        active,
        installed_at AS "installedAt",
        updated_at AS "updatedAt"
      FROM slack_workspaces
      WHERE tenant_id = $1
      ORDER BY installed_at DESC
    `,
      [tenantId]
    );

    res.json({
      success: true,
      workspaces: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error listing Slack workspaces:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list workspaces',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/v1/slack/workspaces/:id
 * Disconnect Slack workspace
 */
router.delete('/workspaces/:id', param('id').isUUID(), handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

    const result = await db.query(
      'UPDATE slack_workspaces SET active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found',
      });
    }

    res.json({
      success: true,
      message: 'Slack workspace disconnected',
    });
  } catch (error: any) {
    console.error('Error disconnecting Slack workspace:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect workspace',
      message: error.message,
    });
  }
});

// ==========================================
// Channel Mapping Routes
// ==========================================

/**
 * POST /api/v1/slack/channels
 * Add channel mapping
 */
router.post(
  '/channels',
  [
    body('workspaceId').isUUID(),
    body('channelId').notEmpty(),
    body('channelName').optional(),
    body('eventTypes').isArray(),
    body('mentionUsers').optional().isBoolean(),
    body('threadReplies').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const {
        workspaceId,
        channelId,
        channelName,
        eventTypes,
        mentionUsers = false,
        threadReplies = false,
      } = req.body;

      const result = await db.query(
        `
        INSERT INTO slack_channel_mappings (
          workspace_id,
          channel_id,
          channel_name,
          event_types,
          mention_users,
          thread_replies
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          channel_id AS "channelId",
          channel_name AS "channelName",
          event_types AS "eventTypes",
          mention_users AS "mentionUsers",
          thread_replies AS "threadReplies",
          created_at AS "createdAt"
      `,
        [workspaceId, channelId, channelName, eventTypes, mentionUsers, threadReplies]
      );

      res.status(201).json({
        success: true,
        mapping: result.rows[0],
        message: 'Channel mapping created',
      });
    } catch (error: any) {
      console.error('Error creating channel mapping:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create channel mapping',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/slack/channels
 * List channel mappings
 */
router.get('/channels', query('workspaceId').optional().isUUID(), handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';
    const { workspaceId } = req.query;

    let query = `
      SELECT
        scm.id,
        scm.workspace_id AS "workspaceId",
        scm.channel_id AS "channelId",
        scm.channel_name AS "channelName",
        scm.event_types AS "eventTypes",
        scm.mention_users AS "mentionUsers",
        scm.thread_replies AS "threadReplies",
        scm.active,
        scm.created_at AS "createdAt",
        sw.team_name AS "workspaceName"
      FROM slack_channel_mappings scm
      INNER JOIN slack_workspaces sw ON scm.workspace_id = sw.id
      WHERE sw.tenant_id = $1
    `;

    const params: any[] = [tenantId];

    if (workspaceId) {
      query += ' AND scm.workspace_id = $2';
      params.push(workspaceId);
    }

    query += ' ORDER BY scm.created_at DESC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      mappings: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error listing channel mappings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list channel mappings',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/v1/slack/channels/:id
 * Remove channel mapping
 */
router.delete('/channels/:id', param('id').isUUID(), handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

    const result = await db.query(
      `
      DELETE FROM slack_channel_mappings scm
      USING slack_workspaces sw
      WHERE scm.id = $1
        AND scm.workspace_id = sw.id
        AND sw.tenant_id = $2
      RETURNING scm.id
    `,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Channel mapping not found',
      });
    }

    res.json({
      success: true,
      message: 'Channel mapping deleted',
    });
  } catch (error: any) {
    console.error('Error deleting channel mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete channel mapping',
      message: error.message,
    });
  }
});

// ==========================================
// Test Route
// ==========================================

/**
 * POST /api/v1/slack/test
 * Send test message to Slack
 */
router.post(
  '/test',
  [body('workspaceId').isUUID(), body('channelId').notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { workspaceId, channelId } = req.body;
      const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

      // Get workspace
      const workspaceResult = await db.query(
        'SELECT bot_token AS "botToken" FROM slack_workspaces WHERE id = $1 AND tenant_id = $2',
        [workspaceId, tenantId]
      );

      if (workspaceResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found',
        });
      }

      // Send test message
      const slackClient = new WebClient(workspaceResult.rows[0].botToken);
      const result = await slackClient.chat.postMessage({
        channel: channelId,
        text: '✅ Test message from dCMMS',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '✅ *dCMMS Test Message*\n\nYour Slack integration is working correctly!',
            },
          },
        ],
      });

      res.json({
        success: true,
        message: 'Test message sent successfully',
        messageTs: result.ts,
      });
    } catch (error: any) {
      console.error('Error sending test message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test message',
        message: error.message,
      });
    }
  }
);

export default router;
