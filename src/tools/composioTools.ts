import type { ToolDefinition } from '../types';

export interface ComposioToolkitDef {
  slug: string;
  displayName: string;
  tools: ToolDefinition[];
}

export const COMPOSIO_TOOLKITS: ComposioToolkitDef[] = [
  {
    slug: 'gmail',
    displayName: 'Gmail',
    tools: [
      {
        type: 'function',
        function: {
          name: 'composio_gmail_send_email',
          description: 'Send an email via Gmail. Requires connected Gmail account.',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject line' },
              body: { type: 'string', description: 'Email body content (plain text or HTML)' },
              cc: { type: 'string', description: 'CC email addresses (comma-separated)' },
              bcc: { type: 'string', description: 'BCC email addresses (comma-separated)' },
            },
            required: ['to', 'subject', 'body'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_gmail_search',
          description: 'Search emails in Gmail using Gmail search syntax.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Gmail search query (e.g. "from:user@example.com subject:meeting")' },
              max_results: { type: 'number', description: 'Maximum number of results to return (default: 10)' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_gmail_read_email',
          description: 'Read a specific email by its ID.',
          parameters: {
            type: 'object',
            properties: {
              email_id: { type: 'string', description: 'The Gmail message ID' },
            },
            required: ['email_id'],
          },
        },
      },
    ],
  },
  {
    slug: 'github',
    displayName: 'GitHub',
    tools: [
      {
        type: 'function',
        function: {
          name: 'composio_github_list_repos',
          description: 'List repositories for the authenticated user or a specified organization.',
          parameters: {
            type: 'object',
            properties: {
              org: { type: 'string', description: 'GitHub organization name (optional, defaults to authenticated user)' },
              per_page: { type: 'number', description: 'Results per page (default: 30, max: 100)' },
            },
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_github_search_repos',
          description: 'Search for GitHub repositories.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              sort: { type: 'string', description: 'Sort by: stars, forks, updated' },
              per_page: { type: 'number', description: 'Results per page (default: 30)' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_github_get_repo',
          description: 'Get details of a specific GitHub repository.',
          parameters: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
            },
            required: ['owner', 'repo'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_github_create_issue',
          description: 'Create a new issue in a GitHub repository.',
          parameters: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              title: { type: 'string', description: 'Issue title' },
              body: { type: 'string', description: 'Issue body/description' },
              labels: { type: 'array', items: { type: 'string' }, description: 'Labels to add' },
            },
            required: ['owner', 'repo', 'title'],
          },
        },
      },
    ],
  },
  {
    slug: 'slack',
    displayName: 'Slack',
    tools: [
      {
        type: 'function',
        function: {
          name: 'composio_slack_send_message',
          description: 'Send a message to a Slack channel.',
          parameters: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel name or ID' },
              text: { type: 'string', description: 'Message text' },
            },
            required: ['channel', 'text'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_slack_list_channels',
          description: 'List channels in the connected Slack workspace.',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Maximum channels to return (default: 50)' },
            },
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_slack_get_channel_history',
          description: 'Get recent messages from a Slack channel.',
          parameters: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel name or ID' },
              limit: { type: 'number', description: 'Number of messages to fetch (default: 20)' },
            },
            required: ['channel'],
          },
        },
      },
    ],
  },
  {
    slug: 'googledrive',
    displayName: 'Google Drive',
    tools: [
      {
        type: 'function',
        function: {
          name: 'composio_gdrive_list_files',
          description: 'List files in Google Drive.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query to filter files' },
              limit: { type: 'number', description: 'Maximum files to return (default: 20)' },
            },
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_gdrive_search',
          description: 'Search for files in Google Drive.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number', description: 'Maximum results (default: 10)' },
            },
            required: ['query'],
          },
        },
      },
    ],
  },
  {
    slug: 'notion',
    displayName: 'Notion',
    tools: [
      {
        type: 'function',
        function: {
          name: 'composio_notion_search',
          description: 'Search Notion pages and databases.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number', description: 'Maximum results (default: 10)' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_notion_create_page',
          description: 'Create a new page in Notion.',
          parameters: {
            type: 'object',
            properties: {
              parent_id: { type: 'string', description: 'Parent page or database ID' },
              title: { type: 'string', description: 'Page title' },
              content: { type: 'string', description: 'Page content (Markdown)' },
            },
            required: ['parent_id', 'title'],
          },
        },
      },
    ],
  },
  {
    slug: 'googlecalendar',
    displayName: 'Google Calendar',
    tools: [
      {
        type: 'function',
        function: {
          name: 'composio_gcal_list_events',
          description: 'List upcoming events from Google Calendar.',
          parameters: {
            type: 'object',
            properties: {
              time_min: { type: 'string', description: 'Start of time range (ISO 8601)' },
              time_max: { type: 'string', description: 'End of time range (ISO 8601)' },
              max_results: { type: 'number', description: 'Maximum events to return (default: 10)' },
            },
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_gcal_create_event',
          description: 'Create a new event in Google Calendar.',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: 'Event title' },
              start_time: { type: 'string', description: 'Start time (ISO 8601)' },
              end_time: { type: 'string', description: 'End time (ISO 8601)' },
              description: { type: 'string', description: 'Event description' },
              location: { type: 'string', description: 'Event location' },
            },
            required: ['summary', 'start_time', 'end_time'],
          },
        },
      },
    ],
  },
  {
    slug: 'linear',
    displayName: 'Linear',
    tools: [
      {
        type: 'function',
        function: {
          name: 'composio_linear_list_issues',
          description: 'List issues in Linear.',
          parameters: {
            type: 'object',
            properties: {
              team_id: { type: 'string', description: 'Team ID to filter by' },
              status: { type: 'string', description: 'Issue status to filter by' },
              limit: { type: 'number', description: 'Maximum issues to return (default: 20)' },
            },
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'composio_linear_create_issue',
          description: 'Create a new issue in Linear.',
          parameters: {
            type: 'object',
            properties: {
              team_id: { type: 'string', description: 'Team ID' },
              title: { type: 'string', description: 'Issue title' },
              description: { type: 'string', description: 'Issue description' },
              priority: { type: 'number', description: 'Priority (1=urgent, 2=high, 3=medium, 4=low)' },
            },
            required: ['team_id', 'title'],
          },
        },
      },
    ],
  },
];

