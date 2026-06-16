import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { 
  Folder, FolderOpen, FileText, RefreshCw, Trash2, 
  Code, Hash, Zap, FileCode, Braces, BookOpen, Edit3, ChevronRight, ChevronDown, 
  FilePlus, FolderPlus, Copy, FolderTree, X, Search
} from 'lucide-react';
import { invokeTauri, isTauriDesktop } from '../utils/tauriDesktop';

// ==================== TYPES ====================
export interface TreeNode {
  id: string;            // uuid or relative path
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  path: string;          // absolute file path
  children?: TreeNode[]; // recursive folders
  isOpen?: boolean;      // expand collapse
  isRenaming?: boolean;
  isCreatingType?: 'file' | 'folder';
  depth: number;
  agentId?: string;      // subagent that created this file
  agentStatus?: 'done' | 'pending' | 'needs_review';  // attribution status
}

interface ContextMenuState {
  x: number;
  y: number;
  node: TreeNode;
}

interface ExplorerToast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface FileAgentAttribution {
  relativePath: string;
  agentId: string;
  status: 'done' | 'pending' | 'needs_review';
}

interface CoderLeftExplorerProps {
  workspaceRefreshKey: number;
  triggerWorkspaceRefresh: () => void;
  showToast: (msg: string) => void;
  workspaceRootPath: string;
  onWorkspaceRootPathChange: (path: string) => void;
  onSelectFile: (filePath: string) => void;
  fileAttributions?: FileAgentAttribution[];
  onClose?: () => void;
}

// Lightweight random UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Detemine parent relative path from file path
const getParentPath = (relPath: string): string | null => {
  const parts = relPath.split('/').filter(Boolean);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('/');
};

// Determine file icon and theme-specific color classes
const getFileIcon = (name: string, type: 'file' | 'folder', isOpen: boolean = false) => {
  if (type === 'folder') {
    return isOpen 
      ? <FolderOpen size={15} className="text-[#dcb67a] shrink-0" />
      : <Folder size={15} className="text-[#dcb67a] shrink-0" />;
  }
  
  const ext = name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'html': 
      return <Code size={14} className="text-[#e37933] shrink-0" />;
    case 'css': 
      return <Hash size={14} className="text-[#3b82f6] shrink-0" />;
    case 'js': 
    case 'jsx': 
      return <Zap size={14} className="text-[#eab308] shrink-0" />;
    case 'ts': 
    case 'tsx': 
      return <FileCode size={14} className="text-[#2563eb] shrink-0" />;
    case 'json': 
      return <Braces size={14} className="text-[#dbbb8e] shrink-0" />;
    case 'md': 
      return <BookOpen size={14} className="text-[#a1a1aa] shrink-0" />;
    case 'py': 
      return <FileCode size={14} className="text-[#22c55e] shrink-0" />;
    default: 
      return <FileText size={14} className="text-[#cccccc] shrink-0" />;
  }
};

