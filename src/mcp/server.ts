import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  initMcpOAuthDb,
  handleProtectedResourceDiscovery,
  handleAuthorizationServerDiscovery,
  handleRegister,
  handleAuthorizeGet,
  handleAuthorizePost,
  handleToken,
  handleRevoke,
  resolveMcpUser,
  getPublicBaseUrl
} from './oauth.js';
import { registerMcpTools } from './tools.js';

export function setupMcpRoutes(app: express.Application): void {
  // Initialize SQLite / MySQL OAuth tables for MCP
  initMcpOAuthDb().catch(err => {
    console.error('❌ Errore durante l\'inizializzazione delle tabelle MCP OAuth:', err);
  });

  // URL-encoded parser for OAuth forms and token requests
  const urlencodedParser = express.urlencoded({ extended: true });

  // ── HEALTH CHECK ──
  app.get('/chatgpt/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'solarbrand-chatgpt-mcp',
      version: '1.0.0',
      time: new Date().toISOString()
    });
  });

  // ── OAUTH 2.0 DISCOVERY ENDPOINTS ──
  app.get('/.well-known/oauth-protected-resource/chatgpt/mcp', handleProtectedResourceDiscovery);
  app.get('/.well-known/oauth-authorization-server/chatgpt', handleAuthorizationServerDiscovery);

  // Fallback discovery paths if queried without the suffix
  app.get('/.well-known/oauth-protected-resource', handleProtectedResourceDiscovery);
  app.get('/.well-known/oauth-authorization-server', handleAuthorizationServerDiscovery);

  // ── OAUTH 2.0 FLOW ENDPOINTS ──
  app.post('/chatgpt/register', express.json(), handleRegister);
  app.get('/chatgpt/authorize', handleAuthorizeGet);
  app.post('/chatgpt/authorize', urlencodedParser, handleAuthorizePost);
  app.post('/chatgpt/token', urlencodedParser, express.json(), handleToken);
  app.post('/chatgpt/revoke', urlencodedParser, express.json(), handleRevoke);

  // ── MCP STREAMABLE HTTP TRANSPORT ENDPOINT ──
  app.post('/chatgpt/mcp', express.json({ limit: '64kb' }), async (req, res) => {
    // 1. Authenticate user from Bearer token
    const user = await resolveMcpUser(req);

    if (!user) {
      const baseUrl = getPublicBaseUrl(req);
      res.setHeader(
        'WWW-Authenticate',
        `Bearer error="invalid_token", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource/chatgpt/mcp"`
      );
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Autenticazione richiesta. Connetti il tuo account Solarbrand tramite OAuth o passa un token Bearer valido.'
        },
        id: req.body?.id || null
      });
    }

    // 2. Create MCP server with user identity and registered tools
    const server = new McpServer({
      name: 'solarbrand-flow',
      version: '1.0.0'
    });

    registerMcpTools(server, user);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      void Promise.allSettled([transport.close(), server.close()]);
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err: any) {
      console.error('[mcp server error]:', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Errore interno MCP: ' + (err?.message || 'sconosciuto')
          },
          id: req.body?.id || null
        });
      }
    }
  });

  app.all('/chatgpt/mcp', (_req, res) => {
    res.status(405).set('Allow', 'POST').json({ error: 'Method Not Allowed' });
  });

  console.log('🤖 MCP ChatGPT Connector attivo su: /chatgpt/mcp (Discovery: /.well-known/oauth-protected-resource/chatgpt/mcp)');
}

