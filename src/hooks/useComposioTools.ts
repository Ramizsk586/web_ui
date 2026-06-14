import React, { useState, useCallback } from 'react';
import { Tool } from '../types';
import { COMPOSIO_TOOLKITS } from '../tools/composioTools';

export interface ComposioConnection {
  slug: string;
  displayName: string;
  connected: boolean;
  connectionId?: string;
}

export function useComposioTools() {
  const [composioTools, setComposioTools] = useState<Tool[]>(() => {
    return COMPOSIO_TOOLKITS.flatMap((tk) =>
      tk.tools.map((td) => ({
        id: td.function.name,
        name: td.function.name
          .replace('composio_', '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        description: td.function.description || '',
        enabled: false,
        toolkit: tk.slug,
        toolkitDisplayName: tk.displayName,
        parameters: td.function.parameters,
      }))
    );
  });

  const [composioConnections, setComposioConnections] = useState<ComposioConnection[]>([]);
  const [composioEnabled, setComposioEnabled] = useState(false);

  const fetchComposioStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/composio/status');
      const data = await r.json();
      setComposioEnabled(data.enabled);
      if (data.enabled) {
        const tr = await fetch('/api/composio/toolkits');
        const tData = await tr.json();
        const connections: ComposioConnection[] = (tData.toolkits || []).map((t: any) => ({
          slug: t.slug,
          displayName: t.displayName,
          connected: t.connections.some((c: any) => c.status === 'ACTIVE'),
          connectionId: t.connections.find((c: any) => c.status === 'ACTIVE')?.id,
        }));
        setComposioConnections(connections);

        // Fetch dynamic tools for active connections
        const allDynamicTools: Tool[] = [];
        for (const conn of connections) {
          if (conn.connected) {
            try {
              const toolsResp = await fetch(`/api/composio/toolkit-tools/${conn.slug}`);
              if (toolsResp.ok) {
                const toolsData = await toolsResp.json();
                const mapped = (toolsData.tools || []).map((t: any) => {
                  const frontendId = `composio_${t.name.toLowerCase()}`;
                  return {
                    id: frontendId,
                    name: t.name
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c: string) => c.toUpperCase()),
                    description: t.description || '',
                    enabled: false, // will merge below
                    toolkit: conn.slug,
                    toolkitDisplayName: conn.displayName,
                    parameters: t.parameters,
                  };
                });
                allDynamicTools.push(...mapped);
              }
            } catch (err) {
              console.error(`Failed to load dynamic tools for ${conn.slug}`, err);
            }
          }
        }

        // Merge with existing tools to preserve 'enabled' state
        if (allDynamicTools.length > 0) {
          setComposioTools((prev) => {
            const merged = allDynamicTools.map((newTool) => {
              const existing = prev.find((p) => p.id === newTool.id);
              return existing ? { ...newTool, enabled: existing.enabled } : newTool;
            });
            // Also keep any hardcoded tools that might not be connected yet so they show in list
            const notConnectedCurated = prev.filter(
              (p) => !connections.some((conn) => conn.slug === p.toolkit && conn.connected)
            );
            return [...merged, ...notConnectedCurated];
          });
        }
      }
    } catch {}
  }, []);

  const toggleComposioTool = useCallback((toolId: string) => {
    setComposioTools((prev) =>
      prev.map((t) => (t.id === toolId ? { ...t, enabled: !t.enabled } : t))
    );
  }, []);

  const toggleAllToolsForToolkit = useCallback((slug: string, enabled: boolean) => {
    setComposioTools((prev) =>
      prev.map((t) => (t.toolkit === slug ? { ...t, enabled } : t))
    );
  }, []);

  return {
    composioTools,
    setComposioTools,
    composioConnections,
    setComposioConnections,
    composioEnabled,
    setComposioEnabled,
    fetchComposioStatus,
    toggleComposioTool,
    toggleAllToolsForToolkit,
  };
}