// ==================== RECURSIVE FILE TREE ITEM VUE / COMPONENT ====================
interface FileTreeItemProps {
  node: TreeNode;
  onSelect: (node: TreeNode, e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  selectedId: string | null;
  dragOverId: string | null;
  flashingId: string | null;
  onToggleExpand: (node: TreeNode) => void;
  onDragStart: (e: React.DragEvent, node: TreeNode) => void;
  onDragOver: (e: React.DragEvent, node: TreeNode) => void;
  onDrop: (e: React.DragEvent, node: TreeNode) => void;
  triggerCreateInside: (node: TreeNode, type: 'file' | 'folder') => void;
  triggerRename: (node: TreeNode) => void;
  triggerDelete: (node: TreeNode) => void;
  renamingId: string | null;
  creatingState: any;
  inputValue: string;
  onChangeInput: (val: string, isRename: boolean, node: TreeNode) => void;
  onConfirmRename: (node: TreeNode) => void;
  onConfirmCreate: (parentId: string | null, type: 'file' | 'folder') => void;
  onCancelAction: () => void;
  validationError: string | null;
}

const FileTreeItem: React.FC<FileTreeItemProps> = React.memo(({
  node,
  onSelect,
  onContextMenu,
  selectedId,
  dragOverId,
  flashingId,
  onToggleExpand,
  onDragStart,
  onDragOver,
  onDrop,
  triggerCreateInside,
  triggerRename,
  triggerDelete,
  renamingId,
  creatingState,
  inputValue,
  onChangeInput,
  onConfirmRename,
  onConfirmCreate,
  onCancelAction,
  validationError
}) => {
  const isSelected = selectedId === node.id;
  const isDragOver = dragOverId === node.id;
  const isFlashing = flashingId === node.id;
  const isRenamingActive = renamingId === node.id;
  const isCreatingActive = node.id === 'temp-creation-node';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenamingActive || isCreatingActive) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenamingActive, isCreatingActive]);

  const handleRowClick = (e: React.MouseEvent) => {
    onSelect(node, e);
  };

  const handleArrowToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(node);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      if (isRenamingActive) {
        onConfirmRename(node);
      } else if (isCreatingActive) {
        onConfirmCreate(node.parentId, node.isCreatingType!);
      }
    } else if (e.key === 'Escape') {
      onCancelAction();
    }
  };

  const handleInputBlur = () => {
    // Commit on blur
    if (isRenamingActive) {
      onConfirmRename(node);
    } else if (isCreatingActive) {
      onConfirmCreate(node.parentId, node.isCreatingType!);
    }
  };

  return (
    <div className="w-full relative select-none">
      {/* Visual Row Container */}
      <div
        draggable={!isRenamingActive && !isCreatingActive}
        onDragStart={(e) => onDragStart(e, node)}
        onDragOver={(e) => onDragOver(e, node)}
        onDrop={(e) => onDrop(e, node)}
        onClick={handleRowClick}
        onContextMenu={(e) => onContextMenu(e, node)}
        onDoubleClick={() => node.type === 'folder' ? onToggleExpand(node) : null}
        className={`w-full flex items-center justify-between group h-[22px] px-2 text-[13px] font-sans transition-colors duration-150 relative cursor-pointer border-l-2
          ${isSelected ? 'bg-[#252526] text-[#F3F3F3] border-l-[#C5C5C5]' : 'border-l-transparent text-[#CCCCCC] hover:bg-[#2A2D2E]'}
          ${isDragOver && node.type === 'folder' ? 'border-2 border-dashed border-[#6A6A6A] bg-[#252526]' : ''}
          ${isFlashing ? 'bg-[#37373D] animate-pulse' : ''}
        `}
        style={{ paddingLeft: `${node.depth * 12 + 4}px` }}
      >
        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
          {/* Chevron expand trigger */}
          {node.type === 'folder' ? (
            <button
              onClick={handleArrowToggle}
              className="p-0.5 hover:bg-[#2A2D2E] rounded text-[#8C8C8C] hover:text-[#F3F3F3] flex items-center justify-center cursor-pointer"
            >
              <div className={`transition-transform duration-150 ${node.isOpen ? 'rotate-90' : 'rotate-0'}`}>
                <ChevronRight size={13} strokeWidth={2.5} />
              </div>
            </button>
          ) : (
            <div className="w-[17px] h-[17px]" />
          )}

          {/* Agent attribution dot */}
          {node.agentId && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: node.agentStatus === 'done' ? '#4ade80' :
                                 node.agentStatus === 'needs_review' ? '#f87171' : '#c8a86b'
              }}
              title={`Created by ${node.agentId}${node.agentStatus === 'pending' ? ' (pending integration)' : node.agentStatus === 'needs_review' ? ' (needs review)' : ' (verified)'}`}
            />
          )}

          {/* Icon */}
          {getFileIcon(node.name, node.type, node.isOpen)}

          {/* Label or Form entry fields */}
          {isRenamingActive || isCreatingActive ? (
            <div className="relative flex items-center h-full">
              <input
                ref={inputRef}
                value={inputValue}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                onChange={(e) => onChangeInput(e.target.value, isRenamingActive, node)}
                placeholder={isCreatingActive ? (node.isCreatingType === 'folder' ? 'folder' : 'file') : ''}
                className="bg-[#1E1E1E] border border-[#5A5A5A] text-[#F3F3F3] text-[13px] h-[18px] px-1 outline-none w-36 font-sans select-text rounded-sm placeholder-[#6A6A6A]"
              />
              {validationError && (
                <div className="absolute left-0 top-[19px] z-[999] bg-[#3A1F1F] border border-[#C75D5D] text-[#F3D5D1] text-[11px] px-1.5 py-0.5 shadow-xl whitespace-nowrap font-sans rounded-sm">
                  {validationError}
                </div>
              )}
            </div>
          ) : (
            <span className="truncate whitespace-nowrap select-none">{node.name}</span>
          )}
        </div>

        {/* Action button triggers - only visible on hover */}
        {!isRenamingActive && !isCreatingActive && (
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1 text-[#A89F93]">
            {node.type === 'folder' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); triggerCreateInside(node, 'file'); }}
                  title="New File..."
                  className="p-0.5 hover:bg-[#2A2D2E] hover:text-[#F3F3F3] rounded"
                >
                  <FilePlus size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); triggerCreateInside(node, 'folder'); }}
                  title="New Folder..."
                  className="p-0.5 hover:bg-[#2A2D2E] hover:text-[#F3F3F3] rounded"
                >
                  <FolderPlus size={13} />
                </button>
              </>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); triggerRename(node); }}
              title="Rename (F2)"
              className="p-0.5 hover:bg-[#2A2D2E] hover:text-[#F3F3F3] rounded"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); triggerDelete(node); }}
              title={node.type === 'folder' ? "Delete Directory..." : "Delete File"}
              className="p-0.5 hover:bg-[#2A2D2E] hover:text-[#E57373] rounded"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Recursive Render children */}
      {node.type === 'folder' && node.isOpen && node.children && (
        <div className="relative w-full">
          {/* Vertical Guide Line */}
          <div 
            className="absolute top-0 bottom-0 border-l border-[#252526]" 
            style={{ left: `${node.depth * 12 + 12}px` }} 
          />
          {node.children.map(child => (
            <FileTreeItem
              key={child.id}
              node={child}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              selectedId={selectedId}
              dragOverId={dragOverId}
              flashingId={flashingId}
              onToggleExpand={onToggleExpand}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              triggerCreateInside={triggerCreateInside}
              triggerRename={triggerRename}
              triggerDelete={triggerDelete}
              renamingId={renamingId}
              creatingState={creatingState}
              inputValue={inputValue}
              onChangeInput={onChangeInput}
              onConfirmRename={onConfirmRename}
              onConfirmCreate={onConfirmCreate}
              onCancelAction={onCancelAction}
              validationError={validationError}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ==================== CORE CODER EXPLORER PANEL ====================
const CoderLeftExplorerComponent: React.FC<CoderLeftExplorerProps> = ({
  workspaceRefreshKey,
  triggerWorkspaceRefresh,
  showToast: parentShowToast,
  workspaceRootPath,
  onWorkspaceRootPathChange,
  onSelectFile,
  fileAttributions,
  onClose
}) => {
  const [flatFiles, setFlatFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  
  // Selection and folder states
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  
  // Interactive modification states
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [creatingState, setCreatingState] = useState<{ parentId: string | null; type: 'file' | 'folder' } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Folder confirm inline dialog overlay state
  const [pendingDeleteNode, setPendingDeleteNode] = useState<TreeNode | null>(null);
  
  // Drag and drop states
  const [dragSourceNode, setDragSourceNode] = useState<TreeNode | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [flashingId, setFlashingId] = useState<string | null>(null);
  
  // Floating context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fetchRequestIdRef = useRef(0);
  
  // Local Lightweight Toasts
  const [toasts, setToasts] = useState<ExplorerToast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = generateUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  }, []);

  // Fetch file list recursively from actual file system
  const fetchWorkspace = useCallback(async () => {
    if (!workspaceRootPath) return;
    setIsLoading(true);
    const requestId = ++fetchRequestIdRef.current;
    try {
      const response = await fetch('/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: workspaceRootPath })
      });
      if (response.ok) {
        const data = await response.json();
        const files = (data?.files || []).filter((f: any) => {
          // Exclude dot-folders or specific project configs to keep layout pure, or keep everything
          return f.relativePath !== '';
        });
        if (requestId === fetchRequestIdRef.current) {
          setFlatFiles(files);
        }
      }
    } catch (e) {
      console.error(e);
      addToast("Failed to fetch project files", "error");
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [addToast, workspaceRootPath]);

  useEffect(() => {
    if (workspaceRootPath) {
      fetchWorkspace();
    }
  }, [workspaceRefreshKey, fetchWorkspace, workspaceRootPath]);

  // Construct standard recursive Tree structure based on flat backend files
  const treeStructure = useMemo(() => {
    const nodeMap: Record<string, TreeNode> = {};
    
    // Build attribution lookup
    const attributionMap = new Map<string, FileAgentAttribution>();
    if (fileAttributions) {
      fileAttributions.forEach(a => {
        attributionMap.set(a.relativePath, a);
      });
    }

    // 1. Build dictionary mapping keys to items
    flatFiles.forEach(f => {
      const parentId = getParentPath(f.relativePath);
      const attr = attributionMap.get(f.relativePath);
      nodeMap[f.relativePath] = {
        id: f.relativePath,
        name: f.name,
        type: f.isDirectory ? 'folder' : 'file',
        parentId,
        path: f.path,
        isOpen: expandedPaths.has(f.relativePath),
        isRenaming: renamingId === f.relativePath,
        depth: f.relativePath.split('/').filter(Boolean).length - 1,
        children: f.isDirectory ? [] : undefined,
        ...(attr ? { agentId: attr.agentId, agentStatus: attr.status } : {})
      };
    });

    // 2. Insert inline temp creations row if active
    if (creatingState) {
      const tempId = 'temp-creation-node';
      const depth = creatingState.parentId ? creatingState.parentId.split('/').filter(Boolean).length : 0;
      nodeMap[tempId] = {
        id: tempId,
        name: '',
        type: creatingState.type,
        parentId: creatingState.parentId,
        path: '',
        isOpen: false,
        isRenaming: false,
        isCreatingType: creatingState.type,
        depth,
        children: creatingState.type === 'folder' ? [] : undefined
      };
    }

    // 3. Chain parent and children nodes recursively, keeping order pure
    const roots: TreeNode[] = [];
    const keysSorted = Object.keys(nodeMap).sort((a, b) => {
      const na = nodeMap[a];
      const nb = nodeMap[b];
      
      // Inline creations always stay right at the top
      if (a === 'temp-creation-node') return -1;
      if (b === 'temp-creation-node') return 1;

      if (na.type !== nb.type) {
        return na.type === 'folder' ? -1 : 1;
      }
      return na.name.localeCompare(nb.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    keysSorted.forEach(key => {
      const node = nodeMap[key];
      if (node.parentId === null) {
        roots.push(node);
      } else {
        const parentNode = nodeMap[node.parentId];
        if (parentNode && parentNode.children) {
          parentNode.children.push(node);
        } else {
          roots.push(node);
        }
      }
    });

    return roots;
  }, [flatFiles, expandedPaths, renamingId, creatingState]);

  // Recursively calculate flat representation of visible tree items for Keyboard Navigation
  const visibleNodes = useMemo(() => {
    const list: TreeNode[] = [];
    const recurse = (arr: TreeNode[]) => {
      arr.forEach(node => {
        list.push(node);
        if (node.type === 'folder' && node.isOpen && node.children && node.children.length > 0) {
          recurse(node.children);
        }
      });
    };
    recurse(treeStructure);
    return list;
  }, [treeStructure]);

  // Handle validating file names
  const validateName = useCallback((name: string, parentId: string | null, originalName?: string): string | null => {
    if (!name.trim()) {
      return "Name cannot be empty";
    }
    if (name.includes('/') || name.includes('\\')) {
      return "Name cannot contain slashes";
    }
    if (originalName && name === originalName) {
      return null;
    }
    
    // Check siblings duplicates
    const siblings = flatFiles.filter(f => getParentPath(f.relativePath) === parentId);
    const duplicated = siblings.some(s => s.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicated) {
      return "A file or folder with this name already exists";
    }
    return null;
  }, [flatFiles]);

  // ==================== INTERACTION ACTION HANDLERS ====================
  
  const handleInputChange = useCallback((val: string, isRename: boolean, node: TreeNode) => {
    setInputValue(val);
    const parentId = isRename ? node.parentId : (creatingState ? creatingState.parentId : null);
    const error = validateName(val, parentId, isRename ? node.name : undefined);
    setValidationError(error);
  }, [validateName, creatingState]);

  const handleSelectNode = useCallback((node: TreeNode, e: React.MouseEvent) => {
    if (node.id === 'temp-creation-node') return;
    
    setSelectedId(node.id);
    if (node.type === 'file') {
      onSelectFile(node.path);
    } else {
      // Toggle expanded on simple click
      setExpandedPaths(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
  }, [onSelectFile]);

  const expandAncestors = useCallback((nodeId: string) => {
    const parts = nodeId.split('/').filter(Boolean);
    if (parts.length <= 1) return;
    setExpandedPaths(prev => {
      const next = new Set(prev);
      let current = '';
      for (let i = 0; i < parts.length - 1; i += 1) {
        current = current ? `${current}/${parts[i]}` : parts[i];
        next.add(current);
      }
      return next;
    });
  }, []);

  const handleToggleExpandDir = useCallback((node: TreeNode) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }, []);

  const handleCancelAction = useCallback(() => {
    setRenamingId(null);
    setCreatingState(null);
    setInputValue('');
    setValidationError(null);
  }, []);

  // Creation Actions
  const triggerCreateInside = useCallback((node: TreeNode, type: 'file' | 'folder') => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      next.add(node.id);
      return next;
    });
    setCreatingState({ parentId: node.id, type });
    setInputValue('');
    setValidationError(null);
  }, []);

  const triggerGlobalCreate = useCallback((type: 'file' | 'folder') => {
    // If a folder node is currently selected, create inside it. Otherwise, create at root!
    let parentId: string | null = null;
    if (selectedId) {
      const selNode = visibleNodes.find(n => n.id === selectedId);
      if (selNode) {
        parentId = selNode.type === 'folder' ? selNode.id : selNode.parentId;
      }
    }
    
    if (parentId) {
      setExpandedPaths(prev => {
        const next = new Set(prev);
        next.add(parentId!);
        return next;
      });
    }

    setCreatingState({ parentId, type });
    setInputValue('');
    setValidationError(null);
  }, [selectedId, visibleNodes]);

  const handleConfirmCreate = useCallback(async (parentId: string | null, type: 'file' | 'folder') => {
    const name = inputValue.trim();
    const error = validateName(name, parentId);
    if (error) {
      setValidationError(error);
      return;
    }

    const targetRelPath = parentId ? `${parentId}/${name}` : name;
    const fullPath = `${workspaceRootPath}/${targetRelPath}`;
    const isFolder = type === 'folder';

    try {
      const res = await fetch(isFolder ? '/api/fs/create' : '/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: fullPath,
          isDirectory: isFolder,
          content: isFolder ? undefined : ''
        })
      });

      if (res.ok) {
        addToast(`Created ${type} '${name}'`, "success");
        setCreatingState(null);
        setInputValue('');
        setValidationError(null);
        
        triggerWorkspaceRefresh();
        
        if (!isFolder) {
          onSelectFile(fullPath);
          setSelectedId(targetRelPath);
        } else {
          // Expand new directory implicitly
          setExpandedPaths(prev => {
            const next = new Set(prev);
            next.add(targetRelPath);
            return next;
          });
          setSelectedId(targetRelPath);
        }
      } else {
        const d = await res.json();
        addToast(d.error || "Failed to create node", "error");
      }
    } catch {
      addToast("Failed to create", "error");
    }
  }, [inputValue, validateName, addToast, onSelectFile, triggerWorkspaceRefresh, workspaceRootPath]);

  // Rename Actions
  const triggerRename = useCallback((node: TreeNode) => {
    setRenamingId(node.id);
    setInputValue(node.name);
    setValidationError(null);
  }, []);

  const handleConfirmRename = useCallback(async (node: TreeNode) => {
    const name = inputValue.trim();
    const error = validateName(name, node.parentId, node.name);
    if (error) {
      setValidationError(error);
      return;
    }

    if (name === node.name) {
      setRenamingId(null);
      return;
    }

    const oldPath = node.path || `${workspaceRootPath}/${node.id}`;
    const parentDir = node.path ? node.path.substring(0, node.path.lastIndexOf('/')) : (workspaceRootPath ? `${workspaceRootPath}/${node.parentId || ''}` : '');
    const newPath = `${parentDir}/${name}`;
    const newRelativePath = node.parentId ? `${node.parentId}/${name}` : name;

    try {
      const res = await fetch('/api/fs/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath })
      });

      if (res.ok) {
        addToast(`Renamed ${node.name} to '${name}'`, "success");
        setRenamingId(null);
        setInputValue('');
        setValidationError(null);
        
        setSelectedId(newRelativePath);
        triggerWorkspaceRefresh();
      } else {
        const d = await res.json();
        addToast(d.error || "Failed to rename", "error");
      }
    } catch {
      addToast("Rename failed", "error");
    }
  }, [inputValue, validateName, addToast, triggerWorkspaceRefresh, workspaceRootPath]);

  // Deletion Actions
  const triggerDelete = useCallback((node: TreeNode) => {
    if (node.type === 'file') {
      // Immediate clean deletion
      confirmDeleteFile(node);
    } else {
      // Inline confirmation block
      setPendingDeleteNode(node);
    }
  }, []);

  const confirmDeleteFile = async (node: TreeNode) => {
    try {
      const res = await fetch('/api/fs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: node.path })
      });

      if (res.ok) {
        addToast(`Deleted ${node.name}`, "success");
        if (selectedId === node.id) {
          setSelectedId(null);
        }
        triggerWorkspaceRefresh();
      } else {
        const d = await res.json();
        addToast(d.error || "Failed to delete", "error");
      }
    } catch {
      addToast("Error deleting file", "error");
    }
  };

  const confirmDeleteFolder = async () => {
    if (!pendingDeleteNode) return;
    const node = pendingDeleteNode;

    try {
      const res = await fetch('/api/fs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: node.path })
      });

      if (res.ok) {
        addToast(`Deleted directory '${node.name}'`, "success");
        
        // Wipe selection inside directory
        if (selectedId && (selectedId === node.id || selectedId.startsWith(node.id + '/'))) {
          setSelectedId(null);
        }

        // Wipe expanded state
        setExpandedPaths(prev => {
          const next = new Set(prev);
          next.delete(node.id);
          Array.from(next).forEach(p => {
            if (p.startsWith(node.id + '/')) next.delete(p);
          });
          return next;
        });

        triggerWorkspaceRefresh();
      } else {
        const d = await res.json();
        addToast(d.error || "Failed to delete directory", "error");
      }
    } catch {
      addToast("Error deleting directory", "error");
    } finally {
      setPendingDeleteNode(null);
    }
  };

  // Keyboard navigation listener
  const handleTreeKeyDown = (e: React.KeyboardEvent) => {
    if (renamingId || creatingState) {
      if (e.key === 'Escape') {
        handleCancelAction();
        e.preventDefault();
      }
      return;
    }

    const currentIndex = visibleNodes.findIndex(n => n.id === selectedId);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (visibleNodes.length === 0) return;
        let nextIndex = currentIndex + 1;
        if (nextIndex >= visibleNodes.length) nextIndex = 0;
        const nextNode = visibleNodes[nextIndex];
        setSelectedId(nextNode.id);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (visibleNodes.length === 0) return;
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = visibleNodes.length - 1;
        const prevNode = visibleNodes[prevIndex];
        setSelectedId(prevNode.id);
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (selectedId) {
          const node = visibleNodes.find(n => n.id === selectedId);
          if (node && node.type === 'folder') {
            if (!node.isOpen) {
              setExpandedPaths(prev => new Set([...prev, node.id]));
            } else if (node.children && node.children.length > 0) {
              setSelectedId(node.children[0].id);
            }
          }
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (selectedId) {
          const node = visibleNodes.find(n => n.id === selectedId);
          if (node) {
            if (node.type === 'folder' && node.isOpen) {
              setExpandedPaths(prev => {
                const next = new Set(prev);
                next.delete(node.id);
                return next;
              });
            } else if (node.parentId) {
              setSelectedId(node.parentId);
            }
          }
        }
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (selectedId) {
          const node = visibleNodes.find(n => n.id === selectedId);
          if (node) {
            if (node.type === 'folder') {
              handleToggleExpandDir(node);
            } else {
              onSelectFile(node.path);
            }
          }
        }
        break;
      }
      case 'F2': {
        e.preventDefault();
        if (selectedId) {
          const node = visibleNodes.find(n => n.id === selectedId);
          if (node) triggerRename(node);
        }
        break;
      }
      case 'Delete': {
        e.preventDefault();
        if (selectedId) {
          const node = visibleNodes.find(n => n.id === selectedId);
          if (node) triggerDelete(node);
        }
        break;
      }
      default:
        break;
    }
  };

  // ==================== DRAG AND DROP HANDLERS ====================
  
  const isDescendant = (parentPath: string, testPath: string): boolean => {
    if (parentPath === testPath) return true;
    return testPath.startsWith(parentPath + '/');
  };

  const handleDragStart = (e: React.DragEvent, node: TreeNode) => {
    if (node.id === 'temp-creation-node') {
      e.preventDefault();
      return;
    }
    setDragSourceNode(node);
    e.dataTransfer.setData('text/plain', node.id);
    
    // Set a sleek drag image
    const dragGhost = document.createElement('div');
    dragGhost.className = 'bg-[#252526] text-white px-3 py-1 border border-[#007fd4] text-xs font-sans absolute top-[-100px] z-50';
    dragGhost.innerText = node.name;
    document.body.appendChild(dragGhost);
    e.dataTransfer.setDragImage(dragGhost, 0, 0);
    setTimeout(() => dragGhost.remove(), 0);
  };

  const handleDragOver = (e: React.DragEvent, targetNode: TreeNode) => {
    e.preventDefault();
    if (!dragSourceNode || dragSourceNode.id === targetNode.id) return;

    // Highlight target folder or target parent folder if dragging over a file
    const highlightId = targetNode.type === 'folder' ? targetNode.id : targetNode.parentId;
    setDragOverId(highlightId);
  };

  const handleDropItem = async (e: React.DragEvent, targetNode: TreeNode | 'root') => {
    e.preventDefault();
    setDragOverId(null);
    if (!dragSourceNode) return;

    // Destination parent directory calculation
    let targetParentId: string | null = null;
    if (targetNode !== 'root') {
      targetParentId = targetNode.type === 'folder' ? targetNode.id : targetNode.parentId;
    }

    if (dragSourceNode.parentId === targetParentId) {
      return; // static
    }

    // Cyclic Move guard
    if (dragSourceNode.type === 'folder' && targetParentId && isDescendant(dragSourceNode.id, targetParentId)) {
      addToast("Cannot move a folder inside itself or its descendants", "error");
      return;
    }

    const oldPath = dragSourceNode.path || `${workspaceRootPath}/${dragSourceNode.id}`;
    let newPath: string;
    if (targetNode !== 'root') {
      const targetDirPath = targetNode.type === 'folder' ? targetNode.path : (targetNode.path ? targetNode.path.substring(0, targetNode.path.lastIndexOf('/')) : '');
      newPath = `${targetDirPath}/${dragSourceNode.name}`;
    } else {
      const newRelative = dragSourceNode.name;
      newPath = workspaceRootPath ? `${workspaceRootPath}/${newRelative}` : newRelative;
    }

    try {
      const res = await fetch('/api/fs/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath })
      });

      if (res.ok) {
        addToast(`Moved ${dragSourceNode.name} to target location`, "success");
        const flashRel = targetParentId ? `${targetParentId}/${dragSourceNode.name}` : dragSourceNode.name;
        setFlashingId(flashRel);
        setTimeout(() => setFlashingId(null), 1500);

        // Expand target folder automatically on drop
        if (targetParentId) {
          setExpandedPaths(prev => {
            const next = new Set(prev);
            next.add(targetParentId!);
            return next;
          });
        }

        triggerWorkspaceRefresh();
      } else {
        const d = await res.json();
        addToast(d.error || "Failed to drop move item", "error");
      }
    } catch {
      addToast("Drop operation failed", "error");
    } finally {
      setDragSourceNode(null);
    }
  };

  // ==================== FLOATING CONTEXT MENU ====================
  
  const handleOpenContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedId(node.id);

    // Keep the menu inside the viewport and nudge it inward near edges.
    const w = 200;
    const h = 210;
    const margin = 12;
    let x = e.clientX;
    let y = e.clientY;

    if (x + w > window.innerWidth - margin) x = window.innerWidth - w - margin;
    if (y + h > window.innerHeight - margin) y = window.innerHeight - h - margin;
    if (x < margin) x = margin;
    if (y < margin) y = margin;

    setContextMenu({ x, y, node });
  };

  useEffect(() => {
    const hideMenu = () => setContextMenu(null);
    window.addEventListener('click', hideMenu);
    window.addEventListener('scroll', hideMenu, true);
    return () => {
      window.removeEventListener('click', hideMenu);
      window.removeEventListener('scroll', hideMenu, true);
    };
  }, []);

  const handleCopyPath = (node: TreeNode) => {
    navigator.clipboard.writeText(node.path);
    addToast("Copied absolute path to clipboard", "success");
  };

  const handleCopyRelativePath = (node: TreeNode) => {
    navigator.clipboard.writeText(node.id);
    addToast("Copied relative path to clipboard", "success");
  };

  // ==================== TOP NAVIGATION TOOLBAR CONTROLS ====================
  
  const handleCollapseAll = () => {
    setExpandedPaths(new Set());
    addToast("Collapsed all tree folders", "info");
  };

  const handleRefreshWorkspace = () => {
    fetchWorkspace();
    addToast("Refreshed workspace file tree", "info");
  };

  const handleOpenFolder = useCallback(async () => {
    const electronAPI = (window as any).__electronAPI;
    if (electronAPI?.openFolderDialog) {
      const folderPath = await electronAPI.openFolderDialog();
      if (folderPath) {
        onWorkspaceRootPathChange(folderPath);
        setExpandedPaths(new Set());
        setSelectedId(null);
        addToast(`Opened folder: ${folderPath}`, "success");
        triggerWorkspaceRefresh();
      }
    } else if (isTauriDesktop()) {
      try {
        const folderPath = await invokeTauri<string | null>('open_folder_dialog');
        if (folderPath) {
          onWorkspaceRootPathChange(folderPath);
          setExpandedPaths(new Set());
          setSelectedId(null);
          addToast(`Opened folder: ${folderPath}`, "success");
          triggerWorkspaceRefresh();
        }
      } catch (error) {
        console.error('Failed to open Tauri folder dialog:', error);
        addToast("Could not open the folder dialog.", "error");
      }
    } else {
      addToast("Open Folder is only available in the desktop app", "info");
    }
  }, [addToast, triggerWorkspaceRefresh, onWorkspaceRootPathChange]);

  // ==================== FUZZY SEARCH MATCH RENDERERS ====================
  
  const searchResults = useMemo(() => {
    if (!deferredSearchQuery.trim()) return [];
    const q = deferredSearchQuery.toLowerCase();
    
    // Filter matching results
    const matches = flatFiles
      .filter(f =>
        f.name.toLowerCase().includes(q) ||
        String(f.relativePath || '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStarts = aName.startsWith(q) ? 0 : 1;
        const bStarts = bName.startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return String(a.relativePath || '').localeCompare(String(b.relativePath || ''), undefined, { numeric: true, sensitivity: 'base' });
      })
      .slice(0, 150);
    
    return matches.map(f => {
      const parentId = getParentPath(f.relativePath);
      return {
        id: f.relativePath,
        name: f.name,
        type: f.isDirectory ? 'folder' as const : 'file' as const,
        parentId,
        path: f.path,
        depth: 0
      };
    });
  }, [deferredSearchQuery, flatFiles]);

  const renderHighlightedText = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;

    const b = text.substring(0, idx);
    const m = text.substring(idx, idx + query.length);
    const a = text.substring(idx + query.length);

    return (
      <span className="truncate">
        {b}
        <span className="bg-[#D97756]/30 text-[#EDE6DD] px-0.5 rounded-sm">{m}</span>
        {a}
      </span>
    );
  };

  return (
    <div 
      tabIndex={0}
      onKeyDown={handleTreeKeyDown}
      className="flex-1 flex flex-col h-full bg-[#1E1E1E] select-none text-[#CCCCCC] font-sans overflow-hidden focus:outline-none"
    >
      {/* TOOLBAR */}
      <div className="flex items-center justify-between h-[30px] px-3 bg-[#1E1E1E] border-b border-[#2A2A2A] shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] tracking-wider font-medium uppercase text-[#CCCCCC]">
            Explorer
          </span>
          <span className="text-[9px] font-mono text-[#7D7D7D] truncate">
            {flatFiles.length} items
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[#8C8C8C]">
          <button 
            onClick={() => triggerGlobalCreate('file')}
            className="p-1 hover:bg-[#2A2D2E] hover:text-[#F3F3F3] rounded transition-colors cursor-pointer"
            title="New File..."
          >
            <FilePlus size={14} />
          </button>
          <button 
            onClick={() => triggerGlobalCreate('folder')}
            className="p-1 hover:bg-[#2A2D2E] hover:text-[#F3F3F3] rounded transition-colors cursor-pointer"
            title="New Folder..."
          >
            <FolderPlus size={14} />
          </button>
          <button 
            onClick={handleCollapseAll}
            className="p-1 hover:bg-[#2A2D2E] hover:text-[#F3F3F3] rounded transition-colors cursor-pointer"
            title="Collapse All Folders"
          >
            <FolderTree size={14} />
          </button>
          <button 
            onClick={handleRefreshWorkspace}
            className="p-1 hover:bg-[#2A2D2E] hover:text-[#F3F3F3] rounded transition-colors cursor-pointer"
            title="Refresh Explorer"
          >
            <RefreshCw size={13} />
          </button>
          <button 
            onClick={handleOpenFolder}
            className="p-1 hover:bg-[#2A2D2E] hover:text-[#F3F3F3] rounded transition-colors cursor-pointer"
            title="Open Folder (set workspace root)"
          >
            <FolderOpen size={13} />
          </button>
        </div>
      </div>

      {/* FILTER SEARCH AREA */}
      <div className="px-3.5 py-1.5 bg-[#1E1E1E] border-b border-[#2A2A2A] shrink-0">
        <div className="relative flex items-center bg-[#252526] border border-[#313131] focus-within:border-[#5A5A5A] transition-colors pl-2.5 h-[24px] rounded-sm">
          <Search size={12} className="text-[#7D7D7D] shrink-0 mr-1" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick Open files..."
            className="w-full bg-[#252526] outline-none border-none text-[12px] text-[#F3F3F3] placeholder-[#7D7D7D] h-full"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-1 text-[#8C8C8C] hover:text-[#F3F3F3] h-full flex items-center justify-center mr-1"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {workspaceRootPath && (
        <div className="px-3.5 py-2 border-b border-[#2A2A2A] bg-[#1E1E1E] shrink-0">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#7D7D7D] mb-1">Workspace</div>
          <div className="text-[11px] font-semibold text-[#FFFFFF] truncate" title={workspaceRootPath}>
            {workspaceRootPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || workspaceRootPath}
          </div>
        </div>
      )}

      {/* MAIN LIST TREE CONTENT */}
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar bg-[#1E1E1E] select-none py-1 relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDropItem(e, 'root')}
      >
        {isLoading && flatFiles.length === 0 ? (
          <div className="flex items-center gap-2 text-[12px] text-[#8C8C8C] px-4 py-3 font-sans">
            <RefreshCw size={12} className="animate-spin text-[#C5A46D]" />
            <span>Scanning workspace...</span>
          </div>
        ) : deferredSearchQuery.trim() !== '' ? (
          /* FUZZY SEARCH RESULTS RENDERING PANEL */
          searchResults.length === 0 ? (
            <div className="text-[12px] text-[#7D7D7D] italic px-4 py-4">
              No matching files found.
            </div>
          ) : (
            searchResults.map(match => (
              <div 
                key={match.id}
                onClick={() => {
                  setSelectedId(match.id);
                  expandAncestors(match.id);
                  if (match.type === 'file') onSelectFile(match.path);
                }}
                className={`flex flex-col py-1.5 px-3 border-b border-[#232220] cursor-pointer hover:bg-[#262522] 
                  ${selectedId === match.id ? 'bg-[#252526] text-[#F3F3F3] border-l-2 border-l-[#C5C5C5]' : 'text-[#CCCCCC] hover:bg-[#2A2D2E]'}
                `}
              >
                <div className="flex items-center gap-2">
                  {getFileIcon(match.name, match.type, false)}
                  <span className="text-[13px]">{renderHighlightedText(match.name, searchQuery)}</span>
                </div>
                <span className="text-[11px] text-[#7D7D7D] pl-5 truncate font-mono">
                  {match.id}
                </span>
              </div>
            ))
          )
        ) : !workspaceRootPath ? (
          <div className="flex flex-col items-center gap-3 text-center px-4 py-8">
            <div className="w-12 h-12 rounded-xl border border-[#2A2A2A] bg-[#252526] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-[#7D7D7D]">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="text-[12px] text-[#7D7D7D]">
              No folder open
            </div>
            <div className="flex flex-col gap-2 w-full px-2">
              <button
                onClick={handleOpenFolder}
                className="text-[11px] w-full py-1.5 rounded-md bg-[#252526] text-[#CCCCCC] border border-[#313131] hover:bg-[#2A2D2E] transition-all cursor-pointer font-medium"
              >
                Open Folder
              </button>
            </div>
          </div>
        ) : treeStructure.length === 0 ? (
          <div className="text-[11px] text-[#7D7D7D] italic px-4 py-4 text-center">
            Workspace is empty.<br/>
            <button 
              onClick={() => triggerGlobalCreate('file')}
              className="mt-2 text-[12px] text-[#D7BA7D] hover:underline font-semibold cursor-pointer"
            >
              Create first file
            </button>
          </div>
        ) : (
          /* STANDARD NESTED RECURSIVE TREE ITEM LISTS */
          treeStructure.map(node => (
            <FileTreeItem
              key={node.id}
              node={node}
              onSelect={handleSelectNode}
              onContextMenu={handleOpenContextMenu}
              selectedId={selectedId}
              dragOverId={dragOverId}
              flashingId={flashingId}
              onToggleExpand={handleToggleExpandDir}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDropItem}
              triggerCreateInside={triggerCreateInside}
              triggerRename={triggerRename}
              triggerDelete={triggerDelete}
              renamingId={renamingId}
              creatingState={creatingState}
              inputValue={inputValue}
              onChangeInput={handleInputChange}
              onConfirmRename={handleConfirmRename}
              onConfirmCreate={handleConfirmCreate}
              onCancelAction={handleCancelAction}
              validationError={validationError}
            />
          ))
        )}
      </div>

      {/* PORTALS LAYER - INLINE DELETE MODAL BANNER confirmation */}
      {pendingDeleteNode && createPortal(
        <div className="fixed inset-0 bg-zinc-950/75 z-[250] flex items-center justify-center p-4 animate-fade-in select-text">
          <div className="bg-[#252526] border border-[#313131] text-[#CCCCCC] p-4 w-full max-w-xs flex flex-col gap-4 shadow-2xl rounded-md">
            <div className="flex flex-col gap-2">
              <h4 className="text-[13px] font-bold text-[#E57373] flex items-center gap-1.5">
                <Trash2 size={15} /> Delete Directory?
              </h4>
              <p className="text-[12px] text-[#A0A0A0] leading-relaxed">
                Delete <strong className="text-[#FFFFFF] font-mono break-all bg-[#2A2D2E] px-1 rounded-sm">'{pendingDeleteNode.name}'</strong> and all its contents? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setPendingDeleteNode(null)}
                className="px-3 py-1.5 bg-[#2A2D2E] hover:bg-[#33373A] text-[#F3F3F3] text-[12px] font-medium transition-colors cursor-pointer rounded-md border border-[#313131]"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteFolder}
                className="px-3 py-1.5 bg-[#C75D5D] hover:bg-[#B84F4F] text-white text-[12px] font-medium transition-colors cursor-pointer rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PORTALS LAYER - FLOATING RIGHT-CLICK CONTEXT MENU CODES */}
      {contextMenu && createPortal(
        <div 
          ref={menuRef}
          className="fixed bg-[#252526] border border-[#313131] text-[#CCCCCC] shadow-2xl py-1 z-[1000] w-52 text-[13px] font-sans rounded-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node.type === 'folder' ? (
            <>
              <button 
                onClick={() => { setContextMenu(null); triggerCreateInside(contextMenu.node, 'file'); }} 
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#2A2D2E] text-[#F3F3F3] text-left cursor-pointer transition-colors"
              >
                <FilePlus size={14} className="text-[#635F59]" /> New File...
              </button>
              <button 
                onClick={() => { setContextMenu(null); triggerCreateInside(contextMenu.node, 'folder'); }} 
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#2A2D2E] text-[#F3F3F3] text-left cursor-pointer transition-colors"
              >
                <FolderPlus size={14} className="text-[#635F59]" /> New Folder...
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { setContextMenu(null); triggerCreateInside({ ...contextMenu.node, id: contextMenu.node.parentId || '' }, 'file'); }} 
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#2A2D2E] text-[#F3F3F3] text-left cursor-pointer transition-colors"
              >
                <FilePlus size={14} className="text-[#635F59]" /> New Sibling File...
              </button>
              <button 
                onClick={() => { setContextMenu(null); triggerCreateInside({ ...contextMenu.node, id: contextMenu.node.parentId || '' }, 'folder'); }} 
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#2A2D2E] text-[#F3F3F3] text-left cursor-pointer transition-colors"
              >
                <FolderPlus size={14} className="text-[#635F59]" /> New Sibling Folder...
              </button>
            </>
          )}
          <button 
            onClick={() => { setContextMenu(null); triggerRename(contextMenu.node); }} 
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#2A2D2E] text-[#F3F3F3] text-left cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2.5"><Edit3 size={14} className="text-[#7D7D7D]" /> Rename...</span>
            <span className="text-[10px] text-[#7D7D7D] font-mono pr-1">F2</span>
          </button>
          <button 
            onClick={() => { setContextMenu(null); triggerDelete(contextMenu.node); }} 
            className="w-full flex items-center justify-between px-3 py-1.5 hover:text-white hover:bg-[#C75D5D]/20 text-[#E57373] text-left cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2.5"><Trash2 size={14} /> Delete</span>
            <span className="text-[10px] text-[#E57373]/70 font-mono pr-1">Del</span>
          </button>
          <div className="my-1 border-t border-[#313131]" />
          <button 
            onClick={() => { setContextMenu(null); handleCopyPath(contextMenu.node); }} 
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#2A2D2E] text-[#F3F3F3] text-left cursor-pointer transition-colors"
          >
            <Copy size={14} className="text-[#7D7D7D]" /> Copy Full Path
          </button>
          <button 
            onClick={() => { setContextMenu(null); handleCopyRelativePath(contextMenu.node); }} 
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#2A2D2E] text-[#F3F3F3] text-left cursor-pointer transition-colors"
          >
            <Copy size={14} className="text-[#7D7D7D]" /> Copy Relative Path
          </button>
        </div>,
        document.body
      )}

      {/* PORTALS LAYER - FLOATING LIGHT TOASTS NOTIFICATIONS CODES */}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none select-text">
          {toasts.map(toast => {
            let bg = 'bg-[#252526] border-[#313131] text-[#cccccc]';
            let outline = 'border-[#313131]';
            let iconText = 'ℹ';
            
            if (toast.type === 'success') {
              bg = 'bg-[#1b2c1b] text-[#d0f0d0]';
              outline = 'border-green-800/40';
              iconText = '✓';
            } else if (toast.type === 'error') {
              bg = 'bg-[#3c1e1e] text-[#ffd0d0]';
              outline = 'border-red-800/40';
              iconText = '⚠';
            }
            
            return (
              <div 
                key={toast.id}
                className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2 hover:opacity-95 transition-opacity border ${outline} shadow-2xl ${bg} text-[13px] font-sans antialiased animate-fade-in`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold opacity-80">{iconText}</span>
                  <span>{toast.message}</span>
                </div>
                <button 
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="font-bold hover:text-white transition-colors cursor-pointer text-[14px] px-1 opacity-70 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}


    </div>
  );
};

export const CoderLeftExplorer = React.memo(CoderLeftExplorerComponent);
