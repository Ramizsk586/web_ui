import React, { useState } from 'react';
import { 
  Folder, 
  Trash2, 
  Plus, 
  Search, 
  ChevronDown, 
  Clock, 
  MessageSquare, 
  X,
  PlusCircle,
  FolderPlus,
  Play,
  MoreVertical,
  Star,
  Pencil,
  Archive
} from 'lucide-react';
import { Chat } from '../types';

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface ProjectsPageProps {
  projectFolders: Project[];
  setProjectFolders: React.Dispatch<React.SetStateAction<Project[]>>;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  setCurrentChatId: (id: string | null) => void;
  createNewChat: (projectId?: string | null) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
  onOpenProjectChats?: (project: Project) => void;
}

export function ProjectsPage({
  projectFolders,
  setProjectFolders,
  chats,
  setChats,
  activeProjectId,
  setActiveProjectId,
  setCurrentChatId,
  createNewChat,
  onClose,
  showToast,
  onOpenProjectChats
}: ProjectsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'activity' | 'name'>('activity');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [starredProjectIds, setStarredProjectIds] = useState<string[]>([]);
  const [archivedProjectIds, setArchivedProjectIds] = useState<string[]>([]);
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);
  
  // States for Editing Project
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');

  // Find project details (last active, chat count etc.)
  const getProjectMetadata = (projectId: string) => {
    const projChats = chats.filter(c => c.projectId === projectId);
    if (projChats.length === 0) {
      return {
        chatCount: 0,
        lastUpdatedText: 'Created recently',
        lastUpdatedMs: 0
      };
    }

    // Sort by updatedAt to find youngest
    const sortedChats = [...projChats].sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });

    const lastChat = sortedChats[0];
    const diffMs = Date.now() - new Date(lastChat.updatedAt).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    let updatedText = 'Just now';
    if (diffDays > 0) {
      updatedText = `Updated ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      updatedText = `Updated ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      updatedText = `Updated ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }

    return {
      chatCount: projChats.length,
      lastUpdatedText: updatedText,
      lastUpdatedMs: lastChat.updatedAt ? new Date(lastChat.updatedAt).getTime() : 0
    };
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    // Check duplicate
    if (projectFolders.some(p => p.name.toLowerCase() === newProjectName.trim().toLowerCase())) {
      showToast('A project with this name already exists.');
      return;
    }

    const newProj = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      description: newProjectDescription.trim()
    };

    setProjectFolders(prev => [...prev, newProj]);
    setNewProjectName('');
    setNewProjectDescription('');
    setShowCreateModal(false);
    showToast(`Project "${newProj.name}" created successfully.`);
  };

  const handleSaveEditProject = () => {
    if (!editingProject) return;
    if (!editProjectName.trim()) return;

    // Check duplicate (excluding current project)
    if (projectFolders.some(p => p.id !== editingProject.id && p.name.toLowerCase() === editProjectName.trim().toLowerCase())) {
      showToast('A project with this name already exists.');
      return;
    }

    setProjectFolders(prev => prev.map(p => {
      if (p.id === editingProject.id) {
        return {
          ...p,
          name: editProjectName.trim(),
          description: editProjectDescription.trim()
        };
      }
      return p;
    }));

    setEditingProject(null);
    showToast('Project updated successfully.');
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering project open

    // Find project name
    const project = projectFolders.find(p => p.id === projectId);
    if (!project) return;

    if (confirm(`Are you sure you want to delete the project "${project.name}"? This will not delete the chats associated with it, but they will be unlinked.`)) {
      setProjectFolders(prev => prev.filter(p => p.id !== projectId));
      
      // Keep existing chats but unlink database projectId
      setChats(prev => prev.map(chat => {
        if (chat.projectId === projectId) {
          return { ...chat, projectId: undefined };
        }
        return chat;
      }));

      if (activeProjectId === projectId) {
        setActiveProjectId(null);
      }

      showToast(`Project "${project.name}" deleted.`);
    }
  };

  const handleOpenProject = (projectId: string) => {
    setActiveProjectId(projectId);
    
    // Find chats in this project
    const projChats = chats.filter(c => c.projectId === projectId);
    if (projChats.length > 0) {
      // Open youngest active chat
      const sortedChats = [...projChats].sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
      setCurrentChatId(sortedChats[0].id);
    } else {
      // Create a fresh chat for this project and select it
      createNewChat(projectId);
    }
    
    // Close the projects overlay
    onClose();
  };

  // Filter projects by search query
  const filteredProjects = projectFolders.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      const metaA = getProjectMetadata(a.id);
      const metaB = getProjectMetadata(b.id);
      return metaB.lastUpdatedMs - metaA.lastUpdatedMs;
    }
  });

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar bg-[var(--theme-bg)] flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8 pb-16">
        
        {/* Top Header Segment */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight text-[var(--theme-primary)] select-none">
              Projects
            </h1>
            <p className="text-xs text-[var(--theme-muted)] mt-1 select-none">
              Organize topics and manage isolated workspaces
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[var(--theme-secondary)] text-xs font-medium bg-[var(--theme-surface-alt)]/50 px-2.5 py-1.5 border border-[var(--theme-border)] rounded-lg select-none">
              <span>Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none outline-none font-bold text-[var(--theme-primary)] pl-0.5 cursor-pointer text-xs"
              >
                <option value="activity" className="text-black dark:text-white">Activity</option>
                <option value="name" className="text-black dark:text-white">Name</option>
              </select>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              style={{ backgroundColor: '#ffffff' }}
              className="px-4 py-1.5 text-xs font-semibold text-black hover:bg-gray-100 dark:text-black rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>New project</span>
            </button>
          </div>
        </div>

        {/* Search input bar */}
        <div className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-[var(--theme-surface-alt)]/40 border border-[var(--theme-border)] rounded-xl text-sm outline-none text-[var(--theme-primary)] placeholder:text-[var(--theme-muted)] focus:ring-1 focus:ring-[var(--theme-accent,#3b82f6)] focus:border-[var(--theme-accent,#3b82f6)] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--theme-muted)] hover:text-[var(--theme-primary)] rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dynamic Project Grid list */}
        {sortedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedProjects.map(proj => {
              const meta = getProjectMetadata(proj.id);
              return (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj.id)}
                  className="group relative bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent,#3b82f6)] dark:hover:border-[#3a3a37] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[160px] select-none overflow-visible"
                >
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                          <Folder size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h3 className="text-base font-bold text-[var(--theme-primary)] truncate">
                              {proj.name}
                            </h3>
                            {starredProjectIds.includes(proj.id) && (
                              <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                            )}
                            {archivedProjectIds.includes(proj.id) && (
                              <span className="text-[9px] uppercase px-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/20 font-bold shrink-0 scale-90">Archived</span>
                            )}
                          </div>
                          {proj.description ? (
                            <p className="text-xs text-[var(--theme-secondary)]/80 line-clamp-1 mt-1 font-medium">
                              {proj.description}
                            </p>
                          ) : (
                            <p className="text-xs text-[var(--theme-muted)] italic line-clamp-1 mt-1 select-none">
                              No description provided.
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions Menu Trigger */}
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuProjectId(activeMenuProjectId === proj.id ? null : proj.id);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                          title="Project actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* Dropdown Popover matching image 2 */}
                        {activeMenuProjectId === proj.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-[180]" 
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setActiveMenuProjectId(null);
                              }}
                            />
                            <div 
                              className="absolute right-0 mt-1 w-44 bg-[#2d2d2a] border border-[#3e3e3b] rounded-xl shadow-xl py-1.5 z-[190] text-left text-white"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  if (onOpenProjectChats) {
                                    onOpenProjectChats(proj);
                                  }
                                  setActiveMenuProjectId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-2.5 text-zinc-200 hover:text-white"
                              >
                                <MessageSquare size={14} className="text-zinc-400" />
                                <span>Chats</span>
                              </button>
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  const isStarred = starredProjectIds.includes(proj.id);
                                  if (isStarred) {
                                    setStarredProjectIds(prev => prev.filter(id => id !== proj.id));
                                    showToast('Project unstarred.');
                                  } else {
                                    setStarredProjectIds(prev => [...prev, proj.id]);
                                    showToast('Project starred.');
                                  }
                                  setActiveMenuProjectId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-2.5 text-zinc-200 hover:text-white"
                              >
                                <Star size={14} className={starredProjectIds.includes(proj.id) ? "fill-amber-400 text-amber-400" : ""} />
                                <span>{starredProjectIds.includes(proj.id) ? 'Starred' : 'Star'}</span>
                              </button>

                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setEditingProject(proj);
                                  setEditProjectName(proj.name);
                                  setEditProjectDescription(proj.description || '');
                                  setActiveMenuProjectId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-2.5 text-zinc-200 hover:text-white"
                              >
                                <Pencil size={14} />
                                <span>Edit details</span>
                              </button>

                              <div className="border-b border-[#3e3e3b] my-1" />

                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  const isArchived = archivedProjectIds.includes(proj.id);
                                  if (isArchived) {
                                    setArchivedProjectIds(prev => prev.filter(id => id !== proj.id));
                                    showToast('Project unarchived.');
                                  } else {
                                    setArchivedProjectIds(prev => [...prev, proj.id]);
                                    showToast('Project archived.');
                                  }
                                  setActiveMenuProjectId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-2.5 text-zinc-200 hover:text-white"
                              >
                                <Archive size={14} className={archivedProjectIds.includes(proj.id) ? "text-amber-500 fill-amber-500/25" : ""} />
                                <span>{archivedProjectIds.includes(proj.id) ? 'Archived' : 'Archive'}</span>
                              </button>

                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  handleDeleteProject(proj.id, ev);
                                  setActiveMenuProjectId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold hover:bg-red-500/10 transition-colors flex items-center gap-2.5 text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Chat count Badge details */}
                    <div className="mt-3.5 flex items-center gap-2 text-xs text-[var(--theme-secondary)]">
                      <MessageSquare size={13} className="text-zinc-500 shrink-0" />
                      <span>{meta.chatCount} session{meta.chatCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  {/* Card Footer relative updated text */}
                  <div className="flex items-center justify-between mt-auto border-t border-[var(--theme-border)]/50 pt-3 text-[10px] font-mono text-[var(--theme-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {meta.lastUpdatedText}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--theme-accent,#3b82f6)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <span>Enter workspace</span>
                      <Play size={8} className="fill-current" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[var(--theme-border)] rounded-2xl py-12 px-4 bg-[var(--theme-surface-alt)]/25">
            <FolderPlus size={36} className="text-[var(--theme-muted)] mb-3 animate-bounce" />
            <h3 className="text-sm font-semibold text-[var(--theme-primary)]">
              {searchQuery ? 'No matching projects' : 'No projects created'}
            </h3>
            <p className="text-xs text-[var(--theme-muted)] mt-1 max-w-sm">
              {searchQuery ? 'Try adjusting your search query or clear the filter.' : 'Create a clean sandbox project to organize custom intelligence chats.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold bg-[var(--theme-accent,#3b82f6)] text-white hover:bg-[var(--theme-accent,#3b82f6)]/90 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Create your first project
              </button>
            )}
          </div>
        )}

        {/* Centered Minimal Create Project Dialog Overlay */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150"
              onClick={() => {
                setShowCreateModal(false);
                setNewProjectName('');
                setNewProjectDescription('');
              }}
            />
            <div className="relative w-full max-w-[520px] bg-[#2d2d2a] rounded-3xl p-6 shadow-2xl flex flex-col gap-6 text-white text-left font-sans animate-in fade-in-50 zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold tracking-tight text-white select-none">
                  Create a project
                </span>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  className="p-1.5 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90 block">
                  What are you working on?
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Name your project"
                  className="w-full text-sm bg-[#3d3d3a] rounded-xl px-4 py-3 placeholder-[#6d6d6a] outline-none text-white border-2 border-transparent focus:border-blue-500/80 transition-all font-medium"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject();
                  }}
                />
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90 block">
                  What are you trying to achieve?
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Describe your project, goals, subject, etc..."
                  rows={4}
                  className="w-full text-sm bg-[#3d3d3a] rounded-xl px-4 py-3 placeholder-[#6d6d6a] outline-none text-white border-2 border-transparent focus:border-blue-500/80 transition-all resize-none min-h-[110px]"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#444440] hover:bg-[#50504b] text-white rounded-full transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  style={{ backgroundColor: '#fffdfb' }}
                  className="px-5 py-2.5 text-xs font-semibold text-black hover:bg-zinc-100 rounded-full transition-all cursor-pointer shadow-sm"
                >
                  Create project
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Centered Minimal Edit Project Dialog Overlay */}
        {editingProject && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150"
              onClick={() => setEditingProject(null)}
            />
            <div className="relative w-full max-w-[520px] bg-[#2d2d2a] rounded-3xl p-6 shadow-2xl flex flex-col gap-6 text-white text-left font-sans animate-in fade-in-50 zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold tracking-tight text-white select-none">
                  Edit project details
                </span>
                <button
                  onClick={() => setEditingProject(null)}
                  className="p-1.5 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90 block">
                  What are you working on?
                </label>
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  placeholder="Name your project"
                  className="w-full text-sm bg-[#3d3d3a] rounded-xl px-4 py-3 placeholder-[#6d6d6a] outline-none text-white border-2 border-transparent focus:border-blue-500/80 transition-all font-medium"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEditProject();
                  }}
                />
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90 block">
                  What are you trying to achieve?
                </label>
                <textarea
                  value={editProjectDescription}
                  onChange={(e) => setEditProjectDescription(e.target.value)}
                  placeholder="Describe your project, goals, subject, etc..."
                  rows={4}
                  className="w-full text-sm bg-[#3d3d3a] rounded-xl px-4 py-3 placeholder-[#6d6d6a] outline-none text-white border-2 border-transparent focus:border-blue-500/80 transition-all resize-none min-h-[110px]"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditingProject(null)}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#444440] hover:bg-[#50504b] text-white rounded-full transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditProject}
                  className="px-5 py-2.5 text-xs font-semibold bg-white text-black hover:bg-gray-100 rounded-full transition-all cursor-pointer shadow-sm"
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
