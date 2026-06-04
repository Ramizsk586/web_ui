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
        description: td.function.description,
        enabled: false,
        toolkit: tk.slug,
        toolkitDisplayName: tk.displayName,
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
