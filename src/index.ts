#!/usr/bin/env node

import { config } from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { ADTClient, session_types, isCsrfError } from "abap-adt-api";
import path from 'path';
import { AuthHandlers } from './handlers/AuthHandlers.js';
import { TransportHandlers } from './handlers/TransportHandlers.js';
import { ObjectHandlers } from './handlers/ObjectHandlers.js';
import { ClassHandlers } from './handlers/ClassHandlers.js';
import { CodeAnalysisHandlers } from './handlers/CodeAnalysisHandlers.js';
import { ObjectLockHandlers } from './handlers/ObjectLockHandlers.js';
import { ObjectSourceHandlers } from './handlers/ObjectSourceHandlers.js';
import { ObjectDeletionHandlers } from './handlers/ObjectDeletionHandlers.js';
import { ObjectManagementHandlers } from './handlers/ObjectManagementHandlers.js';
import { ObjectRegistrationHandlers } from './handlers/ObjectRegistrationHandlers.js';
import { NodeHandlers } from './handlers/NodeHandlers.js';
import { DiscoveryHandlers } from './handlers/DiscoveryHandlers.js';
import { UnitTestHandlers } from './handlers/UnitTestHandlers.js';
import { PrettyPrinterHandlers } from './handlers/PrettyPrinterHandlers.js';
import { GitHandlers } from './handlers/GitHandlers.js';
import { DdicHandlers } from './handlers/DdicHandlers.js';
import { ServiceBindingHandlers } from './handlers/ServiceBindingHandlers.js';
import { QueryHandlers } from './handlers/QueryHandlers.js';
import { FeedHandlers } from './handlers/FeedHandlers.js';
import { DebugHandlers } from './handlers/DebugHandlers.js';
import { RenameHandlers } from './handlers/RenameHandlers.js';
import { AtcHandlers } from './handlers/AtcHandlers.js';
import { TraceHandlers } from './handlers/TraceHandlers.js';
import { RefactorHandlers } from './handlers/RefactorHandlers.js';
import { RevisionHandlers } from './handlers/RevisionHandlers.js';

config({ path: path.resolve(__dirname, '../.env') });

export class AbapAdtServer extends Server {
  private adtClient: ADTClient;
  private authHandlers: AuthHandlers;
  private transportHandlers: TransportHandlers;
  private objectHandlers: ObjectHandlers;
  private classHandlers: ClassHandlers;
  private codeAnalysisHandlers: CodeAnalysisHandlers;
  private objectLockHandlers: ObjectLockHandlers;
  private objectSourceHandlers: ObjectSourceHandlers;
  private objectDeletionHandlers: ObjectDeletionHandlers;
  private objectManagementHandlers: ObjectManagementHandlers;
  private objectRegistrationHandlers: ObjectRegistrationHandlers;
    private nodeHandlers: NodeHandlers;
    private discoveryHandlers: DiscoveryHandlers;
    private unitTestHandlers: UnitTestHandlers;
    private prettyPrinterHandlers: PrettyPrinterHandlers;
    private gitHandlers: GitHandlers;
    private ddicHandlers: DdicHandlers;
    private serviceBindingHandlers: ServiceBindingHandlers;
    private queryHandlers: QueryHandlers;
    private feedHandlers: FeedHandlers;
    private debugHandlers: DebugHandlers;
    private renameHandlers: RenameHandlers;
    private atcHandlers: AtcHandlers;
    private traceHandlers: TraceHandlers;
    private refactorHandlers: RefactorHandlers;
    private revisionHandlers: RevisionHandlers;

