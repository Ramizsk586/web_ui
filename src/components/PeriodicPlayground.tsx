import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Link, Link2, Sparkles, BookOpen, AlertCircle, Info, RefreshCw, Move, HelpCircle, Eye, ArrowRight, Zap, X, Search
} from 'lucide-react';
import { PERIODIC_TABLE, PeriodicElement, CATEGORIES_LABELS } from './ChemistryElementsData';
import { MOLECULES_DIRECTORY } from './ChemistryMoleculesData';
import { motion, AnimatePresence } from 'motion/react';

interface PlacedAtom {
  id: string;
  element: PeriodicElement;
  x: number;
  y: number;
  charge: number;
  valences: number;
}

interface CustomBond {
  id: string;
  fromId: string;
  toId: string;
  type: 1 | 2 | 3; // single, double, triple
}

export const PeriodicPlayground: React.FC = () => {
  const [elementsList] = useState<PeriodicElement[]>(PERIODIC_TABLE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Sandbox state
  const [placedAtoms, setPlacedAtoms] = useState<PlacedAtom[]>([
    // Load default water molecule H2O as a demo starter
    { id: 'o-1', element: PERIODIC_TABLE.find(e => e.symbol === 'O') || PERIODIC_TABLE[7], x: 200, y: 140, charge: 0, valences: 6 },
    { id: 'h-1', element: PERIODIC_TABLE.find(e => e.symbol === 'H') || PERIODIC_TABLE[0], x: 120, y: 220, charge: 0, valences: 1 },
    { id: 'h-2', element: PERIODIC_TABLE.find(e => e.symbol === 'H') || PERIODIC_TABLE[0], x: 280, y: 220, charge: 0, valences: 1 }
  ]);

  const [bonds, setBonds] = useState<CustomBond[]>([
    { id: 'b-1', fromId: 'o-1', toId: 'h-1', type: 1 },
    { id: 'b-2', fromId: 'o-1', toId: 'h-2', type: 1 }
  ]);

  const [selectedAtomId, setSelectedAtomId] = useState<string | null>(null);
  const [bondingSourceId, setBondingSourceId] = useState<string | null>(null);
  const [bondTypeSelection, setBondTypeSelection] = useState<1 | 2 | 3>(1);
  const [draggedAtomId, setDraggedAtomId] = useState<string | null>(null);
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);

  // Manual Bonding selection state
  const [manualFromId, setManualFromId] = useState<string>('');
  const [manualToId, setManualToId] = useState<string>('');
  const [enforceValence, setEnforceValence] = useState<boolean>(true);

  // Chemistry valence rule calculator helper
  const getTypicalValenceLimit = (symbol: string): number => {
    const sym = symbol.toUpperCase();
    if (['H', 'F', 'CL', 'BR', 'I', 'LI', 'NA', 'K'].includes(sym)) return 1;
    if (['O', 'BE', 'MG', 'CA'].includes(sym)) return 2;
    if (['N', 'B', 'AL'].includes(sym)) return 3;
    if (['C', 'SI'].includes(sym)) return 4;
    if (sym === 'P') return 5;
    if (sym === 'S') return 6;
    if (['HE', 'NE', 'AR'].includes(sym)) return 0;
    return 4; // default fallbacks
  };

  const getAtomOccupiedValenceCount = (atomId: string, excludeBondWithId?: string): number => {
    return bonds.reduce((sum, b) => {
      if (excludeBondWithId && (
        (b.fromId === atomId && b.toId === excludeBondWithId) ||
        (b.fromId === excludeBondWithId && b.toId === atomId)
      )) {
        return sum;
      }
      if (b.fromId === atomId || b.toId === atomId) {
        return sum + b.type;
      }
      return sum;
    }, 0);
  };

  // Keep manually selected atoms valid (reset to '' only if they are deleted elements)
  useEffect(() => {
    const fromStillExists = placedAtoms.some(a => a.id === manualFromId);
    const toStillExists = placedAtoms.some(a => a.id === manualToId);

    if (!fromStillExists) {
      setManualFromId('');
    }
    if (!toStillExists) {
      setManualToId('');
    }
  }, [placedAtoms, manualFromId, manualToId]);

  const handleAtomSelectionViaClick = (atomId: string) => {
    if (manualFromId === atomId) {
      // Toggle off A
      setManualFromId(manualToId);
      setManualToId('');
    } else if (manualToId === atomId) {
      // Toggle off B
      setManualToId('');
    } else {
      if (!manualFromId) {
        setManualFromId(atomId);
      } else if (!manualToId) {
        setManualToId(atomId);
      } else {
        // Shift pair selection
        setManualFromId(manualToId);
        setManualToId(atomId);
      }
    }
  };

  const valenceErrorMsg = useMemo(() => {
    if (!manualFromId && !manualToId) {
      return "No atoms selected. Tap two atoms on the canvas above to designate Atom A & Atom B.";
    }
    if (!manualFromId || !manualToId) {
      return "Please select a second atom on the canvas (or dropdown below) to construct a pair.";
    }
    
    const fromAtom = placedAtoms.find(a => a.id === manualFromId);
    const toAtom = placedAtoms.find(a => a.id === manualToId);
    if (!fromAtom || !toAtom) return null;

    const fromLimit = getTypicalValenceLimit(fromAtom.element.symbol);
    const toLimit = getTypicalValenceLimit(toAtom.element.symbol);
    
    // Calculate current links excluding any active bond between these two, so re-typing is correctly evaluated
    const fromCurrent = getAtomOccupiedValenceCount(manualFromId, manualToId);
    const toCurrent = getAtomOccupiedValenceCount(manualToId, manualFromId);

    if (fromCurrent + bondTypeSelection > fromLimit) {
      return `Valence rule overflow: ${fromAtom.element.symbol} cannot exceed ${fromLimit} bonds. Adding a ${bondTypeSelection === 1 ? 'single' : bondTypeSelection === 2 ? 'double' : 'triple'} bond exceeds this capacity (currently ${fromCurrent}).`;
    }
    if (toCurrent + bondTypeSelection > toLimit) {
      return `Valence rule overflow: ${toAtom.element.symbol} cannot exceed ${toLimit} bonds. Adding a ${bondTypeSelection === 1 ? 'single' : bondTypeSelection === 2 ? 'double' : 'triple'} bond exceeds this capacity (currently ${toCurrent}).`;
    }
    return null;
  }, [manualFromId, manualToId, bondTypeSelection, bonds, placedAtoms]);

  const sandboxRef = useRef<HTMLDivElement | null>(null);

  // Filter elements
  const filteredElements = useMemo(() => {
    return elementsList.filter(el => {
      const matchesSearch = el.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            el.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            String(el.number) === searchQuery.trim();
      const matchesCat = selectedCategory === 'all' || el.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [elementsList, searchQuery, selectedCategory]);

  // Handle adding element to sandbox
  const handleAddAtom = (element: PeriodicElement) => {
    const parentWidth = sandboxRef.current?.clientWidth || 400;
    const parentHeight = sandboxRef.current?.clientHeight || 300;
    
    // Position atoms randomly near center
    const rx = 100 + Math.random() * (parentWidth - 200);
    const ry = 80 + Math.random() * (parentHeight - 160);

    const newAtom: PlacedAtom = {
      id: `${element.symbol.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      element,
      x: Math.round(rx),
      y: Math.round(ry),
      charge: 0,
      valences: getTypicalValence(element)
    };

    setPlacedAtoms(prev => [...prev, newAtom]);
  };

  const getTypicalValence = (el: PeriodicElement): number => {
    if (el.group === 1) return 1;
    if (el.group === 2) return 2;
    if (el.group === 13) return 3;
    if (el.group === 14) return 4;
    if (el.group === 15) return 5;
    if (el.group === 16) return 6;
    if (el.group === 17) return 7;
    if (el.group === 18) return 8;
    // Transition metals typical
    return 2;
  };

  // Remove atom
  const handleRemoveAtom = (id: string) => {
    setPlacedAtoms(prev => prev.filter(at => at.id !== id));
    // Remove connected bonds
    setBonds(prev => prev.filter(b => b.fromId !== id && b.toId !== id));
    if (selectedAtomId === id) setSelectedAtomId(null);
    if (bondingSourceId === id) setBondingSourceId(null);
  };

  // Clear workspace
  const handleClearWorkspace = () => {
    setPlacedAtoms([]);
    setBonds([]);
    setSelectedAtomId(null);
    setBondingSourceId(null);
  };

  // Clear workspace and seed with exactly one clean, stable starting atom
  const handleCleanAtomReset = () => {
    const parentWidth = sandboxRef.current?.clientWidth || 500;
    const parentHeight = sandboxRef.current?.clientHeight || 400;
    const carbonElement = PERIODIC_TABLE.find(e => e.symbol === 'C') || PERIODIC_TABLE[5];
    setPlacedAtoms([
      {
        id: `c-starter-${Date.now()}`,
        element: carbonElement,
        x: Math.round(parentWidth / 2 || 250),
        y: Math.round(parentHeight / 2 || 200),
        charge: 0,
        valences: 4
      }
    ]);
    setBonds([]);
    setSelectedAtomId(null);
    setBondingSourceId(null);
    setManualFromId('');
    setManualToId('');
  };

  // Clean unbonded solitary atoms from the workspace
  const handleCleanUnbondedAtoms = () => {
    setPlacedAtoms(prev => prev.filter(at => {
      // Keep atom only block if it has at least one active covalent bond
      return bonds.some(b => b.fromId === at.id || b.toId === at.id);
    }));
    setSelectedAtomId(null);
    setManualFromId('');
    setManualToId('');
  };

  // Load chemical molecule preset from the library catalog onto the workspace canvas
  const handleLoadMolecule = (mol: any) => {
    if (!mol.spawnData) return;
    
    // Find absolute coordinates bounding box in sandboxes
    const parentWidth = sandboxRef.current?.clientWidth || 500;
    const parentHeight = sandboxRef.current?.clientHeight || 400;
    
    // Calculate centroids to shift atoms to center of canvas
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    mol.spawnData.atoms.forEach((at: any) => {
      if (at.x < minX) minX = at.x;
      if (at.x > maxX) maxX = at.x;
      if (at.y < minY) minY = at.y;
      if (at.y > maxY) maxY = at.y;
    });
    
    const molWidth = maxX - minX;
    const molHeight = maxY - minY;
    
    const shiftX = (parentWidth / 2) - (minX + molWidth / 2);
    const shiftY = (parentHeight / 2) - (minY + molHeight / 2);
    
    // Create new atoms with unique IDs to prevent collisions
    const idMap: Record<number, string> = {};
    const newPlacedAtoms = mol.spawnData.atoms.map((at: any, idx: number) => {
      const element = PERIODIC_TABLE.find(e => e.symbol === at.symbol) || PERIODIC_TABLE[0];
      const atomId = `${element.symbol.toLowerCase()}-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
      idMap[idx] = atomId;
      
      return {
        id: atomId,
        element,
        x: Math.round(at.x + shiftX),
        y: Math.round(at.y + shiftY),
        charge: 0,
        valences: getTypicalValence(element)
      };
    });
    
    // Create new bonds matching the unique atom IDs
    const newBonds = mol.spawnData.bonds.map((b: any) => {
      return {
        id: `bond-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        fromId: idMap[b.fromIdx],
        toId: idMap[b.toIdx],
        type: b.type as any
      };
    });
    
    // Replace workspace contents with this beautifully assembled compound
    setPlacedAtoms(newPlacedAtoms);
    setBonds(newBonds);
    
    // Reset selections
    setSelectedAtomId(null);
    setManualFromId('');
    setManualToId('');
  };

  // Preload a molecular compound template shared from other tab (ChemistryLabCanvas molecules tab)
  useEffect(() => {
    const preloadFormula = localStorage.getItem('preload_sandbox_molecule');
    if (preloadFormula) {
      localStorage.removeItem('preload_sandbox_molecule');
      const molFound = MOLECULES_DIRECTORY.find(m => m.formula === preloadFormula);
      if (molFound) {
        const t = setTimeout(() => {
          handleLoadMolecule(molFound);
        }, 150);
        return () => clearTimeout(t);
      }
    }
  }, []);

  // Bond formation helper
  const handleCreateBond = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    if (enforceValence) {
      const fromAtom = placedAtoms.find(a => a.id === fromId);
      const toAtom = placedAtoms.find(a => a.id === toId);
      if (fromAtom && toAtom) {
        const fromLimit = getTypicalValenceLimit(fromAtom.element.symbol);
        const toLimit = getTypicalValenceLimit(toAtom.element.symbol);
        const fromCurrent = getAtomOccupiedValenceCount(fromId, toId);
        const toCurrent = getAtomOccupiedValenceCount(toId, fromId);

        if (fromCurrent + bondTypeSelection > fromLimit || toCurrent + bondTypeSelection > toLimit) {
          setBondingSourceId(null);
          return; // Block creation
        }
      }
    }
    
    // Check if bond already exists, replace it or toggle strength
    const existingIdx = bonds.findIndex(b => 
      (b.fromId === fromId && b.toId === toId) || 
      (b.fromId === toId && b.toId === fromId)
    );

    if (existingIdx > -1) {
      // Toggle Type: 1 -> 2 -> 3 -> delete
      setBonds(prev => {
        const next = [...prev];
        const curType = next[existingIdx].type;
        if (curType === 3) {
          return prev.filter((_, i) => i !== existingIdx);
        } else {
          next[existingIdx] = { ...next[existingIdx], type: (curType + 1) as any };
          return next;
        }
      });
    } else {
      const newBond: CustomBond = {
        id: `bond-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fromId,
        toId,
        type: bondTypeSelection
      };
      setBonds(prev => [...prev, newBond]);
    }
    setBondingSourceId(null);
  };

  // Manual bond control handlers
  const handleFormManualBond = () => {
    if (!manualFromId || !manualToId || manualFromId === manualToId) return;

    if (enforceValence) {
      const fromAtom = placedAtoms.find(a => a.id === manualFromId);
      const toAtom = placedAtoms.find(a => a.id === manualToId);
      if (fromAtom && toAtom) {
        const fromLimit = getTypicalValenceLimit(fromAtom.element.symbol);
        const toLimit = getTypicalValenceLimit(toAtom.element.symbol);
        const fromCurrent = getAtomOccupiedValenceCount(manualFromId, manualToId);
        const toCurrent = getAtomOccupiedValenceCount(manualToId, manualFromId);

        if (fromCurrent + bondTypeSelection > fromLimit || toCurrent + bondTypeSelection > toLimit) {
          return; // Block
        }
      }
    }
    
    // Check if bond already exists, replace with current bondTypeSelection
    const existingIdx = bonds.findIndex(b => 
      (b.fromId === manualFromId && b.toId === manualToId) || 
      (b.fromId === manualToId && b.toId === manualFromId)
    );

    if (existingIdx > -1) {
      setBonds(prev => {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], type: bondTypeSelection };
        return next;
      });
    } else {
      const newBond: CustomBond = {
        id: `bond-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fromId: manualFromId,
        toId: manualToId,
        type: bondTypeSelection
      };
      setBonds(prev => [...prev, newBond]);
    }
  };

  const handleDissolveManualBond = () => {
    if (!manualFromId || !manualToId) return;
    setBonds(prev => prev.filter(b => 
      !((b.fromId === manualFromId && b.toId === manualToId) || 
        (b.fromId === manualToId && b.toId === manualFromId))
    ));
  };

  // Drag operations
  const handleSandboxMouseDown = (e: React.MouseEvent, atomId: string) => {
    e.stopPropagation();
    setDraggedAtomId(atomId);
  };

  const handleSandboxMouseMove = (e: React.MouseEvent) => {
    if (!draggedAtomId || !sandboxRef.current) return;
    
    const rect = sandboxRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPlacedAtoms(prev => prev.map(at => {
      if (at.id === draggedAtomId) {
        return {
          ...at,
          x: Math.max(15, Math.min(rect.width - 15, Math.round(x))),
          y: Math.max(15, Math.min(rect.height - 15, Math.round(y)))
        };
      }
      return at;
    }));
  };

  const handleSandboxMouseUp = () => {
    setDraggedAtomId(null);
  };

  // Chemistry math composition solvers
  const composition = useMemo(() => {
    if (placedAtoms.length === 0) return { formula: 'Empty', weight: 0, recognizedName: null, advice: '' };

    // Group items by symbol
    const counts: Record<string, number> = {};
    let totalWeight = 0;

    placedAtoms.forEach(at => {
      counts[at.element.symbol] = (counts[at.element.symbol] || 0) + 1;
      totalWeight += at.element.weight;
    });

    // Hill System Notation Sorting Rule (C, then H, then alphabetically)
    const elementsListOrder = Object.keys(counts);
    const sortedSymbols = elementsListOrder.sort((a, b) => {
      if (a === 'C') return -1;
      if (b === 'C') return 1;
      if (a === 'H' && b !== 'C') return -1;
      if (b === 'H' && a !== 'C') return 1;
      return a.localeCompare(b);
    });

    let formulaStr = '';
    sortedSymbols.forEach(sym => {
      const c = counts[sym];
      formulaStr += `${sym}${c > 1 ? c : ''}`;
    });

    // Check with direct recognizable compounds list
    let recognizedName = null;
    let advice = 'Custom chemical cluster compound configured. Select two atom spheres to link covalent valence configurations.';
    
    const lowercaseFormula = formulaStr.toLowerCase();

    const KNOWN_FORMULAS: Record<string, { name: string; desc: string }> = {
      'h2o': { name: 'Water (H₂O)', desc: 'Standard bent molecular geometry. Crucial solvent sustaining all terrestrial life forms, structured via strong electronegative oxygen hydrogen-bonding frameworks.' },
      'co2': { name: 'Carbon Dioxide (CO₂)', desc: 'Linear double-bonded covalent structure (O=C=O). Essential atmospheric gas of industrial, biological, and climatic prominence.' },
      'co': { name: 'Carbon Monoxide (CO)', desc: 'Linear triple-bonded highly coordinate toxic gas. Binds preferentially to physiological hemoglobin over standard oxygen.' },
      'nh3': { name: 'Ammonia (NH₃)', desc: 'Trigonal pyramidal covalent compound (sp³ hybridized). Found widely in nitrogenous fertilizers and chemical synthesis.' },
      'ch4': { name: 'Methane (CH₄)', desc: 'Symmetrical tetrahedral organic molecule (sp³). Simplest hydrocarbon and a major high-potency greenhouse gas.' },
      'o2': { name: 'Oxygen Molecule (O₂)', desc: 'Symmetrical diatomic gas. Paramagnetic double bond state sustaining active mitochondrial cellular respiration.' },
      'h2': { name: 'Hydrogen Molecule (H₂)', desc: 'Lightest diatomic molecule. Clean alternative energy/fuel source possessing exceptionally high thermodynamic energy-density.' },
      'n2': { name: 'Nitrogen Molecule (N₂)', desc: 'Super stable triple covalent diatomic atmospheric buffer. Standard triple bond requires massive energy fixation parameters to crack.' },
      'hcl': { name: 'Hydrochloric Acid (HCl)', desc: 'Polar covalent strong mineral acid hydronium donor. Forms highly caustic solutions utilized in standard metal cleaning actions.' },
      'nacl': { name: 'Sodium Chloride (NaCl)', desc: 'Highly polar cubic crystalline ionic salt lattice. Fundamental electrolyte of cellular action-potential biology.' },
      'c2h5oh': { name: 'Ethanol (C₂H₅OH / Alcohol)', desc: 'Saturated organic aliphatic primary alcohol compound. Leveraged widely in solvent buffers, fuel additives, and clinical sanitation.' },
      'ch3oh': { name: 'Methanol (CH₃OH)', desc: 'Simplest toxic organic alcohol compound. Metabolizes to poisonous formaldehyde inside liver tissue limits.' },
      'ch3cooh': { name: 'Acetic Acid (CH₃COOH)', desc: 'Weak carboxlyic acid vinegar buffer. Employs classic oxygen-resonance delocalization within its acetate state.' },
      'o3': { name: 'Ozone (O₃)', desc: 'Highly reactive bent resonance trioxygen molecule (bond order 1.5). Shields surface life from solar UV radiation fields.' }
    };

    if (KNOWN_FORMULAS[lowercaseFormula]) {
      recognizedName = KNOWN_FORMULAS[lowercaseFormula].name;
      advice = KNOWN_FORMULAS[lowercaseFormula].desc;
    } else {
      // Dynamic advice helper based on constituent groups
      const hasNoble = placedAtoms.some(a => a.element.category === 'noble-gas');
      const hasMetal = placedAtoms.some(a => ['alkali', 'alkaline-earth', 'transition-metal'].includes(a.element.category));
      const hasNonmetal = placedAtoms.some(a => a.element.category === 'reactive-nonmetal');

      if (hasNoble) {
        advice = 'Contains a Noble Gas. Noble gases generally possess extremely stable, fully satisfied closed outer shell electron configurations and rarely form bonds.';
      } else if (hasMetal && hasNonmetal) {
        advice = 'Ionic Metallorganic Compound predicted. The large electronegativity difference suggests electrostatic ionic lattice bond transfers instead of classic shared covalency.';
      } else if (hasMetal) {
        advice = 'Metallic Cluster structure. High d-orbital overlaps form highly conductive, malleable delocalized coordinate electron clouds.';
      } else if (hasNonmetal) {
        advice = 'Covalent Nonmetal Molecular Assembly. Atoms will comfortably share valence electrons to achieve stable octet neon/argon noble state configurations.';
      }
    }

    let isFullySatisfied = true;
    let unsatisfiedCount = 0;

    placedAtoms.forEach(at => {
      const limit = getTypicalValenceLimit(at.element.symbol);
      const occupied = getAtomOccupiedValenceCount(at.id);
      if (occupied !== limit) {
        isFullySatisfied = false;
        unsatisfiedCount++;
      }
    });

    const isStable = isFullySatisfied && placedAtoms.length > 0 && bonds.length > 0;

    return {
      formula: formulaStr,
      weight: Number(totalWeight.toFixed(4)),
      recognizedName,
      advice,
      isStable,
      unsatisfiedCount
    };
  }, [placedAtoms, bonds]);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full w-full min-h-0 text-[var(--theme-primary)]">
      
      {/* 118-Element Grid and Search Dashboard */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[var(--theme-border)] p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar shrink-0 bg-[var(--theme-surface)]">
        
        <div className="border-b border-[var(--theme-border)]/50 pb-2">
          <div className="flex items-center gap-1.5 mb-1 text-emerald-500 font-bold">
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider">Atom Spawn Hub</span>
          </div>
          <h4 className="text-sm font-extrabold text-zinc-950 dark:text-white">118-Element Builder</h4>
          <p className="text-[10.5px] leading-relaxed text-[var(--theme-secondary)] mt-1">
            Browse the active periodic table array below. Select any element to add its customized atom structure to the workspace grid.
          </p>
        </div>

        {/* Filters and Inputs */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search symbol, group or name (e.g. Au, H, 8)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs p-2.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 placeholder-[var(--theme-secondary)]"
          />

          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-1 text-[9.5px] font-bold rounded-lg transition-all ${
                selectedCategory === 'all'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[var(--theme-surface-alt)] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] border border-[var(--theme-border)]'
              }`}
            >
              All Series
            </button>
            {Object.keys(CATEGORIES_LABELS).map(catKey => (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-2 py-1 text-[9.5px] font-bold rounded-lg transition-all ${
                  selectedCategory === catKey
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[var(--theme-surface-alt)] text-[var(--theme-secondary)] hover:bg-[var(--theme-hover-bg)] border border-[var(--theme-border)]'
                }`}
              >
                {CATEGORIES_LABELS[catKey]}
              </button>
            ))}
          </div>
        </div>

        {/* Fast grid display elements */}
        <div className="flex-1 pr-1 space-y-1.5 overflow-y-auto custom-scrollbar max-h-[460px] md:max-h-none min-h-0">
          <div className="grid grid-cols-4 gap-1.5">
            {filteredElements.map(el => (
              <button
                key={el.number}
                onClick={() => handleAddAtom(el)}
                className="p-2 bg-[var(--theme-surface-alt)] hover:bg-[var(--theme-hover-bg)] hover:scale-105 active:scale-95 border border-[var(--theme-border)] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative group text-center"
                title={`${el.name} - Atomic Weight: ${el.weight}`}
              >
                <span className="text-[8px] font-mono absolute top-1 left-1 text-[var(--theme-secondary)]">
                  {el.number}
                </span>
                <span className="text-[13px] font-extrabold uppercase mt-1 tracking-tight" style={{ color: el.color }}>
                  {el.symbol}
                </span>
                <span className="text-[8.5px] text-[var(--theme-secondary)] truncate w-full px-0.5">
                  {el.name}
                </span>
                <span className="text-[7.5px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5 font-bold">
                  {el.weight.toFixed(1)}
                </span>
              </button>
            ))}
          </div>

          {filteredElements.length === 0 && (
            <div className="p-8 text-center border border-dashed border-[var(--theme-border)] rounded-2xl text-[var(--theme-secondary)] text-xs">
              No elements matched your filter parameters. Try another name.
            </div>
          )}
        </div>

        <button
          onClick={() => setShowPeriodicTable(!showPeriodicTable)}
          className="w-full py-2 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] hover:bg-[var(--theme-hover-bg)] text-xs font-bold text-[var(--theme-primary)] flex items-center justify-center gap-1.5 rounded-xl cursor-pointer transition-all shrink-0 mt-2"
        >
          <HelpCircle size={14} className="text-emerald-500" />
          <span>{showPeriodicTable ? 'Close Traditional Table Grid' : 'View Full Periodic Table Grid'}</span>
        </button>

      </div>

      {/* Traditional Periodic Table Full Grid Overlay */}
      <AnimatePresence>
        {showPeriodicTable && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed inset-4 md:inset-10 bg-[var(--theme-surface)]/98 backdrop-blur-md border border-[var(--theme-border)] rounded-3xl p-6 shadow-2xl z-50 flex flex-col space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
                  <BookOpen size={16} className="text-emerald-500" />
                  <span>Standard 18-Column Periodic Table of Elements</span>
                </h4>
                <p className="text-xs text-[var(--theme-secondary)] mt-0.5">
                  Click any element card directly below to construct its atomic structure in your current playground builder.
                </p>
              </div>
              <button
                onClick={() => setShowPeriodicTable(false)}
                className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Periodic grid mapping */}
            <div className="flex-1 overflow-auto custom-scrollbar flex items-center justify-center p-2 min-h-0">
              <div className="grid grid-cols-18 gap-1 min-w-[960px] select-none">
                {Array.from({ length: 7 }).map((_, rIdx) => {
                  const period = rIdx + 1;
                  return Array.from({ length: 18 }).map((_, colIdx) => {
                    const group = colIdx + 1;
                    // Find matching elements
                    const matched = PERIODIC_TABLE.find(e => e.period === period && e.group === group);

                    if (!matched) {
                      // Exceptions for lanthanides / actinides gap inside standard periods
                      if (period === 6 && group === 3) {
                        return (
                          <div key={`gap-6-3`} className="border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-alt)]/30 rounded-lg flex items-center justify-center flex-col text-[8px] font-bold text-pink-500 font-mono">
                            <span>57-71</span>
                            <span>La-Lu</span>
                          </div>
                        );
                      }
                      if (period === 7 && group === 3) {
                        return (
                          <div key={`gap-7-3`} className="border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-alt)]/30 rounded-lg flex items-center justify-center flex-col text-[8px] font-bold text-rose-500 font-mono">
                            <span>89-103</span>
                            <span>Ac-Lr</span>
                          </div>
                        );
                      }
                      return <div key={`empty-${rIdx}-${colIdx}`} className="aspect-square bg-transparent" />;
                    }

                    return (
                      <button
                        key={matched.number}
                        onClick={() => {
                          handleAddAtom(matched);
                          setShowPeriodicTable(false);
                        }}
                        className="p-1.5 aspect-square bg-[var(--theme-surface-alt)] hover:scale-110 active:scale-95 border border-[var(--theme-border)] rounded-xl flex flex-col justify-between transition-all text-left cursor-pointer group hover:shadow-md"
                        style={{ borderLeftWidth: '3.5px', borderLeftColor: matched.color }}
                      >
                        <span className="text-[8px] font-mono leading-none text-zinc-400 group-hover:text-[var(--theme-primary)]">
                          {matched.number}
                        </span>
                        <span className="text-xs font-black text-zinc-800 dark:text-zinc-100 group-hover:scale-105 transition-transform" style={{ color: matched.color }}>
                          {matched.symbol}
                        </span>
                        <span className="text-[7.5px] font-mono truncate leading-none text-[var(--theme-secondary)]">
                          {matched.name}
                        </span>
                      </button>
                    );
                  });
                })}

                {/* Separation rows for Lanthanides and Actinides */}
                <div className="col-span-18 h-3" />
                
                {/* Lanthanide row */}
                <div className="col-span-2 flex items-center justify-end pr-2 text-[9px] font-bold text-pink-500 font-mono">Lanthanides:</div>
                {PERIODIC_TABLE.filter(e => e.category === 'lanthanide').map(el => (
                  <button
                    key={el.number}
                    onClick={() => {
                      handleAddAtom(el);
                      setShowPeriodicTable(false);
                    }}
                    className="p-1.5 aspect-square bg-[var(--theme-surface-alt)] hover:scale-110 border border-[var(--theme-border)] rounded-xl flex flex-col justify-between transition-all cursor-pointer group"
                    style={{ borderLeftWidth: '3.5px', borderLeftColor: el.color }}
                  >
                    <span className="text-[7px] font-mono text-zinc-400 leading-none">{el.number}</span>
                    <span className="text-xs font-black text-pink-500">{el.symbol}</span>
                    <span className="text-[7.5px] truncate leading-none text-[var(--theme-secondary)]">{el.name}</span>
                  </button>
                ))}
                <div className="col-span-1" />

                {/* Actinide row */}
                <div className="col-span-2 flex items-center justify-end pr-2 text-[9px] font-bold text-rose-500 font-mono">Actinides:</div>
                {PERIODIC_TABLE.filter(e => e.category === 'actinide').map(el => (
                  <button
                    key={el.number}
                    onClick={() => {
                      handleAddAtom(el);
                      setShowPeriodicTable(false);
                    }}
                    className="p-1.5 aspect-square bg-[var(--theme-surface-alt)] hover:scale-110 border border-[var(--theme-border)] rounded-xl flex flex-col justify-between transition-all cursor-pointer group"
                    style={{ borderLeftWidth: '3.5px', borderLeftColor: el.color }}
                  >
                    <span className="text-[7px] font-mono text-zinc-400 leading-none">{el.number}</span>
                    <span className="text-xs font-black text-rose-500">{el.symbol}</span>
                    <span className="text-[7.5px] truncate leading-none text-[var(--theme-secondary)]">{el.name}</span>
                  </button>
                ))}
                <div className="col-span-1" />
              </div>
            </div>

            {/* Colors map footer definitions */}
            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2 border-t border-[var(--theme-border)]/50 pt-4 text-[9px] font-bold">
              {Object.keys(CATEGORIES_LABELS).map(catKey => {
                const matchedEl = PERIODIC_TABLE.find(e => e.category === catKey);
                return (
                  <div key={catKey} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: matchedEl?.color || '#a1a1aa' }} />
                    <span className="text-[var(--theme-secondary)] truncate">{CATEGORIES_LABELS[catKey]}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. CENTER COORDINATE BUILDER CANVAS */}
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--theme-surface-alt)] relative">
        
        {/* Workspace tool controls bar */}
        <div className="px-4 py-2.5 bg-[var(--theme-surface)] border-b border-[var(--theme-border)] flex flex-wrap items-center justify-between gap-2 z-10">
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-secondary)] font-mono">Bond Type:</span>
            <div className="flex items-center border border-[var(--theme-border)] rounded-lg overflow-hidden bg-[var(--theme-surface-alt)] h-8">
              <button
                type="button"
                onClick={() => setBondTypeSelection(1)}
                className={`px-3 text-xs font-bold transition-all h-full cursor-pointer flex items-center gap-1 ${
                  bondTypeSelection === 1 ? 'bg-emerald-500 text-white' : 'hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'
                }`}
              >
                <Link size={10} />
                <span>Single</span>
              </button>
              <button
                type="button"
                onClick={() => setBondTypeSelection(2)}
                className={`px-3 text-xs font-bold transition-all h-full border-l border-r border-[var(--theme-border)] cursor-pointer flex items-center gap-1 ${
                  bondTypeSelection === 2 ? 'bg-emerald-555 text-white' : 'hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'
                }`}
              >
                <Link2 size={10} />
                <span>Double</span>
              </button>
              <button
                type="button"
                onClick={() => setBondTypeSelection(3)}
                className={`px-3 text-xs font-bold transition-all h-full cursor-pointer flex items-center gap-1 ${
                  bondTypeSelection === 3 ? 'bg-indigo-650 text-white' : 'hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'
                }`}
              >
                <Link2 size={10} className="stroke-[3px]" />
                <span>Triple</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-sans ml-auto">
            {bondingSourceId && (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md font-bold animate-pulse">
                Click target atom to complete link connection!
              </span>
            )}
            {(selectedAtomId || manualFromId || manualToId) && (
              <button
                onClick={() => {
                  const targetId = selectedAtomId || manualFromId || manualToId;
                  if (targetId) {
                    handleRemoveAtom(targetId);
                  }
                }}
                className="h-8 px-3 text-xs bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Remove the selected atom from the sandbox"
              >
                <Trash2 size={13} />
                <span>Remove Selected ({placedAtoms.find(a => a.id === (selectedAtomId || manualFromId || manualToId))?.element.symbol})</span>
              </button>
            )}
            <button
              onClick={handleCleanUnbondedAtoms}
              className="h-8 px-3 text-xs bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] text-emerald-500 hover:bg-[var(--theme-hover-bg)] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Clean isolated atoms that have 0 bond connections"
            >
              <RefreshCw size={12} className="text-emerald-500" />
              <span>Clean Unbonded</span>
            </button>
            <button
              onClick={handleCleanAtomReset}
              className="h-8 px-3 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Reset the canvas and seed with a single Carbon starting atom"
            >
              <Plus size={13} />
              <span>Clean Starter Atom</span>
            </button>
            <button
              onClick={handleClearWorkspace}
              className="h-8 px-3 text-xs bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-red-500 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Clear Board</span>
            </button>
          </div>
        </div>

        {/* Dynamic Interactive SVG and Coordinate Atoms Sandbox Viewport */}
        <div 
          ref={sandboxRef}
          onMouseMove={handleSandboxMouseMove}
          onMouseUp={handleSandboxMouseUp}
          onMouseLeave={handleSandboxMouseUp}
          onClick={() => {
            setSelectedAtomId(null);
            setManualFromId('');
            setManualToId('');
          }}
          className="flex-1 relative cursor-default select-none overflow-hidden bg-dot-pattern bg-zinc-500/[0.03] dark:bg-zinc-400/[0.03]"
          style={{ minHeight: '340px' }}
        >
          {placedAtoms.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-[var(--theme-secondary)] space-y-2 pointer-events-none">
              <Move size={36} className="text-[var(--theme-border)] animate-bounce" />
              <p className="font-bold text-xs select-none">Laboratory Canvas Sandbox empty.</p>
              <p className="text-[10.5px] max-w-xs leading-relaxed">
                Tap element symbols in the sidebar to spawn atoms, drag them anywhere, and connect them together to explore molecular formulas!
              </p>
            </div>
          )}

          {/* SVG Connection Lines overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {bonds.map(bn => {
              const fromAtom = placedAtoms.find(a => a.id === bn.fromId);
              const toAtom = placedAtoms.find(a => a.id === bn.toId);
              if (!fromAtom || !toAtom) return null;

              const dx = toAtom.x - fromAtom.x;
              const dy = toAtom.y - fromAtom.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance === 0) return null;

              // Normalized offsets
              const ox = (dx / distance) * 20;
              const oy = (dy / distance) * 20;

              const x1 = fromAtom.x + ox;
              const y1 = fromAtom.y + oy;
              const x2 = toAtom.x - ox;
              const y2 = toAtom.y - oy;

              // Angle for multi-bond drawing offsets
              const angle = Math.atan2(dy, dx);
              const px = Math.sin(angle) * 4;
              const py = -Math.cos(angle) * 4;

              if (bn.type === 2) {
                // Double bond (2 collateral lines)
                return (
                  <g key={bn.id}>
                    <line x1={x1 + px} y1={y1 + py} x2={x2 + px} y2={y2 + py} stroke="#34d399" strokeWidth="2.5" />
                    <line x1={x1 - px} y1={y1 - py} x2={x2 - px} y2={y2 - py} stroke="#34d399" strokeWidth="2.5" />
                  </g>
                );
              }

              if (bn.type === 3) {
                // Triple bond (3 collateral lines)
                return (
                  <g key={bn.id}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6366f1" strokeWidth="2" />
                    <line x1={x1 + px * 1.5} y1={y1 + py * 1.5} x2={x2 + px * 1.5} y2={y2 + py * 1.5} stroke="#6366f1" strokeWidth="2" />
                    <line x1={x1 - px * 1.5} y1={y1 - py * 1.5} x2={x2 - px * 1.5} y2={y2 - py * 1.5} stroke="#6366f1" strokeWidth="2" />
                  </g>
                );
              }

              // Default standard single bond
              return (
                <line
                  key={bn.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--theme-border)"
                  strokeWidth="3"
                  className="stroke-[var(--theme-secondary)] opacity-40"
                />
              );
            })}
          </svg>

          {/* Interactive Atomic Nodes Render */}
          {placedAtoms.map(at => {
            const isSelected = selectedAtomId === at.id;
            const isBondingSrc = bondingSourceId === at.id;
            const isCandidate = bondingSourceId !== null && bondingSourceId !== at.id;
            const isAtomA = manualFromId === at.id;
            const isAtomB = manualToId === at.id;

            return (
              <div
                key={at.id}
                onMouseDown={(e) => handleSandboxMouseDown(e, at.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAtomSelectionViaClick(at.id);
                  if (bondingSourceId && bondingSourceId !== at.id) {
                    handleCreateBond(bondingSourceId, at.id);
                  } else {
                    setSelectedAtomId(isSelected ? null : at.id);
                  }
                }}
                className={`absolute w-12 h-12 rounded-full cursor-grab active:cursor-grabbing flex flex-col items-center justify-center text-zinc-950 dark:text-white transition-all select-none group border-2 z-10 ${
                  isAtomA 
                    ? 'ring-4 ring-sky-500 ring-offset-2 border-sky-400 font-extrabold scale-110 shadow-lg'
                    : isAtomB
                      ? 'ring-4 ring-amber-500 ring-offset-2 border-amber-400 font-extrabold scale-110 shadow-lg'
                      : isBondingSrc 
                        ? 'ring-4 ring-emerald-500 border-zinc-950 animate-pulse'
                        : isSelected
                          ? 'border-zinc-950 shadow-lg scale-110 ring-2 ring-emerald-500/30'
                          : isCandidate
                            ? 'ring-4 ring-emerald-400 ring-offset-2 border-emerald-500 animate-[pulse_1.5s_infinite]'
                            : 'border-white/80 dark:border-zinc-900 shadow-sm hover:scale-105'
                }`}
                style={{
                  left: at.x - 24,
                  top: at.y - 24,
                  backgroundColor: at.element.color,
                  boxShadow: `0 3px 8px -1px rgba(0, 0, 0, 0.15), 0 0 10px -2px ${at.element.color}a0`
                }}
                title={isCandidate ? "Click to connect bond" : `${at.element.name} (${at.element.symbol}) - ${isAtomA ? 'Selected Atom A' : isAtomB ? 'Selected Atom B' : 'Click to select for Manual Bonding'}`}
              >
                {/* Visual A/B Indicator Badges for manual connection */}
                {isAtomA && (
                  <div className="absolute -top-3.5 -left-1.5 bg-sky-500 text-white font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow animate-bounce">
                    A
                  </div>
                )}
                {isAtomB && (
                  <div className="absolute -top-3.5 -right-1.5 bg-amber-500 text-white font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow animate-bounce">
                    B
                  </div>
                )}

                <span className="text-[8px] font-mono leading-none opacity-85 pointer-events-none mt-0.5">
                  {at.element.number}
                </span>
                <span className="text-sm font-black tracking-tight leading-none uppercase pointer-events-none drop-shadow-md">
                  {at.element.symbol}
                </span>
                <span className="text-[7.5px] font-mono leading-none tracking-tighter opacity-90 mt-0.5 select-none pointer-events-none text-zinc-950/80 dark:text-white/80 font-bold">
                  {getAtomOccupiedValenceCount(at.id)}/{getTypicalValenceLimit(at.element.symbol)}
                </span>

                {/* Helper connecting label for clear manual bonding direction */}
                {isCandidate && (
                  <div className="absolute -bottom-6 bg-emerald-500 text-white font-extrabold text-[8px] font-mono px-1 rounded shadow-sm scale-95 pointer-events-none whitespace-nowrap">
                    LINK TO {placedAtoms.find(a => a.id === bondingSourceId)?.element.symbol}
                  </div>
                )}

                {/* Micro corner buttons */}
                <div className={`absolute -top-1.5 -right-1.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-20`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAtom(at.id);
                    }}
                    className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all cursor-pointer shadow-md"
                  >
                    <Trash2 size={8} />
                  </button>
                </div>

                <div className={`absolute -bottom-1.5 -left-1.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-20`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBondingSourceId(isBondingSrc ? null : at.id);
                    }}
                    className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all cursor-pointer shadow-md"
                    title="Form orbital bond link"
                  >
                    <Link size={8} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM DYNAMIC ANALYSIS HUD CARD (Real-time composition outputs) */}
        <div className="p-4 border-t border-[var(--theme-border)] bg-[var(--theme-surface)] space-y-3.5 z-10">
          
          <div className="p-3.5 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl select-text text-left">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs rounded-lg border border-emerald-500/10">
                  Hill Formula: {composition.formula}
                </span>
                
                <span className="px-2.5 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-mono font-bold text-xs rounded-lg border border-orange-500/10">
                  Molar Mass: {composition.weight} g/mol
                </span>

                {placedAtoms.length > 0 && (
                  composition.isStable ? (
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-sans font-bold text-xs rounded-lg border border-emerald-500/15 flex items-center gap-1">
                      <span>✓ Stable Molecule</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-sans font-bold text-xs rounded-lg border border-amber-500/15 flex items-center gap-1">
                      <span>⚠ Unsaturated Radical</span>
                      <span className="text-[10px] font-mono font-normal opacity-80">({composition.unsatisfiedCount} active)</span>
                    </span>
                  )
                )}
              </div>

              {composition.recognizedName && (
                <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-sans font-bold text-[10.5px] rounded-full flex items-center gap-1 leading-none shadow-sm animate-pulse shrink-0">
                  <Zap size={10} className="fill-purple-500 text-purple-600" />
                  Recognized: {composition.recognizedName}
                </span>
              )}
            </div>

            <div className="h-[1px] bg-zinc-200/40 dark:bg-white/5 my-2" />

            <div className="text-[11.5px] leading-relaxed text-[var(--theme-secondary)] flex items-start gap-1.5">
              <Info size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <p>
                <strong>Compound Behavior:</strong> {composition.advice}
              </p>
            </div>
          </div>

          {/* Quick Manual Bonding HUD Form */}
          {placedAtoms.length >= 2 && (
            <div className="p-4 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-2xl flex flex-col gap-3.5 select-text">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-extrabold text-xs">
                  <Link size={14} className="text-emerald-500" />
                  <span>Interactive Manual Bonding:</span>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    (Click two atoms directly on the canvas, or choose below)
                  </span>
                </div>

                {/* Validation Octet Rules Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-[var(--theme-secondary)] select-none">
                  <input
                    type="checkbox"
                    checked={enforceValence}
                    onChange={(e) => setEnforceValence(e.target.checked)}
                    className="accent-emerald-500 rounded cursor-pointer w-3.5 h-3.5"
                  />
                  <span>Enforce Chemistry Valency Rules</span>
                </label>
              </div>
              
              <div className="flex flex-wrap items-center gap-3.5">
                {/* Atom 1 Selection (Atom A) */}
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <span className="text-[10px] font-mono uppercase font-extrabold text-sky-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
                    Atom A (Source)
                  </span>
                  <select
                    value={manualFromId}
                    onChange={(e) => setManualFromId(e.target.value)}
                    className="p-1 px-2.5 bg-[var(--theme-surface)] border-2 border-sky-500/40 dark:border-sky-500/25 text-xs font-bold rounded-lg outline-none focus:ring-1 focus:ring-sky-500 text-[var(--theme-primary)] h-8 cursor-pointer"
                  >
                    <option value="">-- Click Canvas or Choose --</option>
                    {placedAtoms.map((at, idx) => (
                      <option key={at.id} value={at.id}>
                        Atom A: #{idx + 1}. {at.element.symbol} (at Position {at.x}, {at.y})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-[var(--theme-secondary)] text-md font-mono self-end pb-1.5 shrink-0">✦</div>

                {/* Atom 2 Selection (Atom B) */}
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <span className="text-[10px] font-mono uppercase font-extrabold text-amber-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    Atom B (Target)
                  </span>
                  <select
                    value={manualToId}
                    onChange={(e) => setManualToId(e.target.value)}
                    className="p-1 px-2.5 bg-[var(--theme-surface)] border-2 border-amber-500/40 dark:border-amber-500/25 text-xs font-bold rounded-lg outline-none focus:ring-1 focus:ring-amber-500 text-[var(--theme-primary)] h-8 cursor-pointer"
                  >
                    <option value="">-- Click Canvas or Choose --</option>
                    {placedAtoms
                      .filter(at => at.id !== manualFromId)
                      .map((at, idx) => {
                        const originalIdx = placedAtoms.findIndex(allAt => allAt.id === at.id);
                        return (
                          <option key={at.id} value={at.id}>
                            Atom B: #{originalIdx + 1}. {at.element.symbol} (at Position {at.x}, {at.y})
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* Bond Level Toggle inside the manual Console */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--theme-secondary)]">
                    Covalent Multiplicity
                  </span>
                  <div className="flex items-center border border-[var(--theme-border)] rounded-lg overflow-hidden bg-[var(--theme-surface)] h-8">
                    <button
                      type="button"
                      onClick={() => setBondTypeSelection(1)}
                      className={`px-3 text-xs font-bold transition-all h-full cursor-pointer flex items-center gap-1 ${
                        bondTypeSelection === 1 ? 'bg-sky-500 text-white font-black shadow-sm' : 'hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'
                      }`}
                    >
                      <span>Single</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBondTypeSelection(2)}
                      className={`px-3 text-xs font-bold transition-all h-full border-l border-r border-[var(--theme-border)] cursor-pointer flex items-center gap-2 ${
                        bondTypeSelection === 2 ? 'bg-sky-500 text-white font-black shadow-sm' : 'hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'
                      }`}
                    >
                      <span>Double</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBondTypeSelection(3)}
                      className={`px-3 text-xs font-bold transition-all h-full cursor-pointer flex items-center gap-1 ${
                        bondTypeSelection === 3 ? 'bg-indigo-600 text-white font-black shadow-sm' : 'hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)]'
                      }`}
                    >
                      <span>Triple</span>
                    </button>
                  </div>
                </div>

                {/* Action controls */}
                <div className="flex items-center gap-2 ml-auto self-end h-8">
                  <button
                    type="button"
                    onClick={handleFormManualBond}
                    disabled={enforceValence && valenceErrorMsg !== null}
                    className={`h-8 px-3 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-xs active:scale-95 ${
                      enforceValence && valenceErrorMsg !== null
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-55'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white font-black'
                    }`}
                    title={valenceErrorMsg || "Form manual bond link"}
                  >
                    <Plus size={13} />
                    <span>Create Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDissolveManualBond}
                    className="h-8 px-3 text-xs bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-red-500/10 active:scale-95"
                    title="Dissolve existing link between selected elements"
                  >
                    <Trash2 size={13} />
                    <span>Dissolve</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Warning Alert banner */}
              {valenceErrorMsg && (
                <div className="p-2.5 bg-red-500/5 dark:bg-red-950/10 border border-red-500/15 rounded-xl text-xs text-red-500 dark:text-red-400 font-medium flex items-start gap-2">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <p className="flex-1">{valenceErrorMsg}</p>
                  {!enforceValence && (
                    <span className="text-[10px] uppercase font-bold tracking-wide text-amber-500 shrink-0 font-mono font-bold">
                      [Bypassed]
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Bonds Table */}
          {bonds.length > 0 && (
            <div className="pt-2 border-t border-[var(--theme-border)]/40 flex flex-wrap gap-1.5 items-center select-none text-left">
              <span className="text-[9.5px] uppercase font-bold tracking-wider text-[var(--theme-secondary)] font-mono mr-1">Active Links:</span>
              <div className="flex flex-wrap gap-1.5">
                {bonds.map((bn) => {
                  const fromAtom = placedAtoms.find(a => a.id === bn.fromId);
                  const toAtom = placedAtoms.find(a => a.id === bn.toId);
                  if (!fromAtom || !toAtom) return null;
                  
                  return (
                    <div 
                      key={bn.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-md text-[10px]"
                    >
                      <span className="font-bold font-mono" style={{ color: fromAtom.element.color }}>{fromAtom.element.symbol}</span>
                      <span className="text-[var(--theme-secondary)]">
                        {bn.type === 1 ? '—' : bn.type === 2 ? '═' : '≡'}
                      </span>
                      <span className="font-bold font-mono" style={{ color: toAtom.element.color }}>{toAtom.element.symbol}</span>
                      <button
                        type="button"
                        onClick={() => setBonds(prev => prev.filter(b => b.id !== bn.id))}
                        className="p-0.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded transition-colors ml-1 cursor-pointer"
                        title="Delete bond"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 select-none">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-secondary)] font-mono">
              Sandbox active. Added atoms: <strong className="text-[var(--theme-primary)]">{placedAtoms.length}</strong> | Total bonds: <strong className="text-[var(--theme-primary)]">{bonds.length}</strong>
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};