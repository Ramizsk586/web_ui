<<<<<<< HEAD
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Folder, FolderOpen, FileText, RefreshCw, Trash2, Plus, Download, 
  Code, Hash, Zap, FileCode, Braces, BookOpen, Edit3, ChevronRight, ChevronDown, 
  FilePlus, FolderPlus, Copy, FolderTree, X, Search
} from 'lucide-react';

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
=======
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  File, 
  RefreshCw, 
  Trash2, 
  Plus, 
  FileText,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
>>>>>>> edfe5782ae67a28d62ff0a3536b43c1f073ce19a
}

interface CoderLeftExplorerProps {
  workspaceRefreshKey: number;
  triggerWorkspaceRefresh: () => void;
  showToast: (msg: string) => void;
  onSelectFile: (filePath: string) => void;
}

<<<<<<< HEAD
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
          ${isSelected ? 'bg-[#2C241E] text-[#EDE6DD] border-l-[#D97756]' : 'border-l-transparent text-[#AD9F91] hover:bg-[#262522]/70'}
          ${isDragOver && node.type === 'folder' ? 'border-2 border-dashed border-[#D97756]/60 bg-[#262522]/80' : ''}
          ${isFlashing ? 'bg-[#D97756]/20 animate-pulse' : ''}
        `}
        style={{ paddingLeft: `${node.depth * 12 + 4}px` }}
      >
        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
          {/* Chevron expand trigger */}
          {node.type === 'folder' ? (
            <button
              onClick={handleArrowToggle}
              className="p-0.5 hover:bg-[#262522]/80 rounded text-[#A89F93] hover:text-[#EDE6DD] flex items-center justify-center cursor-pointer"
            >
              <div className={`transition-transform duration-150 ${node.isOpen ? 'rotate-90' : 'rotate-0'}`}>
                <ChevronRight size={13} strokeWidth={2.5} />
              </div>
            </button>
          ) : (
            <div className="w-[17px] h-[17px]" />
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
                className="bg-[#1D1C1A] border border-[#D97756] text-[#EDE6DD] text-[13px] h-[18px] px-1 outline-none w-36 font-sans select-text rounded-sm placeholder-[#635F59]"
              />
              {validationError && (
                <div className="absolute left-0 top-[19px] z-[999] bg-[#3B1E1E] border border-[#E05A47] text-[#F3D5D1] text-[11px] px-1.5 py-0.5 shadow-xl whitespace-nowrap font-sans rounded-sm">
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
                  className="p-0.5 hover:bg-[#2C241E] hover:text-[#EDE6DD] rounded"
                >
                  <FilePlus size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); triggerCreateInside(node, 'folder'); }}
                  title="New Folder..."
                  className="p-0.5 hover:bg-[#2C241E] hover:text-[#EDE6DD] rounded"
                >
                  <FolderPlus size={13} />
                </button>
              </>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); triggerRename(node); }}
              title="Rename (F2)"
              className="p-0.5 hover:bg-[#2C241E] hover:text-[#EDE6DD] rounded"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); triggerDelete(node); }}
              title={node.type === 'folder' ? "Delete Directory..." : "Delete File"}
              className="p-0.5 hover:bg-[#2C241E] hover:text-[#E05A47] rounded"
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
            className="absolute top-0 bottom-0 border-l border-[#232220]" 
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
export const CoderLeftExplorer: React.FC<CoderLeftExplorerProps> = ({
  workspaceRefreshKey,
  triggerWorkspaceRefresh,
  showToast: parentShowToast,
  onSelectFile
}) => {
  const [flatFiles, setFlatFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection and folder states
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['.']));
  
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
=======
export const CoderLeftExplorer: React.FC<CoderLeftExplorerProps> = ({
  workspaceRefreshKey,
  triggerWorkspaceRefresh,
  showToast,
  onSelectFile
}) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchFiles = useCallback(async () => {
>>>>>>> edfe5782ae67a28d62ff0a3536b43c1f073ce19a
    setIsLoading(true);
    try {
      const response = await fetch('/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
<<<<<<< HEAD
        body: JSON.stringify({ folderPath: '.' })
      });
      if (response.ok) {
        const data = await response.json();
        const files = (data?.files || []).filter((f: any) => {
          // Exclude dot-folders or specific project configs to keep layout pure, or keep everything
          return f.relativePath !== '';
        });
        setFlatFiles(files);
      }
    } catch (e) {
      console.error(e);
      addToast("Failed to fetch project files", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceRefreshKey, fetchWorkspace]);

  // Construct standard recursive Tree structure based on flat backend files
  const treeStructure = useMemo(() => {
    const nodeMap: Record<string, TreeNode> = {};
    
    // 1. Build dictionary mapping keys to items
    flatFiles.forEach(f => {
      const parentId = getParentPath(f.relativePath);
      nodeMap[f.relativePath] = {
        id: f.relativePath,
        name: f.name,
        type: f.isDirectory ? 'folder' : 'file',
        parentId,
        path: f.path,
        isOpen: expandedPaths.has(f.relativePath),
        isRenaming: renamingId === f.relativePath,
        depth: f.relativePath.split('/').filter(Boolean).length - 1,
        children: f.isDirectory ? [] : undefined
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
    const fullPath = `./${targetRelPath}`;
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
  }, [inputValue, validateName, addToast, onSelectFile, triggerWorkspaceRefresh]);

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

    const oldPath = `./${node.id}`;
    const targetRelPath = node.parentId ? `${node.parentId}/${name}` : name;
    const newPath = `./${targetRelPath}`;

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
        
        setSelectedId(targetRelPath);
        triggerWorkspaceRefresh();
      } else {
        const d = await res.json();
        addToast(d.error || "Failed to rename", "error");
      }
    } catch {
      addToast("Rename failed", "error");
    }
  }, [inputValue, validateName, addToast, triggerWorkspaceRefresh]);

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
        body: JSON.stringify({ filePath: `./${node.id}` })
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
        body: JSON.stringify({ filePath: `./${node.id}` })
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

    const oldPath = `./${dragSourceNode.id}`;
    const newRelative = targetParentId ? `${targetParentId}/${dragSourceNode.name}` : dragSourceNode.name;
    const newPath = `./${newRelative}`;

    try {
      const res = await fetch('/api/fs/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath })
      });

      if (res.ok) {
        addToast(`Moved ${dragSourceNode.name} to target location`, "success");
        setFlashingId(newRelative);
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

    // Clamp boundaries
    const w = 200;
    const h = 210;
    let x = e.clientX;
    let y = e.clientY;

    if (x + w > window.innerWidth) x = window.innerWidth - w - 4;
    if (y + h > window.innerHeight) y = window.innerHeight - h - 4;

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

  // ==================== FUZZY SEARCH MATCH RENDERERS ====================
  
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    
    // Filter matching results
    const matches = flatFiles.filter(f => f.name.toLowerCase().includes(q));
    
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
  }, [flatFiles, searchQuery]);

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
      className="flex-1 flex flex-col h-full bg-[#11100F] select-none text-[#AD9F91] font-sans overflow-hidden focus:outline-none"
    >
      {/* TOOLBAR */}
      <div className="flex items-center justify-between h-[30px] px-3 bg-[#11100F] border-b border-[#232220] shrink-0 select-none">
        <span className="text-[10px] tracking-wider font-semibold uppercase text-[#A89F93]">
          EXPLORER
        </span>
        <div className="flex items-center gap-1.5 text-[#A89F93]">
          <button 
            onClick={() => triggerGlobalCreate('file')}
            className="p-1 hover:bg-[#262522] hover:text-[#EDE6DD] rounded transition-colors cursor-pointer"
            title="New File..."
          >
            <FilePlus size={14} />
          </button>
          <button 
            onClick={() => triggerGlobalCreate('folder')}
            className="p-1 hover:bg-[#262522] hover:text-[#EDE6DD] rounded transition-colors cursor-pointer"
            title="New Folder..."
          >
            <FolderPlus size={14} />
          </button>
          <button 
            onClick={handleCollapseAll}
            className="p-1 hover:bg-[#262522] hover:text-[#EDE6DD] rounded transition-colors cursor-pointer"
            title="Collapse All Folders"
          >
            <FolderTree size={14} />
          </button>
          <button 
            onClick={handleRefreshWorkspace}
            className="p-1 hover:bg-[#262522] hover:text-[#EDE6DD] rounded transition-colors cursor-pointer"
            title="Refresh Explorer"
          >
            <RefreshCw size={13} />
=======
        body: JSON.stringify({ folderPath: './coder' })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.files)) {
          const formattedFiles: FileNode[] = data.files.map((f: any) => ({
            name: f.name || f.path.split('/').pop(),
            path: f.path,
            isDirectory: f.isDirectory !== undefined ? f.isDirectory : !f.path.includes('.')
          }));
          setFiles(formattedFiles);
        } else {
          setFiles([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch workspace files:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [workspaceRefreshKey, fetchFiles]);

  const handleCreateNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const cleanName = newFileName.trim().replace(/^\/+/, '');
    const path = `./coder/${cleanName}`;
    try {
      const response = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path, content: `<!-- Code created in Lumina -->\n` })
      });
      if (response.ok) {
        showToast(`Created file: ${cleanName}`);
        setNewFileName('');
        setIsCreatingFile(false);
        triggerWorkspaceRefresh();
        onSelectFile(path);
      } else {
        showToast("Error creating file");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFile = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete this file? This cannot be undone.`)) return;
    try {
      const response = await fetch('/api/fs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      if (response.ok) {
        showToast(`Deleted file successfully.`);
        triggerWorkspaceRefresh();
      } else {
        showToast("Failed to delete file.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getRelativePath = (absolute: string) => {
    const parts = absolute.split('coder/');
    return parts.length > 1 ? parts[1] : absolute;
  };

  // Determine file icons based on file type
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
        return <span className="font-mono text-[9px] font-bold text-orange-500 shrink-0 w-3.5 h-3.5 flex items-center justify-center border border-orange-500/20 rounded bg-orange-500/5">5</span>;
      case 'css':
        return <span className="font-mono text-[9px] font-bold text-blue-400 shrink-0 w-3.5 h-3.5 flex items-center justify-center border border-blue-400/20 rounded bg-blue-400/5">C</span>;
      case 'js':
      case 'jsx':
        return <span className="font-mono text-[9px] font-bold text-yellow-500 shrink-0 w-3.5 h-3.5 flex items-center justify-center border border-yellow-500/20 rounded bg-yellow-500/5">JS</span>;
      case 'ts':
      case 'tsx':
        return <span className="font-mono text-[9px] font-bold text-sky-500 shrink-0 w-3.5 h-3.5 flex items-center justify-center border border-sky-500/20 rounded bg-sky-500/5">TS</span>;
      case 'json':
        return <span className="font-mono text-[9px] font-bold text-purple-400 shrink-0 w-3.5 h-3.5 flex items-center justify-center border border-purple-400/20 rounded bg-purple-400/5">{}</span>;
      default:
        return <FileText size={12} className="text-zinc-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141416] select-none text-zinc-300 font-sans overflow-hidden">
      {/* Sidebar Section Title */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-zinc-850 bg-[#161619] shrink-0">
        <span className="text-[10px] tracking-widest font-bold uppercase text-zinc-400">Workspace Files</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsCreatingFile(prev => !prev)}
            className="p-1 hover:bg-zinc-850 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Create New File"
          >
            <Plus size={13} />
          </button>
          <button 
            onClick={() => {
              fetchFiles();
              showToast("Workspace checked!");
            }}
            className="p-1 hover:bg-zinc-850 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Reload Workspace Directory"
          >
            <RefreshCw size={11} />
>>>>>>> edfe5782ae67a28d62ff0a3536b43c1f073ce19a
          </button>
        </div>
      </div>

<<<<<<< HEAD
      {/* FILTER SEARCH AREA */}
      <div className="px-3.5 py-1.5 bg-[#11100F] border-b border-[#232220] shrink-0">
        <div className="relative flex items-center bg-[#1D1C1A] border border-[#2C2B27] focus-within:border-[#D97756] transition-colors pl-2.5 h-[24px]">
          <Search size={12} className="text-[#635F59] shrink-0 mr-1" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search / Filter files..."
            className="w-full bg-[#1D1C1A] outline-none border-none text-[12px] text-[#EDE6DD] placeholder-[#635F59] h-full"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-1 text-[#A89F93] hover:text-[#EDE6DD] h-full flex items-center justify-center mr-1"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* MAIN LIST TREE CONTENT */}
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar bg-[#11100F] select-none py-1 relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDropItem(e, 'root')}
      >
        {isLoading && flatFiles.length === 0 ? (
          <div className="flex items-center gap-2 text-[12px] text-[#A89F93] px-4 py-3 font-sans">
            <RefreshCw size={12} className="animate-spin text-[#D97756]" />
            <span>Scanning workspace...</span>
          </div>
        ) : searchQuery.trim() !== '' ? (
          /* FUZZY SEARCH RESULTS RENDERING PANEL */
          searchResults.length === 0 ? (
            <div className="text-[12px] text-[#635F59] italic px-4 py-4">
              No matching files found.
            </div>
          ) : (
            searchResults.map(match => (
              <div 
                key={match.id}
                onClick={() => {
                  setSelectedId(match.id);
                  if (match.type === 'file') onSelectFile(match.path);
                }}
                className={`flex flex-col py-1.5 px-3 border-b border-[#232220] cursor-pointer hover:bg-[#262522] 
                  ${selectedId === match.id ? 'bg-[#2C241E] text-[#EDE6DD] border-l-2 border-l-[#D97756]' : 'text-[#AD9F91]'}
                `}
              >
                <div className="flex items-center gap-2">
                  {getFileIcon(match.name, match.type, false)}
                  <span className="text-[13px]">{renderHighlightedText(match.name, searchQuery)}</span>
                </div>
                <span className="text-[11px] text-[#635F59] pl-5 truncate font-mono">
                  {match.id}
                </span>
              </div>
            ))
          )
        ) : treeStructure.length === 0 ? (
          <div className="text-[11px] text-[#635F59] italic px-4 py-4 text-center">
            Workspace is empty.<br/>
            <button 
              onClick={() => triggerGlobalCreate('file')}
              className="mt-2 text-[12px] text-[#D97756] hover:underline font-semibold cursor-pointer"
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
      {pendingDeleteNode && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-3 animate-fade-in select-text">
          <div className="bg-[#1B1A18] border border-[#2A2925] text-[#AD9F91] p-4 w-full max-w-xs flex flex-col gap-4 shadow-2xl rounded-md">
            <div className="flex flex-col gap-2">
              <h4 className="text-[13px] font-bold text-[#E05A47] flex items-center gap-1.5">
                <Trash2 size={15} /> Delete Directory?
              </h4>
              <p className="text-[12px] text-[#635F59] leading-relaxed">
                Delete <strong className="text-[#EDE6DD] font-mono break-all bg-[#262522] px-1 rounded-sm">'{pendingDeleteNode.name}'</strong> and all its contents? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setPendingDeleteNode(null)}
                className="px-3 py-1.5 bg-[#262522] hover:bg-[#2C241E] text-[#EDE6DD] text-[12px] font-medium transition-colors cursor-pointer rounded-md border border-[#2C2B27]"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteFolder}
                className="px-3 py-1.5 bg-[#E05A47] hover:bg-[#C84F3E] text-white text-[12px] font-medium transition-colors cursor-pointer rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PORTALS LAYER - FLOATING RIGHT-CLICK CONTEXT MENU CODES */}
      {contextMenu && createPortal(
        <div 
          ref={menuRef}
          className="fixed bg-[#1B1A18] border border-[#2A2925] text-[#AD9F91] shadow-2xl py-1 z-[1000] w-52 text-[13px] font-sans rounded-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node.type === 'folder' ? (
            <>
              <button 
                onClick={() => { setContextMenu(null); triggerCreateInside(contextMenu.node, 'file'); }} 
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#262522] text-[#EDE6DD] text-left cursor-pointer transition-colors"
              >
                <FilePlus size={14} className="text-[#635F59]" /> New File...
              </button>
              <button 
                onClick={() => { setContextMenu(null); triggerCreateInside(contextMenu.node, 'folder'); }} 
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#262522] text-[#EDE6DD] text-left cursor-pointer transition-colors"
              >
                <FolderPlus size={14} className="text-[#635F59]" /> New Folder...
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { setContextMenu(null); triggerCreateInside({ ...contextMenu.node, id: contextMenu.node.parentId || '' }, 'file'); }} 
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#262522] text-[#EDE6DD] text-left cursor-pointer transition-colors"
              >
                <FilePlus size={14} className="text-[#635F59]" /> New Sibling File...
              </button>
              <button 
                onClick={() => { setContextMenu(null); triggerCreateInside({ ...contextMenu.node, id: contextMenu.node.parentId || '' }, 'folder'); }} 
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#262522] text-[#EDE6DD] text-left cursor-pointer transition-colors"
              >
                <FolderPlus size={14} className="text-[#635F59]" /> New Sibling Folder...
              </button>
            </>
          )}
          <button 
            onClick={() => { setContextMenu(null); triggerRename(contextMenu.node); }} 
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#262522] text-[#EDE6DD] text-left cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2.5"><Edit3 size={14} className="text-[#635F59]" /> Rename...</span>
            <span className="text-[10px] text-[#635F59] font-mono pr-1">F2</span>
          </button>
          <button 
            onClick={() => { setContextMenu(null); triggerDelete(contextMenu.node); }} 
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#262522]/80 hover:text-white hover:bg-[#E05A47]/20 text-[#E05A47] text-left cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2.5"><Trash2 size={14} /> Delete</span>
            <span className="text-[10px] text-[#E05A47]/70 font-mono pr-1">Del</span>
          </button>
          <div className="my-1 border-t border-[#2A2925]" />
          <button 
            onClick={() => { setContextMenu(null); handleCopyPath(contextMenu.node); }} 
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#262522] text-[#EDE6DD] text-left cursor-pointer transition-colors"
          >
            <Copy size={14} className="text-[#635F59]" /> Copy Full Path
          </button>
          <button 
            onClick={() => { setContextMenu(null); handleCopyRelativePath(contextMenu.node); }} 
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#262522] text-[#EDE6DD] text-left cursor-pointer transition-colors"
          >
            <Copy size={14} className="text-[#635F59]" /> Copy Relative Path
          </button>
        </div>,
        document.body
      )}

      {/* PORTALS LAYER - FLOATING LIGHT TOASTS NOTIFICATIONS CODES */}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none select-text">
          {toasts.map(toast => {
            let bg = 'bg-[#1e1e1e] border-[#3c3c3c] text-[#cccccc]';
            let outline = 'border-[#3c3c3c]';
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
=======
      {isCreatingFile && (
        <form onSubmit={handleCreateNewFile} className="p-3 border-b border-zinc-850 bg-zinc-900/40 shrink-0 gap-2 flex flex-col">
          <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">File Relative Path</span>
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. style.css or js/app.js"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="text-xs w-full bg-[#0b0b0c] border border-zinc-800 rounded px-2.5 py-1.5 text-white select-text focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[11px] px-3.5 py-1.5 rounded transition-colors shrink-0 cursor-pointer"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* VS Code styled tree viewer */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {/* Workspace directory tree block */}
        <div className="flex items-center gap-1 px-1 py-1 rounded hover:bg-zinc-900/50 cursor-pointer text-zinc-400 hover:text-white transition-colors"
             onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={13} className="text-zinc-500 fill-zinc-500/20" />
          <span className="text-xs font-semibold uppercase tracking-wider font-sans select-none truncate">coder (Workplace root)</span>
        </div>

        {isExpanded && (
          <div className="ml-4 pl-2 border-l border-zinc-850 mt-1 space-y-0.5">
            {isLoading ? (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 px-2 py-2">
                <RefreshCw size={10} className="animate-spin" />
                <span>Reading folder...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="text-[10px] text-zinc-500 italic px-2 py-4">
                No files. Add files using the '+' button!
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.path}
                  onClick={() => onSelectFile(file.path)}
                  className="flex items-center justify-between px-2 py-2 rounded-lg text-xs cursor-pointer hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors group/item"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {getFileIcon(file.name)}
                    <span className="truncate font-sans tracking-tight text-[12px]">{getRelativePath(file.path)}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFile(file.path, e)}
                    className="text-zinc-650 hover:text-red-400 p-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                    title="Delete File"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
>>>>>>> edfe5782ae67a28d62ff0a3536b43c1f073ce19a
    </div>
  );
};