    constructor() {
    super(
      {
        name: "mcp-abap-abap-adt-api",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const missingVars = ['SAP_URL', 'SAP_USER', 'SAP_PASSWORD'].filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    this.adtClient = new ADTClient(
      process.env.SAP_URL as string,
      process.env.SAP_USER as string,
      process.env.SAP_PASSWORD as string,
      process.env.SAP_CLIENT as string,
      process.env.SAP_LANGUAGE as string
    );
    this.adtClient.stateful = session_types.stateful
    
    // Initialize handlers
    this.authHandlers = new AuthHandlers(this.adtClient);
    this.transportHandlers = new TransportHandlers(this.adtClient);
    this.objectHandlers = new ObjectHandlers(this.adtClient);
    this.classHandlers = new ClassHandlers(this.adtClient);
    this.codeAnalysisHandlers = new CodeAnalysisHandlers(this.adtClient);
    this.objectLockHandlers = new ObjectLockHandlers(this.adtClient);
    this.objectSourceHandlers = new ObjectSourceHandlers(this.adtClient);
    this.objectDeletionHandlers = new ObjectDeletionHandlers(this.adtClient);
    this.objectManagementHandlers = new ObjectManagementHandlers(this.adtClient);
    this.objectRegistrationHandlers = new ObjectRegistrationHandlers(this.adtClient);
    this.nodeHandlers = new NodeHandlers(this.adtClient);
    this.discoveryHandlers = new DiscoveryHandlers(this.adtClient);
    this.unitTestHandlers = new UnitTestHandlers(this.adtClient);
    this.prettyPrinterHandlers = new PrettyPrinterHandlers(this.adtClient);
    this.gitHandlers = new GitHandlers(this.adtClient);
    this.ddicHandlers = new DdicHandlers(this.adtClient);
    this.serviceBindingHandlers = new ServiceBindingHandlers(this.adtClient);
    this.queryHandlers = new QueryHandlers(this.adtClient);
    this.feedHandlers = new FeedHandlers(this.adtClient);
    this.debugHandlers = new DebugHandlers(this.adtClient);
    this.renameHandlers = new RenameHandlers(this.adtClient);
    this.atcHandlers = new AtcHandlers(this.adtClient);
    this.traceHandlers = new TraceHandlers(this.adtClient);
    this.refactorHandlers = new RefactorHandlers(this.adtClient);
    this.revisionHandlers = new RevisionHandlers(this.adtClient);


        // Setup tool handlers
    this.setupToolHandlers();
  }

  private serializeResult(result: any) {
    try {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          )
        }]
      };
    } catch (error) {
      return this.handleError(new McpError(
        ErrorCode.InternalError,
        'Failed to serialize result'
      ));
    }
  }

  private isSessionExpired(error: unknown): boolean {
    // isCsrfError covers both CSRF token expired and "Session timed out" (HTTP 400)
    if (isCsrfError(error)) return true;
    // Also catch errors wrapped by handlers as McpError with session-related messages
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('session timed out') || msg.includes('csrf token')) return true;
    }
    return false;
  }

  private async reconnect(): Promise<void> {
    console.error('[MCP] Session expired, reconnecting...');
    try {
      await this.adtClient.dropSession();
    } catch (_) { /* ignore dropSession errors */ }
    this.adtClient.stateful = session_types.stateful;
    await this.adtClient.login();
    console.error('[MCP] Reconnected successfully');
  }

  private handleError(error: unknown) {
    if (!(error instanceof Error)) {
      error = new Error(String(error));
    }
    if (error instanceof McpError) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            code: error.code
          })
        }],
        isError: true
      };
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Internal server error',
          code: ErrorCode.InternalError
        })
      }],
      isError: true
    };
  }

  private setupToolHandlers() {
    this.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          ...this.authHandlers.getTools(),
          ...this.transportHandlers.getTools(),
          ...this.objectHandlers.getTools(),
          ...this.classHandlers.getTools(),
          ...this.codeAnalysisHandlers.getTools(),
          ...this.objectLockHandlers.getTools(),
          ...this.objectSourceHandlers.getTools(),
          ...this.objectDeletionHandlers.getTools(),
          ...this.objectManagementHandlers.getTools(),
          ...this.objectRegistrationHandlers.getTools(),
            ...this.nodeHandlers.getTools(),
            ...this.discoveryHandlers.getTools(),
            ...this.unitTestHandlers.getTools(),
            ...this.prettyPrinterHandlers.getTools(),
            ...this.gitHandlers.getTools(),
            ...this.ddicHandlers.getTools(),
            ...this.serviceBindingHandlers.getTools(),
            ...this.queryHandlers.getTools(),
            ...this.feedHandlers.getTools(),
            ...this.debugHandlers.getTools(),
            ...this.renameHandlers.getTools(),
            ...this.atcHandlers.getTools(),
            ...this.traceHandlers.getTools(),
            ...this.refactorHandlers.getTools(),
            ...this.revisionHandlers.getTools(),
            {
            name: 'healthcheck',
            description: 'Check server health and connectivity',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    this.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name } = request.params;
      const args = request.params.arguments;

      // Auth tools bypass retry logic (they manage the session themselves)
      const AUTH_TOOLS = ['login', 'logout', 'dropSession'];
      if (AUTH_TOOLS.includes(name)) {
        try {
          const result = await this.authHandlers.handle(name, args);
          return this.serializeResult(result);
        } catch (error) {
          return this.handleError(error);
        }
      }

      // All other tools: try once, auto-reconnect on session timeout, retry once
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await this.dispatchTool(name, args);
          return this.serializeResult(result);
        } catch (error) {
          if (attempt === 0 && this.isSessionExpired(error)) {
            try {
              await this.reconnect();
              continue; // retry
            } catch (reconnectError) {
              console.error('[MCP] Reconnect failed:', reconnectError);
              return this.handleError(error); // return original error
            }
          }
          return this.handleError(error);
        }
      }
      // Should never reach here, but TypeScript needs a return
      return this.handleError(new Error('Unexpected retry exhaustion'));
    });
  }

  private async dispatchTool(name: string, args: any): Promise<any> {
      let result: any;
      switch (name) {
            case 'transportInfo':
            case 'createTransport':
            case 'hasTransportConfig':
            case 'transportConfigurations':
            case 'getTransportConfiguration':
            case 'setTransportsConfig':
            case 'createTransportsConfig':
            case 'userTransports':
            case 'transportsByConfig':
            case 'transportDelete':
            case 'transportRelease':
            case 'transportSetOwner':
            case 'transportAddUser':
            case 'systemUsers':
            case 'transportReference':
                result = await this.transportHandlers.handle(name, args);
                break;
            case 'lock':
            case 'unLock':
                result = await this.objectLockHandlers.handle(name, args);
                break;
            case 'objectStructure':
            case 'searchObject':
            case 'findObjectPath':
            case 'objectTypes':
            case 'reentranceTicket':
                result = await this.objectHandlers.handle(name, args);
                break;
            case 'classIncludes':
            case 'classComponents':
                result = await this.classHandlers.handle(name, args);
                break;
            case 'syntaxCheckCode':
            case 'syntaxCheckCdsUrl':
            case 'codeCompletion':
            case 'findDefinition':
            case 'usageReferences':
            case 'syntaxCheckTypes':
            case 'codeCompletionFull':
            case 'runClass':
            case 'codeCompletionElement':
            case 'usageReferenceSnippets':
            case 'fixProposals':
            case 'fixEdits':
            case 'fragmentMappings':
            case 'abapDocumentation':
                result = await this.codeAnalysisHandlers.handle(name, args);
                break;
            case 'getObjectSource':
            case 'setObjectSource':
                result = await this.objectSourceHandlers.handle(name, args);
                break;
            case 'deleteObject':
                result = await this.objectDeletionHandlers.handle(name, args);
                break;
            case 'activateObjects':
            case 'activateByName':
            case 'inactiveObjects':
                result = await this.objectManagementHandlers.handle(name, args);
                break;
            case 'objectRegistrationInfo':
            case 'validateNewObject':
            case 'createObject':
                result = await this.objectRegistrationHandlers.handle(name, args);
                break;
            case 'nodeContents':
            case 'mainPrograms':
                result = await this.nodeHandlers.handle(name, args);
                break;
            case 'featureDetails':
            case 'collectionFeatureDetails':
            case 'findCollectionByUrl':
            case 'loadTypes':
            case 'adtDiscovery':
            case 'adtCoreDiscovery':
            case 'adtCompatibiliyGraph':
                result = await this.discoveryHandlers.handle(name, args);
                break;
            case 'unitTestRun':
            case 'unitTestEvaluation':
            case 'unitTestOccurrenceMarkers':
            case 'createTestInclude':
                result = await this.unitTestHandlers.handle(name, args);
                break;
            case 'prettyPrinterSetting':
            case 'setPrettyPrinterSetting':
            case 'prettyPrinter':
                result = await this.prettyPrinterHandlers.handle(name, args);
                break;
            case 'gitRepos':
            case 'gitExternalRepoInfo':
            case 'gitCreateRepo':
            case 'gitPullRepo':
            case 'gitUnlinkRepo':
            case 'stageRepo':
            case 'pushRepo':
            case 'checkRepo':
            case 'remoteRepoInfo':
            case 'switchRepoBranch':
                result = await this.gitHandlers.handle(name, args);
                break;
            case 'annotationDefinitions':
            case 'ddicElement':
            case 'ddicRepositoryAccess':
            case 'packageSearchHelp':
                result = await this.ddicHandlers.handle(name, args);
                break;
            case 'publishServiceBinding':
            case 'unPublishServiceBinding':
            case 'bindingDetails':
                result = await this.serviceBindingHandlers.handle(name, args);
                break;
            case 'tableContents':
            case 'runQuery':
                result = await this.queryHandlers.handle(name, args);
                break;
            case 'feeds':
            case 'dumps':
                result = await this.feedHandlers.handle(name, args);
                break;
            case 'debuggerListeners':
            case 'debuggerListen':
            case 'debuggerDeleteListener':
            case 'debuggerSetBreakpoints':
            case 'debuggerDeleteBreakpoints':
            case 'debuggerAttach':
            case 'debuggerSaveSettings':
            case 'debuggerStackTrace':
            case 'debuggerVariables':
            case 'debuggerChildVariables':
            case 'debuggerStep':
            case 'debuggerGoToStack':
            case 'debuggerSetVariableValue':
                result = await this.debugHandlers.handle(name, args);
                break;
            case 'renameEvaluate':
            case 'renamePreview':
            case 'renameExecute':
                result = await this.renameHandlers.handle(name, args);
                break;
            case 'atcCustomizing':
            case 'atcCheckVariant':
            case 'createAtcRun':
            case 'atcWorklists':
            case 'atcUsers':
            case 'atcExemptProposal':
            case 'atcRequestExemption':
            case 'isProposalMessage':
            case 'atcContactUri':
            case 'atcChangeContact':
                result = await this.atcHandlers.handle(name, args);
                break;
            case 'tracesList':
            case 'tracesListRequests':
            case 'tracesHitList':
            case 'tracesDbAccess':
            case 'tracesStatements':
            case 'tracesSetParameters':
            case 'tracesCreateConfiguration':
            case 'tracesDeleteConfiguration':
            case 'tracesDelete':
                result = await this.traceHandlers.handle(name, args);
                break;
            case 'extractMethodEvaluate':
            case 'extractMethodPreview':
            case 'extractMethodExecute':
                result = await this.refactorHandlers.handle(name, args);
                break;
            case 'revisions':
                result = await this.revisionHandlers.handle(name, args);
                break;
            case 'healthcheck':
                result = { status: 'healthy', timestamp: new Date().toISOString() };
                break;
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        return result;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.connect(transport);
    console.error('MCP ABAP ADT API server running on stdio');
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      await this.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await this.close();
      process.exit(0);
    });
    
    // Handle errors
    this.onerror = (error) => {
      console.error('[MCP Error]', error);
    };
  }
}

// Create and run server instance
const server = new AbapAdtServer();
server.run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
